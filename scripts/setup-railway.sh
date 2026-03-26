#!/bin/bash
# ============================================================
# ApexAI Railway Infrastructure Setup Script
# Run this once after deploying to verify all connections
# and ensure all DB tables exist.
#
# Usage (Railway shell or local with env vars):
#   bash scripts/setup-railway.sh
# ============================================================

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; }
fail() { echo -e "${RED}❌ FAIL${NC}: $1"; exit 1; }
info() { echo -e "${BLUE}→${NC} $1"; }
warn() { echo -e "${YELLOW}⚠ WARN${NC}: $1"; }

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ApexAI — Railway Infrastructure Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Step 1: Required environment variables ───────────────────
info "Checking required environment variables..."
[ -z "$DATABASE_URL" ] && fail "DATABASE_URL not set. Add it in Railway → ApexAI → Variables"
[ -z "$REDIS_URL" ]    && fail "REDIS_URL not set. Railway Redis service → Connect → copy REDIS_URL"
[ -z "$JWT_SECRET" ]   && warn "JWT_SECRET not set — run: openssl rand -hex 32"
[ -z "$GOOGLE_CLIENT_ID" ]     && warn "GOOGLE_CLIENT_ID not set — Google login disabled"
[ -z "$GOOGLE_CLIENT_SECRET" ] && warn "GOOGLE_CLIENT_SECRET not set — Google login disabled"
[ -z "$RAILWAY_PUBLIC_DOMAIN" ] && warn "RAILWAY_PUBLIC_DOMAIN not set — set to: apexai-production-d567.up.railway.app"

pass "DATABASE_URL present"
pass "REDIS_URL present"
echo ""

# ── Step 2: Test MySQL connection ─────────────────────────────
info "Testing MySQL connection..."
node --input-type=module <<'JSEOF'
import mysql2 from 'mysql2/promise';
const { createConnection } = mysql2;
try {
  const conn = await createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 10000,
  });
  const [rows] = await conn.query('SELECT VERSION() as v');
  console.log('  MySQL version:', rows[0].v);
  await conn.end();
  process.exit(0);
} catch(e) {
  console.error('  MySQL connection FAILED:', e.message);
  process.exit(1);
}
JSEOF
pass "MySQL connected"
echo ""

# ── Step 3: Test Redis connection ─────────────────────────────
info "Testing Redis connection..."
node --input-type=module <<'JSEOF'
import IORedis from 'ioredis';
const redis = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  lazyConnect: true,
});
try {
  await redis.connect();
  await redis.set('apexai:setup:check', 'ok', 'EX', 60);
  const v = await redis.get('apexai:setup:check');
  if (v !== 'ok') throw new Error('SET/GET mismatch');
  const info = await redis.info('server');
  const version = info.match(/redis_version:([^\r\n]+)/)?.[1] || 'unknown';
  console.log('  Redis version:', version.trim());
  await redis.quit();
  process.exit(0);
} catch(e) {
  console.error('  Redis FAILED:', e.message);
  process.exit(1);
}
JSEOF
pass "Redis connected"
echo ""

# ── Step 4: Run Drizzle migrations ────────────────────────────
info "Running database migrations..."
cd "$(dirname "$0")/.."
npx drizzle-kit migrate 2>&1 | grep -v "^$" | tail -10
pass "Migrations applied"
echo ""

