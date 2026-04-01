# ApexAI Feature Integration Guide

## Complete Step-by-Step Integration Instructions

This guide walks your AI team through integrating all 20 missing features into the ApexAI backend.

---

## Phase 1: Database Setup (Day 1-2)

### Step 1.1: Run Database Migrations

```bash
# Connect to your MySQL database
mysql -h your-host -u your-user -p your-database < 01_DATABASE_SCHEMAS.sql

# Verify tables were created
mysql -h your-host -u your-user -p your-database -e "SHOW TABLES;"
```

**Expected Output**: 30+ new tables including:
- `phone_numbers`, `phone_number_assignments`
- `knowledge_base_*` (chunks, embeddings, etc.)
- `crm_leads`, `crm_field_mappings`
- `call_summaries`, `sentiment_analysis`
- `lead_scoring_rules`, `lead_scores`
- `ai_voices`, `account_voice_settings`
- `spam_filters`, `spam_detection_logs`
- `escalation_rules`, `escalation_events`
- `zapier_integrations`, `zapier_webhook_logs`
- `crm_integrations`, `crm_sync_logs`
- `workflows`, `workflow_executions`
- `conversation_memory`
- `support_tickets`, `ticket_comments`
- `mobile_devices`, `push_notifications`
- `social_media_integrations`, `social_messages`
- `email_templates`, `email_logs`, `email_campaigns`
- `rcs_messages`
- `webchat_conversations`, `webchat_messages`
- `analytics_events`, `analytics_daily_summary`

---

## Phase 2: Code Integration (Day 3-5)

### Step 2.1: Copy Service Files

```bash
# Copy all service logic files to your server directory
cp 05_SERVICE_LOGIC_PART1.ts server/services/
cp 06_SERVICE_LOGIC_PART2.ts server/services/

# Create index file to export all services
touch server/services/index.ts
```

**server/services/index.ts**:
```typescript
export * from './05_SERVICE_LOGIC_PART1';
export * from './06_SERVICE_LOGIC_PART2';
```

### Step 2.2: Copy tRPC Routers

```bash
# Copy router files
cp 02_TRPC_ROUTERS_PART1.ts server/routers/advancedFeatures1.ts
cp 03_TRPC_ROUTERS_PART2.ts server/routers/advancedFeatures2.ts
cp 04_TRPC_ROUTERS_PART3.ts server/routers/phase2Features.ts

# Create combined router file
touch server/routers/allFeatures.ts
```

**server/routers/allFeatures.ts**:
```typescript
import { router } from '@/server/trpc';
import { advancedFeaturesRouter as adv1 } from './advancedFeatures1';
import { advancedFeaturesRouter as adv2 } from './advancedFeatures2';
import { phase2FeaturesRouter } from './phase2Features';

export const allFeaturesRouter = router({
  advanced1: adv1,
  advanced2: adv2,
  phase2: phase2FeaturesRouter,
});
```

### Step 2.3: Copy Background Jobs

```bash
# Copy background job file
cp 07_BACKGROUND_JOBS.ts server/workers/

# Create worker entry point
touch server/worker.ts
```

**server/worker.ts**:
```typescript
import './workers/07_BACKGROUND_JOBS';

console.log('ApexAI Background Workers Started');
console.log('Listening for jobs on Redis...');

// Keep process alive
process.on('SIGTERM', () => {
  console.log('Graceful shutdown initiated');
  process.exit(0);
});
```

### Step 2.4: Copy Webhook Handlers

```bash
# Copy webhook file
cp 08_WEBHOOK_HANDLERS.ts server/webhooks/

# Update main server file
```

**server/index.ts** (add these lines):
```typescript
import webhookRoutes from './webhooks/08_WEBHOOK_HANDLERS';

// Mount webhook routes
app.use('/api', webhookRoutes);

// Mount feature routers
appRouter.use('features', allFeaturesRouter);
```

---

## Phase 3: Environment Configuration (Day 5-6)

### Step 3.1: Create .env File

```bash
# Copy template
cp 09_ENVIRONMENT_CONFIG.md .env.template

# Create actual .env file
touch .env
```

### Step 3.2: Fill in Credentials

**Get API Keys From:**

1. **SignalWire**: https://signalwire.com
   - Create project
   - Generate API key
   - Set webhook secret

2. **OpenAI**: https://platform.openai.com
   - Create API key
   - Set organization ID

3. **Salesforce**: https://developer.salesforce.com
   - Create connected app
   - Get client ID and secret

4. **HubSpot**: https://app.hubspot.com
   - Create private app
   - Get API key

5. **SendGrid**: https://sendgrid.com
   - Create API key

6. **Firebase**: https://console.firebase.google.com
   - Create project
   - Download service account JSON

