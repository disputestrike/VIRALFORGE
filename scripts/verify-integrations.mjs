#!/usr/bin/env node
/**
 * Pass 5 / local smoke: reports which integration env vars are set (SMS, email, voice).
 * Run from repo root: node scripts/verify-integrations.mjs
 * Set VERIFY_STRICT=1 to exit 1 if any required group is incomplete.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env");

function loadDotEnv() {
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === "") {
      process.env[key] = val;
    }
  }
}

loadDotEnv();

const groups = [
  {
    name: "SMS / SignalWire",
    keys: ["SIGNALWIRE_PROJECT_ID", "SIGNALWIRE_TOKEN", "SIGNALWIRE_SPACE_URL", "SIGNALWIRE_PHONE_NUMBER"],
  },
  {
    name: "Email (Resend)",
    keys: ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "RESEND_FROM_NAME"],
  },
  {
    name: "Database",
    keys: ["DATABASE_URL"],
  },
  {
    name: "Redis (queues)",
    keys: ["REDIS_URL"],
  },
  {
    name: "Auth / session",
    keys: ["JWT_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  },
  {
    name: "Stripe (billing)",
    keys: [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PRICE_STARTER",
      "STRIPE_PRICE_GROWTH",
      "STRIPE_PRICE_ENTERPRISE",
    ],
  },
];

let strictFail = false;
console.log("Integration env check (ApexAI)\n");

for (const g of groups) {
  const missing = g.keys.filter((k) => !(process.env[k] && String(process.env[k]).trim()));
  const ok = missing.length === 0;
  if (!ok && process.env.VERIFY_STRICT === "1") strictFail = true;
  console.log(`${ok ? "✓" : "○"} ${g.name}`);
  for (const k of g.keys) {
    const set = !!(process.env[k] && String(process.env[k]).trim());
    console.log(`    ${set ? "·" : "!"} ${k}`);
  }
  if (!ok) console.log(`    (missing: ${missing.join(", ")})`);
  console.log("");
}

console.log("Tip: copy .env from Railway or use VERIFY_STRICT=1 in CI to fail on missing vars.");
console.log("Real SMS/email sends require valid keys plus correct from-domain for Resend.\n");

if (strictFail) {
  console.error("VERIFY_STRICT=1: one or more groups incomplete.");
  process.exit(1);
}