# ── Step 5: Verify all 18 required tables ────────────────────
info "Verifying database tables..."
node --input-type=module <<'JSEOF'
import mysql2 from 'mysql2/promise';
const { createConnection } = mysql2;
const conn = await createConnection({
  uri: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const REQUIRED = [
  'users', 'leads', 'campaigns', 'campaign_contacts',
  'messages', 'call_recordings', 'templates', 'testimonials',
  'onboardings', 'activity_logs', 'system_config', 'analytics_snapshots',
  'voice_sessions', 'webhook_events', 'appointment_bookings',
  'job_queue', 'call_attempts', 'decision_logs',
];

const [rows] = await conn.query('SHOW TABLES');
const existing = rows.map(r => Object.values(r)[0]);
await conn.end();

let missing = 0;
for (const t of REQUIRED) {
  if (existing.includes(t)) {
    console.log(`  ✅ ${t}`);
  } else {
    console.log(`  ❌ MISSING: ${t}`);
    missing++;
  }
}
if (missing > 0) {
  console.error(`\n${missing} tables missing — check migration files`);
  process.exit(1);
}
console.log(`\n  All ${REQUIRED.length} tables present`);
process.exit(0);
JSEOF
pass "All 18 tables verified"
echo ""

# ── Step 6: Verify BullMQ can enqueue/dequeue ────────────────
info "Testing BullMQ queue with Redis..."
node --input-type=module <<'JSEOF'
import { Queue, Worker } from 'bullmq';
const connection = { url: process.env.REDIS_URL };

let processed = false;

const q = new Queue('apexai:setup-test', { connection });

const worker = new Worker('apexai:setup-test', async (job) => {
  if (job.data.test !== 'apexai') throw new Error('wrong data');
  processed = true;
  console.log('  Worker received job:', job.id, '→ processed ✅');
}, { connection });

const job = await q.add('verify', { test: 'apexai', ts: Date.now() });
console.log('  Job queued:', job.id);

// Wait up to 5 seconds for processing
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Worker timeout — Redis may not be processing')), 5000);
  worker.on('completed', () => { clearTimeout(timeout); resolve(); });
  worker.on('failed', (_, err) => { clearTimeout(timeout); reject(err); });
});

await worker.close();
await q.obliterate({ force: true });
await q.close();

if (!processed) { console.error('  Job was not processed'); process.exit(1); }
process.exit(0);
JSEOF
pass "BullMQ queue: job queued → worker processed → completed"
echo ""

# ── Step 7: Seed system config if empty ──────────────────────
info "Checking system config defaults..."
node --input-type=module <<'JSEOF'
import mysql2 from 'mysql2/promise';
const { createConnection } = mysql2;
const conn = await createConnection({
  uri: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const [rows] = await conn.query('SELECT COUNT(*) as count FROM system_config');
const count = rows[0].count;

if (count === 0) {
  console.log('  Seeding default system config...');
  const defaults = [
    ['app_name',              'ApexAI',              'general'],
    ['support_email',         'support@apexai.com',  'general'],
    ['max_calls_per_day',     '100',                 'calling'],
    ['call_retry_limit',      '3',                   'calling'],
    ['call_retry_delay_mins', '60',                  'calling'],
    ['sms_enabled',           'true',                'messaging'],
    ['email_enabled',         'true',                'messaging'],
    ['voice_enabled',         'false',               'voice'],
    ['default_timezone',      'America/New_York',    'general'],
    ['onboarding_days',       '30',                  'general'],
  ];
  for (const [key, value, category] of defaults) {
    await conn.query(
      'INSERT IGNORE INTO system_config (`key`, value, category) VALUES (?, ?, ?)',
      [key, value, category]
    );
    console.log(`    → ${key} = ${value}`);
  }
  console.log('  System config seeded');
} else {
  console.log(`  System config already has ${count} entries — skipping seed`);
}
await conn.end();
process.exit(0);
JSEOF
pass "System config ready"
echo ""

# ── Summary ──────────────────────────────────────────────────
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}ALL CHECKS PASSED — ApexAI is ready to run ✅${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  ✅ MySQL      — connected, all 18 tables present"
echo "  ✅ Redis       — connected, BullMQ queue works end-to-end"
echo "  ✅ Migrations  — applied"
echo "  ✅ System config — seeded"
echo ""
echo "  Next: add API keys to Railway Variables:"
echo "    TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER"
echo "    OPENAI_API_KEY  (Whisper STT)"
echo "    ELEVENLABS_API_KEY  (TTS)"
echo "    RESEND_API_KEY  (email)"
echo ""