7. **Meta (Instagram/WhatsApp)**: https://developers.facebook.com
   - Create app
   - Get access token

### Step 3.3: Validate Configuration

```bash
# Test database connection
npm run test:db

# Test Redis connection
npm run test:redis

# Test API keys
npm run test:apis
```

---

## Phase 4: Integration Testing (Day 6-7)

### Step 4.1: Test Each Feature

**Feature 1: Phone Numbers**
```bash
# Test provisioning
curl -X POST http://localhost:3000/api/trpc/features.advanced1.phoneNumbers.provision \
  -H "Content-Type: application/json" \
  -d '{"areaCode":"415","country":"US"}'
```

**Feature 2: Knowledge Base**
```bash
# Test crawling
curl -X POST http://localhost:3000/api/trpc/features.advanced1.knowledgeBase.crawl \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

**Feature 3: CRM Leads**
```bash
# Test lead capture
curl -X POST http://localhost:3000/api/trpc/features.advanced1.crmLeads.capture \
  -H "Content-Type: application/json" \
  -d '{"phone":"+14155551234","name":"John Doe"}'
```

### Step 4.2: Test Webhooks

```bash
# Test SignalWire webhook
curl -X POST http://localhost:3000/api/webhooks/signalwire/call-received \
  -H "Content-Type: application/json" \
  -d '{"callId":"CA123","from":"+14155551234"}'

# Test Zapier webhook
curl -X POST http://localhost:3000/api/webhooks/zapier/trigger \
  -H "Content-Type: application/json" \
  -d '{"integrationId":"1","eventType":"lead_created","payload":{}}'
```

### Step 4.3: Test Background Jobs

```bash
# Check Redis queue status
redis-cli KEYS "bull:*"

# Monitor job processing
npm run workers:monitor
```

---

## Phase 5: Deployment (Day 8-9)

### Step 5.1: Build for Production

```bash
# Build backend
npm run build

# Verify build
ls -la dist/
```

### Step 5.2: Deploy to Railway

```bash
# Push to Git
git add .
git commit -m "Add 20 missing features"
git push origin main

# Railway auto-deploys on push
# Monitor deployment: https://railway.app/project/your-project
```

### Step 5.3: Run Migrations in Production

```bash
# Connect to production database
mysql -h prod-host -u prod-user -p prod-database < 01_DATABASE_SCHEMAS.sql

# Verify
mysql -h prod-host -u prod-user -p prod-database -e "SHOW TABLES;"
```

### Step 5.4: Start Background Workers

```bash
# In Railway, add a new service for workers
# Service: worker.ts
# Command: npm run workers

# Or use PM2
pm2 start dist/server/worker.js --name "apexai-workers"
pm2 save
```

---

## Phase 6: Integration with Existing Features (Day 9-10)

### Step 6.1: Wire Phone Numbers to Call Handling

In your existing call handler:

```typescript
// server/handlers/callHandler.ts
import { PhoneNumberService } from '@/server/services';

export async function handleIncomingCall(callData: any) {
  // Get phone number details
  const phoneNumber = await db.query(
    'SELECT * FROM phone_numbers WHERE phone_number = ?',
    [callData.to]
  );

  // Capture lead
  const leadId = await CRMLeadsService.captureLeadFromCall(
    callData,
    phoneNumber.account_id,
    phoneNumber.id,
    db
  );

  // Check spam
  const spamCheck = await SpamFilteringService.checkSpam(
    callData.from,
    callData.callerId,
    spamFilters
  );

  if (spamCheck.isSpam) {
    // Block or flag call
    return;
  }

  // Check escalation rules
  const { shouldEscalate, rule } = await EscalationService.shouldEscalate(
    callData,
    escalationRules
  );

  if (shouldEscalate) {
    await EscalationService.escalateToAgent(callData.callId, rule.target_phone);
  }

  // Continue with normal call handling
}
```

### Step 6.2: Wire Call Summaries to Post-Call Processing

```typescript
// server/handlers/postCallHandler.ts
import { CallSummariesService, SentimentService } from '@/server/services';

