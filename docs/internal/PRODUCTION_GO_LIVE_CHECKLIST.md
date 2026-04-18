# ApexAI Production Go-Live Checklist

Generated: 2026-04-18
Scope: Booking, CRM integrations, SMS, webhooks, routers, chat, phone number wiring, leads (individual + bulk), uploads.

## Status Legend

- VERIFIED_BY_TEST: Covered by automated tests and currently passing.
- REQUIRES_LIVE_CREDENTIAL_CHECK: Needs production env/provider auth validation.
- REQUIRES_ONE_LIVE_TRANSACTION: Needs one real transaction to prove end-to-end in production.

## Current Validation Snapshot

- Full backend suite: 44 files, 420 tests passing.
- Targeted backend integration sweep: 9 files, 167 tests passing.
- Six Sigma gate: APPROVED.

## Go-Live Matrix

| Area | Status | Evidence | Live Action | Pass Criteria |
| --- | --- | --- | --- | --- |
| Router core and API contract | VERIFIED_BY_TEST | server/apexai.test.ts, server/enterprise-tests.test.ts, server/comprehensive.test.ts | Call health route and run one authenticated app flow | No 5xx responses; data returned with expected schema |
| Webhooks ingestion and auth | VERIFIED_BY_TEST | server/webhooksRouter.test.ts | Send one signed and one invalid webhook payload | Signed payload ingests lead; invalid secret rejected |
| Booking pipeline (voice tool path) | VERIFIED_BY_TEST | server/_core/services/voiceBookingPipeline.test.ts, server/realtime/apexStrictBlueprint.test.ts | Place one call and complete booking details | Booking row created and confirmation path executed |
| Leads CRUD (individual) | VERIFIED_BY_TEST | server/apexai.test.ts, server/comprehensive.test.ts | Create, update, delete one lead in UI/API | Mutations persist and reflect in list/get |
| Leads bulk workflows | VERIFIED_BY_TEST | server/comprehensive.test.ts | Run one bulk send to two leads | Personalization preserved per lead; queue jobs created |
| Number registration / BYOC | VERIFIED_BY_TEST | server/settings.contract.test.ts, server/_core/phoneE164.test.ts | Register one own number in settings | Number normalized to E.164 and listed as linked |
| Web chat public API | VERIFIED_BY_TEST | server/webchatPublicApi.test.ts | Send one website chat message to public endpoint | Message accepted and session state updates |
| Upload + ingestion pipeline | VERIFIED_BY_TEST | server/knowledgeBaseIngestion.test.ts, server/_core/index.ts upload routes | Upload one PDF and run ingestion | Source stored, chunked, and searchable |
| SMS send path | REQUIRES_LIVE_CREDENTIAL_CHECK | server/comprehensive.test.ts (logic covered), signalwire service guards | Verify SIGNALWIRE_* vars in Railway | Service reports ready and can enqueue/send SMS |
| Voice realtime provider chain (STT/LLM/TTS) | REQUIRES_LIVE_CREDENTIAL_CHECK | server/voice.realtime.test.ts, server/realtime/*.test.ts | Verify DEEPGRAM + CEREBRAS + CARTESIA/ELEVENLABS vars | First response audible and no provider auth errors |
| CRM OAuth (HubSpot/Salesforce/Pipedrive) | REQUIRES_LIVE_CREDENTIAL_CHECK | server/_core/index.ts callback handlers + db token paths | Verify OAuth client/secret/redirect vars and start OAuth connect | Callback stores tokens; integration marked connected |
| Redis queue durability | REQUIRES_LIVE_CREDENTIAL_CHECK | server/_core/services/queue.test.ts | Verify REDIS_URL in Railway and restart service | Jobs survive process restart |
| Email send path (Resend) | REQUIRES_LIVE_CREDENTIAL_CHECK | email sequence tests + runtime guards | Verify RESEND_* vars in Railway | Test email accepted by provider API |
| Voice call E2E quality | REQUIRES_ONE_LIVE_TRANSACTION | Realtime engine + QA scoring paths | Run one live inbound call and one outbound follow-up | Audible responses throughout, no dead-air stream drop |
| SMS E2E delivery | REQUIRES_ONE_LIVE_TRANSACTION | Router + SignalWire service flow | Send one outbound SMS to test handset | Delivery callback received and message visible on handset |
| CRM sync E2E | REQUIRES_ONE_LIVE_TRANSACTION | CRM token + sync functions in db.ts | Connect one CRM and push one lead | Lead appears in external CRM with mapped fields |
| Webhook E2E from external source | REQUIRES_ONE_LIVE_TRANSACTION | Webhook router + lead creation path | Trigger webhook from real source system | Lead appears in ApexAI and webhook event logged |

## Production Variable Gates (Must Be Non-Empty)

- Core app: DATABASE_URL, REDIS_URL, JWT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, RAILWAY_PUBLIC_DOMAIN.
- Telephony/SMS: SIGNALWIRE_PROJECT_ID, SIGNALWIRE_TOKEN, SIGNALWIRE_SPACE_URL, SIGNALWIRE_PHONE_NUMBER.
- Voice AI: DEEPGRAM_API_KEY, one CEREBRAS_API_KEY variant, one TTS key (CARTESIA_API_KEY or ELEVENLABS_API_KEY).
- Notifications: RESEND_API_KEY, RESEND_FROM_EMAIL, RESEND_FROM_NAME.
- CRM (optional but required if enabled): HUBSPOT_* and/or SALESFORCE_* and/or PIPEDRIVE_*.

## Fast Execution Plan (20-30 Minutes)

1. Run local proof gates.
   - pnpm run verify:quick
   - pnpm run verify:integrations

2. In Railway Variables, confirm all enabled feature groups are complete.
   - No partial provider configs.

3. Execute four live transactions.
   - Live voice call (audibility + booking)
   - Live SMS send
   - One external webhook ingest
   - One CRM connect + sync

4. Confirm post-transaction evidence.
   - App logs show success paths, no auth/provider errors.
   - DB rows exist for lead/session/message as expected.

5. Mark release.
   - GO only when all enabled integrations show complete credentials and each critical path has at least one successful live transaction.

## Known Deployment Risk To Resolve

- The environment doc at repository root still references Twilio labels in places, while runtime code is currently SignalWire-based for telephony/SMS.
- Before final handoff, align operator-facing env docs with SignalWire naming to prevent misconfiguration.