export async function handleCallCompleted(callData: any) {
  // Transcribe call
  const transcription = await CallSummariesService.transcribeCall(
    callData.recordingUrl
  );

  // Generate summary
  const summary = await CallSummariesService.generateSummary(
    transcription,
    callData.duration
  );

  // Analyze sentiment
  const sentiment = await SentimentService.analyzeSentiment(transcription);

  // Score lead
  const { score } = await LeadScoringService.calculateScore(
    leadData,
    scoringRules,
    db
  );

  // Store results
  await db.query(
    `UPDATE crm_leads SET 
     call_summary = ?, 
     sentiment = ?, 
     qualification_score = ? 
     WHERE id = ?`,
    [summary.summary, sentiment.sentiment, score, leadId]
  );

  // Trigger workflows
  await WorkflowBuilderService.executeWorkflow(
    workflow,
    { leadId, sentiment: sentiment.sentiment, score },
    db
  );

  // Send to Zapier
  await ZapierService.sendEvent(
    zapierWebhookUrl,
    'call_completed',
    { leadId, summary, sentiment, score }
  );

  // Sync to CRM
  await CRMIntegrationService.syncToSalesforce(
    leadData,
    salesforceToken,
    salesforceInstanceUrl,
    fieldMappings
  );
}
```

### Step 6.3: Wire Workflows to Lead Actions

```typescript
// In your lead qualification logic
import { WorkflowBuilderService } from '@/server/services';

export async function qualifyLead(leadId: string) {
  // Get workflows for this account
  const workflows = await db.query(
    'SELECT * FROM workflows WHERE account_id = ? AND trigger_type = "lead_qualified"',
    [accountId]
  );

  // Execute each workflow
  for (const workflow of workflows) {
    await WorkflowBuilderService.executeWorkflow(
      JSON.parse(workflow.workflow_definition),
      { leadId, accountId },
      db
    );
  }
}
```

---

## Phase 7: Monitoring & Optimization (Day 10+)

### Step 7.1: Set Up Monitoring

```bash
# Install monitoring tools
npm install prom-client datadog-api-client

# Create metrics file
touch server/metrics.ts
```

### Step 7.2: Monitor Key Metrics

```typescript
// server/metrics.ts
import { Counter, Gauge, Histogram } from 'prom-client';

export const callsProcessed = new Counter({
  name: 'apexai_calls_processed_total',
  help: 'Total calls processed',
});

export const leadsCreated = new Counter({
  name: 'apexai_leads_created_total',
  help: 'Total leads created',
});

export const jobQueueDepth = new Gauge({
  name: 'apexai_job_queue_depth',
  help: 'Current job queue depth',
});

export const apiResponseTime = new Histogram({
  name: 'apexai_api_response_time_ms',
  help: 'API response time in milliseconds',
});
```

### Step 7.3: Configure Alerts

Set up alerts for:
- Job queue depth > 1000
- Job failure rate > 5%
- API response time > 5s
- Database connection errors
- Redis connection errors
- Webhook delivery failures

---

## Troubleshooting

### Issue: "WIRE THIS" comments in code

**Solution**: Replace with actual implementation:

```typescript
// BEFORE:
// WIRE THIS: Call SignalWire to transfer call
// await signalwire.call.transfer(callId, targetPhone);

// AFTER:
const response = await axios.post(
  `${process.env.SIGNALWIRE_SPACE_URL}/api/rest/Calls/${callId}/transfer`,
  { to: targetPhone },
  {
    auth: {
      username: process.env.SIGNALWIRE_PROJECT_ID,
      password: process.env.SIGNALWIRE_AUTH_TOKEN,
    },
  }
);
```

### Issue: Database connection errors

```bash
# Check MySQL connection
mysql -h your-host -u your-user -p your-database -e "SELECT 1;"

# Check user permissions
mysql -h your-host -u root -p -e "SHOW GRANTS FOR 'your-user'@'%';"
```

### Issue: Redis connection errors

```bash
# Check Redis is running
redis-cli ping

# Check Redis connection string
redis-cli -h your-host -p 6379 ping
```

### Issue: API keys not working

```bash
# Verify API key format
echo $OPENAI_API_KEY  # Should start with "sk-"
echo $SIGNALWIRE_API_KEY  # Should be valid token

# Test API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
```

---

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the "WIRE THIS" comments in the code
3. Check logs: `docker logs apexai-backend`
4. Check Redis queue: `redis-cli KEYS "bull:*"`
5. Check database: `mysql -h host -u user -p database -e "SELECT * FROM analytics_events LIMIT 10;"`

---

## Success Criteria

You'll know the integration is successful when:

✅ All 30+ database tables are created
✅ All tRPC endpoints respond without errors
✅ Background jobs are processing from Redis queue
✅ Webhooks are receiving and processing events
✅ Leads are being captured from calls
✅ Call summaries are being generated
✅ Leads are being scored automatically
✅ Workflows are executing on triggers
✅ Data is syncing to CRM systems
✅ Zapier events are being sent
✅ Monitoring shows healthy metrics

---

## Next Steps

1. **Customize**: Modify the code for your specific business logic
2. **Test**: Write comprehensive tests for each feature
3. **Optimize**: Profile and optimize performance
4. **Scale**: Configure auto-scaling for high volume
5. **Extend**: Add additional features based on user feedback
