# ApexAI — Integration crosswalk & QC (living document)

**Purpose:** Every change is checked against **four parts** of the master deliverable. **Status** is evidence-based — not “done” until **DB + API + UI (where applicable) + test** are verified.

**Legend:**

| Status | Meaning |
|--------|---------|
| ⬜ | Not started |
| 🟡 | In progress |
| ✅ | Implemented in this repo |
| 🔗 | Exists in reference folder only — not merged |
| ♻️ | Already in ApexAI — verify/crosswalk only |

**Compliance (quick):** TCPA/consent for outbound; minimize PII in logs; retention policy for transcripts/KB — review each feature row before release.

**Live voice compliance (locked stack, evidence tiers):** [`VOICE_COMPLIANCE_MATRIX.md`](./VOICE_COMPLIANCE_MATRIX.md) — maps requirements → code → tests → logs → manual recordings.

**Voice orchestration roadmap (sections A–G, workstreams WS1–WS12, phases 0–9, Done/Partial/Open crosswalk):** [`internal/VOICE_ORCHESTRATION_ROADMAP.md`](../internal/VOICE_ORCHESTRATION_ROADMAP.md)

**Voice ops runbook (env, smoke, rollback):** [`internal/VOICE_OPS_RUNBOOK.md`](../internal/VOICE_OPS_RUNBOOK.md)

**CRM staging (OAuth + sync proof):** [`internal/CRM_STAGING_CHECKLIST.md`](../internal/CRM_STAGING_CHECKLIST.md)

---

## Where this file lives (your “20 features” crosswalk)

| What | Location |
|------|----------|
| **Living crosswalk (source of truth for ApexAI repo)** | `docs/integration/CROSSWALK.md` (this file) |
| **Original “complete deliverables” bundle** (reference TS/SQL/md — merge targets, not automatic production code) | `Can you duplicate and improve a landing page_ (1)/` (e.g. `02_TRPC_ROUTERS_PART1.ts`, `01_DATABASE_SCHEMAS.sql`, `07_BACKGROUND_JOBS.ts`) |

The **Part 1 table below** (rows **1–20**) is the same numbering as your **“PART 1: 20 MISSING FEATURES”** master checklist. Status here is **evidence in this repo** (migrations, tRPC, UI, tests). A row marked **🔗** means the bundle has reference code; **✅** means it is wired in ApexAI’s app code.

### How to drive “keep going” implementation (for you + the AI)

- **You do not need magic words.** Say **“continue from CROSSWALK Part 1 row N”** (or “next open row”) so each session picks up without re-explaining.
- **One session cannot run forever** (context and tooling limits). For maximum throughput: **prioritize 2–3 rows**, accept the diff, then **“continue”** with the next rows.
- **For “live / real / integrated”:** apply **SQL migrations** on Railway (`0011` … **`0021_ab_testing.sql`** for prompt A/B tables, plus `voice_metric_events` if used), set **env vars** per [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) (Deepgram STT, **Cerebras** default LLM on `realtimeVoiceEngine`, Cartesia TTS, SignalWire; Anthropic/Groq optional for routing and readiness). Treat **🔗 rows** as merge work until they show **✅** here.
- **Optional but powerful:** paste **Railway `DATABASE_URL`** only if you want migration verification from this environment (security: rotate after).

---

## Where we are (checkpoint)

| Checked | What |
|--------|------|
| ✅ | `pnpm exec tsc --noEmit` |
| ✅ | `pnpm run test` / `vitest run` (full server suite; last run **309 tests** passed after guardrails + CI wiring) |
| ⚠️ | **Railway MySQL:** run `0011`–`0017`, **`0018_user_phone_numbers_align.sql`** if needed, Stripe `0019` if billing, KB `0020`, **`0021_ab_testing.sql`** for prompt variants |
| ✅ | Zapier **emit** — `call.completed` (after recording persist), `lead.created` (after lead create); respects Settings filter |
| ✅ | Call summary UI — `aiSummary` on Voice AI → Call Recordings + Summary dialog |

**Stack focus (product — live calls):** SignalWire → **Deepgram Nova-3** (STT) → **Cerebras** `llama3.1-8b` (default streaming LLM in `respondVoiceLlm`) → **Cartesia** (TTS), with **ElevenLabs** TTS fallback and **Anthropic / Groq** available for `LLM_PROVIDER` / readiness per [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md). Authoritative live path diagram: same file. Compliance tiers: [`VOICE_COMPLIANCE_MATRIX.md`](./VOICE_COMPLIANCE_MATRIX.md). **Staging checklist:** [`internal/VOICE_STAGING_CHECKLIST.md`](../internal/VOICE_STAGING_CHECKLIST.md).

---

## Part 1 — Twenty features (competitive parity)

| # | Feature | Phase | DB | API (tRPC) | App UI | QC / evidence |
|---|---------|-------|-----|------------|--------|----------------|
| 1 | Dedicated phone **management** | 1 | ✅ `user_phone_numbers` (Drizzle + migrations) | ✅ `onboarding.provisionNumber` (persists row) + `settings.listPhoneNumbers` / `setPhoneNumberActive` | ✅ Settings card | Voice + inbound SMS resolve tenant via `getUserIdByPhoneNumber(To)` |
| 2 | Knowledge base (crawl + docs) | 1 | ✅ `knowledge_bases` + sources + chunks (0011) | ✅ `knowledgeBase.*` | ✅ Settings | Run migration; list/create/addWebsite |
| 3 | Built-in CRM / lead capture | 1 | ✅ `leads` + tenant `createdBy` | ✅ `leads.*` | ✅ `/leads` (`Leads.tsx`) | Optional bundle `crm_leads` merge later — core CRM list/create/import in app |
| 4 | Call summaries | 1 | ✅ `call_recordings.aiSummary` | ✅ `callSummaryService` + persist in `voiceSessionManager` | ✅ Voice AI recordings | Cerebras/LLM summary on session end |
| 5 | Lead scoring | 1 | ✅ `lead_scoring_rules` (0012) | ✅ `leadScoring.list` / `upsert` | ✅ Settings | Default rules → bonus on `leads.create` via `leadScoringApply` |
| 6 | Multiple voice options | 1 | ✅ `system_config` key `user:{id}:voice_profile_id` + catalog `VOICE_PROFILES` in `voiceProfiles.ts` | ✅ `settings.voiceProfiles` + `settings.update` (`setUserVoiceProfileId`) | ✅ Settings | Cartesia voices; per-tenant selection persisted |
| 7 | Spam filtering | 2 | ✅ `blocked_phone_numbers` (0013) | ✅ `phoneBlocklist.*` | ✅ Settings | Inbound reject + toll-free heuristics (`index.ts`) |
| 8 | Intelligent escalation | 2 | ✅ `escalation_rules` (0013) | ✅ `escalationRules.*` | ✅ Settings | Keyword match → `transferCallToHuman` in `voiceRealtimePipeline` |
| 9 | Zapier | 2 | ✅ `zapier_webhooks` (0012) | ✅ `zapier.*` + `zapierEmit` on lead create & call persist | ✅ Settings | `call.completed`, `lead.created` POST to hook |
| 10 | CRM sync (SF/HubSpot/Pipedrive) | 2 | ✅ `crm_connections` (0014) | ✅ `crm.*` — OAuth + `syncLead` / `syncAll` (`crmRouter.ts`; **Pipedrive** persons API) | ✅ Settings + **Leads** (cloud → all three) | Staging: [`CRM_STAGING_CHECKLIST.md`](../internal/CRM_STAGING_CHECKLIST.md) |
| 11 | Workflow builder | 3 | ✅ `workflows` (0015) | ✅ `workflows.*` | ✅ Settings | JSON draft graph; runner TBD |
| 12 | Persistent memory | 3 | ✅ `customer_memories` (0015) | ✅ `memory.*` | ✅ Settings | Optional `leadId`; RAG workers TBD |
| 13 | Sentiment (product) | 3 | ✅ `call_recordings.sentiment` | ✅ `analytics.sentimentSummary` | ✅ Analytics | On persist: `inferSentimentFromTranscript` if session unset (`sentimentInfer.test.ts`); optional future real-time API |
| 14 | Ticketing | 3 | ✅ `support_tickets` (0015) | ✅ `tickets.*` | ✅ Settings | Status open / in_progress / closed |
| 15 | Mobile backend | 3 | ✅ `mobile_devices` (0016) | ✅ `mobile.*` | ✅ Settings | Device registry + optional push token; delivery TBD |
| 16 | Social | 4 | ✅ `social_connections` (0017) | ✅ `social.*` | ✅ Settings | OAuth + posting TBD |
| 17 | Email automation | 4 | ✅ `email_sequences` (0015) | ✅ `emailSequences.*` + queue on `lead.created` | ✅ Settings | Active sequences with trigger `lead.created` → BullMQ email job (Resend) |
| 18 | RCS | 4 | ✅ `rcs_registrations` (0017) | ✅ `rcs.*` | ✅ Settings | Carrier / Jibe send path TBD |
| 19 | Webchat | 4 | ✅ `webchat_widgets` (0017) | ✅ `webchat.*` + **`GET/POST /api/public/webchat/*`** | ✅ Settings | Config + lead capture; CORS via allowed origins |
| 20 | Analytics dashboard | 4 | ✅ `call_recordings` + `leads` aggregates in `getDashboardBreakdown` + `analytics_snapshots` | ✅ `analytics.dashboardBreakdown` + `recordSnapshot` + tenant `snapshots` | ✅ Analytics page | Leads by segment + calls by outcome charts |

### Part 1 supplement — Voice prompt A/B (live engine)

| Add-on | DB | API | Runtime | App UI |
|--------|-----|-----|---------|--------|
| Prompt variants & results | ✅ `prompt_variants`, `ab_test_results` — `drizzle/0021_ab_testing.sql` (startup migration mirrors in `server/_core/index.ts`) | ✅ `appRouter.abTesting` → `abTestingRouter.ts` | ✅ `realtimeVoiceEngine.ts` — `selectAbVariantForCall`; log line `[AB] Variant selected` | ✅ **Settings** — “Voice prompt A/B testing” card (`Settings.tsx`) |

### Part 1 — Evidence index (where to look in the repo)

Use this table to prove **DB + API + UI** for each shipped row. Paths are relative to the repo root (`ApexAI/`).

| # | Evidence: DB / SQL | Evidence: API | Evidence: UI | Evidence: tests / runtime |
|---|-------------------|---------------|-------------|---------------------------|
| 1 | `drizzle/schema.ts` → `userPhoneNumbers`; `0018_user_phone_numbers_align.sql` | `server/routers.ts` → `settings.listPhoneNumbers`, `setPhoneNumberActive`, `onboarding.provisionNumber` | `client/src/pages/Settings.tsx` (Dedicated phone numbers) | Inbound tenant resolution: `server/db.ts` `getUserIdByPhoneNumber`, `server/_core/index.ts` SMS/voice |
| 2 | `knowledge_bases` + `brandProfile` (`0020`) + sources + chunks | `knowledgeBaseRouter.ts` + `knowledgeBaseIngestion.ts` (site+PDF+txt+branding) + upload route + `tenantContextForVoice.ts` | `Settings.tsx` KB (URLs, upload, brand panel, search) | `knowledgeBaseIngestion.test.ts` |
| 3 | `drizzle/schema.ts` → `leads` + `createdBy` | `server/routers.ts` → `leads.*` | `client/src/pages/Leads.tsx` | `server/comprehensive.test.ts` |
| 4 | `call_recordings.aiSummary` | `server/_core/services/callSummaryService.ts`, persist in `voiceSessionManager` | Voice AI / recordings UI | — |
| 5 | `lead_scoring_rules` (`0012`) | `server/routers/leadScoringRouter.ts` | `Settings.tsx` (Lead scoring) | `leadScoringApply` on `leads.create` |
| 6 | `system_config` + `server/_core/services/voiceProfiles.ts` | `settings.voiceProfiles`, `settings.update` (`voiceProfileId`) | `Settings.tsx` (voice profile) | `server/_core/services/voiceProfiles.test.ts` |
| 7 | `blocked_phone_numbers` (`0013`) | `server/routers/phoneBlocklistRouter.ts` | `Settings.tsx` (Blocklist) | Inbound filter `server/_core/index.ts` |
| 8 | `escalation_rules` (`0013`) | `server/routers/escalationRouter.ts` | `Settings.tsx` (Escalation) | `server/_core/services/voiceRealtimePipeline.ts` transfer |
| 9 | `zapier_webhooks` (`0012`) | `server/routers/zapierRouter.ts`, `server/_core/services/zapierEmit.ts` | `Settings.tsx` (Zapier) | Emitted on lead + call persist |
| 10 | `crm_connections` (`0014`) | `server/routers/crmRouter.ts` | `Settings.tsx` + `Leads.tsx` (CRM push menu) | OAuth + `syncLead` |
| 11 | `workflows` (`0015`) | `workflowRouter.ts` + `workflowEngine.ts` (`lead.created`) | `Settings.tsx` (Workflows) | `http_post` steps |
| 12 | `customer_memories` (`0015`) | `memoryRouter.ts` + `tenantContextForVoice.ts` | `Settings.tsx` (Memory) | Voice context |
| 13 | `call_recordings.sentiment` | `analytics.sentimentSummary`, `server/_core/services/sentimentInfer.ts` | `client/src/pages/Analytics.tsx` | `server/sentimentInfer.test.ts` |
| 14 | `support_tickets` (`0015`) | `server/routers/ticketsRouter.ts` | `Settings.tsx` (Tickets) | — |
| 15 | `mobile_devices` (`0016`) | `server/routers/mobileRouter.ts` | `Settings.tsx` (Mobile devices) | — |
| 16 | `social_connections` (`0017`) | `server/routers/socialRouter.ts` | `Settings.tsx` (Social) | — |
| 17 | `email_sequences` (`0015`) | `server/routers/emailSequencesRouter.ts`, `server/_core/services/emailSequenceTrigger.ts` | `Settings.tsx` (Email sequences) | Queue: `server/_core/index.ts` |
| 18 | `rcs_registrations` (`0017`) | `server/routers/rcsRouter.ts` | `Settings.tsx` (RCS) | — |
| 19 | `webchat_widgets` (`0017`) | `server/routers/webchatRouter.ts`, `server/_core/webchatPublicApi.ts` | `Settings.tsx` (Webchat) | `server/webchatPublicApi.test.ts` |
| 20 | `analytics_snapshots`, aggregates | `analytics.dashboardBreakdown`, `recordSnapshot` | `client/src/pages/Analytics.tsx` | Charts from tRPC |
| A/B | `0021_ab_testing.sql`, `db.ts` `selectAbVariantForCall` / `upsertPromptVariant` | `server/routers/abTestingRouter.ts` | `Settings.tsx` — Voice prompt A/B testing | `realtimeVoiceEngine.ts`; `guardrails.test.ts` |

### Billing (Stripe) — go-live wiring

| Layer | Location |
|-------|----------|
| Env | `server/_core/env.ts` — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER\|GROWTH\|ENTERPRISE`, success/cancel paths |
| HTTP webhook | `POST /api/stripe/webhook` — `server/_core/index.ts` (raw body, before `express.json`) |
| Service | `server/_core/services/stripeBilling.ts` — Checkout, Portal, webhook dispatch |
| API | `server/routers/saasRouter.ts` → `saas.billing.status`, `createCheckoutSession`, `createPortalSession` |
| UI | `client/src/pages/Settings.tsx` — **Billing & subscription** card |
| DB | `drizzle/schema.ts` `users.stripeCustomerId` / `stripeSubscriptionId` / `stripeSubscriptionStatus`; safe ALTER in `server/_core/index.ts` + `drizzle/0019_user_stripe_billing.sql` |

### Voice quality / prompt (Part 2 overlap)

| Item | Evidence |
|------|----------|
| Dynamic system prompt | `server/realtime/dynamicPrompt.ts` — `buildVoiceSystemPrompt`; `server/realtime/dynamicPrompt.test.ts` |
| Live pipeline | `server/_core/services/voiceRealtimePipeline.ts` — barge-in, STT, transfer |
| Streaming voice brain | `server/realtime/realtimeVoiceEngine.ts` — Deepgram → `respondVoiceLlm` (Cerebras stream) → `streamToCartesia`; `responseGuardrails.ts` + `guardrails.test.ts` |
| TTS | `server/_core/services/ttsService.ts` — Cartesia + ElevenLabs path; `server/tts.service.test.ts` |
| Tunables | `server/_core/env.ts` — `voiceBargeInEnergyThreshold`, `voiceDeepgramEndpointingMs`, `voiceTtsSpeedScale`, `voiceResponseMicroPauseMs`, `LLM_PROVIDER`, etc. |

---

## Part 2 — Premium voice agent (5 modules)

| Module | File (reference) | Merge target | Status |
|--------|------------------|--------------|--------|
| Orchestrator | `01_PREMIUM_VOICE_ORCHESTRATOR.ts` | `server/realtime/realtimeVoiceEngine.ts` (Cerebras + tools + session) | ♻️ |
| Dynamic prompt | `02_DYNAMIC_PROMPT_ENGINE.ts` | `server/realtime/dynamicPrompt.ts` (`buildVoiceSystemPrompt`) + `callPolicy` | ✅ |
| Sentiment | `03_SENTIMENT_AND_EMOTION.ts` | `sentimentInfer.ts` + `voiceSessionManager` persist; `sentimentInfer.test.ts` | ♻️ Heuristic aggregate; bundle = per-turn API |
| Realtime streaming | `04_REALTIME_STREAMING.ts` | `voiceRealtimePipeline` + Deepgram/Cartesia streaming | ♻️ |
| Conversion | `05_CONVERSION_OPTIMIZATION.ts` | `analytics.*` + `recordSnapshot` / funnel metrics | ♻️ |

---

## Part 3 — Supporting infrastructure

| Item | Reference | Status |
|------|-----------|--------|
| SQL | `01_DATABASE_SCHEMAS.sql` | ♻️ ApexAI uses **`users`** + Drizzle (`drizzle/schema.ts`, `drizzle/*.sql`); bundle may say `accounts` |
| Routers | `02–04_TRPC_*` | ✅ `server/routers.ts` + `server/routers/*Router.ts` |
| Services | `05–06_SERVICE_LOGIC_*` | ✅ `server/_core/services/*` + `server/db.ts` |
| Jobs | `07_BACKGROUND_JOBS.ts` | ✅ `server/_core/services/queue.ts` (BullMQ); workers in `server/_core/index.ts` (`calls`, `sms`, `email` queues); **`REDIS_URL`** or in-memory fallback (tests / dev) |
| Webhooks | `08_WEBHOOK_HANDLERS.ts` | ✅ `server/routers/webhooksRouter.ts` (`omniAiLead`); `webhooksRouter.test.ts`; rate limits on `/webhooks` + `/api/trpc/webhooks`; optional **`WEBHOOK_SECRET`** |

---

## Part 4 — Website / marketing

Landing lists **platform capabilities** (Part 1 mirror) at anchor `#capabilities` (`client/src/pages/LandingPage.tsx`, `client/src/components/marketing/siteContent.ts`).

---

## Roadmap Phases (execution)

| Phase | Weeks (estimate) | Scope |
|-------|------------------|-------|
| **A** | 1–2 | Crosswalk + KB DB + API + Settings + migration proof |
| **B** | 3–6 | Summaries + scoring + spam + escalation + Zapier stubs |
| **C** | 7–12 | Workflows, memory, sentiment product, ticketing |
| **D** | 13+ | Social, RCS, webchat, advanced analytics |

---

## Verification log (append on each release)

| Date | Change | Verified by |
|------|--------|-------------|
| 2026-03-31 | `drizzle/0011_knowledge_base.sql` + Drizzle schema + `server/routers/knowledgeBaseRouter.ts` + Settings UI + `appRouter.knowledgeBase` | `pnpm exec tsc --noEmit` pass; run SQL on Railway before using UI |
| 2026-03-31 | Cartesia-only `ttsService`; `callSummaryService` + voice session persist; `drizzle/0012_zapier_lead_scoring.sql` + `zapier` + `leadScoring` routers | `pnpm exec tsc --noEmit`; `vitest run server/tts.service.test.ts`; run 0012 on Railway |
| 2026-03-31 | Settings UI: Zapier + lead scoring; `leadScoringApply` + `getDefaultLeadScoringRule` on `leads.create`; crosswalk checkpoint section | `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (192 tests) |
| 2026-03-31 | `zapierEmit.ts` — `call.completed` + `lead.created`; Voice AI shows `aiSummary`; vitest `createLead` mock returns `{ insertId }` | `pnpm exec tsc --noEmit`; `pnpm exec vitest run` |
| 2026-03-31 | `0013` blocklist + escalation; inbound blocklist + `leadId` on stream; keyword escalation in pipeline | `pnpm exec tsc --noEmit`; `pnpm exec vitest run` |
| 2026-03-31 | `0014` CRM stubs; `analytics.dashboardBreakdown`; snapshots scoped by `userId`; `recordSnapshot` sets `createdBy` | `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (192 tests) |
| 2026-03-31 | `0015` workflows / memory / tickets / email sequences; `workflows`, `memory`, `tickets`, `emailSequences` routers; `analytics.sentimentSummary`; Settings + Analytics UI | `pnpm exec tsc --noEmit`; `pnpm exec vitest run` |
| 2026-03-31 | `0016` `mobile_devices`; `mobile` router (`list` / `register` / `remove`); Settings “Mobile app devices” | `pnpm exec tsc --noEmit`; `pnpm exec vitest run` |
| 2026-03-31 | `0017` social / webchat / RCS tables; `social`, `webchat`, `rcs` routers; Settings cards | `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (192 tests) |
| 2026-03-31 | Public webchat HTTP: `GET /api/public/webchat/config`, `POST /api/public/webchat/lead`; `getWebchatWidgetByPublicKey` | `pnpm exec tsc --noEmit`; `pnpm exec vitest run` |
| 2026-03-31 | Email sequences: `lead.created` → `listActiveEmailSequencesByTrigger` + `addEmailJob` type `sequence`; hooks on lead create (tRPC, webchat, GHL, demo, webhooks, voice inbound) | `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (196 tests) |
| 2026-03-31 | Crosswalk rows 3–4 verified; inbound SMS `createdBy` + message `createdBy` from `getUserIdByPhoneNumber(To)`; `createLead` → `getLeadById` for new SMS lead | `pnpm exec tsc --noEmit`; `pnpm exec vitest run` |
| 2026-03-31 | `sentimentInfer.ts` — keyword heuristic for `call_recordings.sentiment` on session persist; Part 2 Sentiment row ♻️ | `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (200 tests) |
| 2026-04-01 | Part 2 Dynamic prompt: `dynamicPrompt.ts` — `buildVoiceSystemPrompt` extracted from `realtimeVoiceEngine`; `dynamicPrompt.test.ts` | `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (201 tests) |
| 2026-04-01 | Row 1 dedicated phones: `listUserPhoneNumbers` / `insertUserPhoneNumber` / `setUserPhoneNumberActive`; `onboarding.provisionNumber` inserts `user_phone_numbers`; Settings UI + `settings.listPhoneNumbers` / `setPhoneNumberActive`; Part 2 Orchestrator / Realtime / Conversion ♻️; row 20 analytics DB ✅ | `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (201 tests) |
| 2026-04-01 | Row 6 voice options: crosswalk DB ✅ (`system_config` + `voiceProfiles`); `0018_user_phone_numbers_align.sql` for legacy `user_phone_numbers` DDL | `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (201 tests) |
| 2026-04-01 | Part 3 Jobs + Webhooks crosswalk ✅; `voiceProfiles.test.ts` (`listVoiceProfiles`, `getVoiceProfileById`) | `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (204 tests) |
| 2026-04-01 | `sentimentInfer`: dedupe POS keyword; skip counting `interested` when phrase `not interested`; tests for weighted negatives; Part 2 Sentiment row cites `sentimentInfer.test.ts` | `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (206 tests) |
| 2026-04-01 | `webhooksRouter.test.ts` — `omniAiLead` open vs `WEBHOOK_SECRET` + `x-webhook-secret`; Part 3 Webhooks row cites test file | `pnpm exec tsc --noEmit`; `pnpm exec vitest run` (209 tests) |
| 2026-04-01 | Stripe: `stripeBilling.ts` + `POST /api/stripe/webhook` + `saas.billing.*` + Settings billing card; users stripe columns; CROSSWALK evidence index + Part 1 file map | `pnpm exec tsc --noEmit`; `pnpm exec vitest run` |
| 2026-04-02 | Repo aligned to `main`: guardrails, `llmRouter` / Cerebras keys, `0021` A/B tables, expanded `crmRouter`, `.github/workflows/ci.yml`. CROSSWALK + `VOICE_COMPLIANCE_MATRIX` stack text synced to `ARCHITECTURE.md`. | `pnpm run verify` — **309** tests; `pnpm run build`; `docs/internal/VOICE_STAGING_CHECKLIST.md` added |
| 2026-04-04 | Settings UI for voice prompt A/B (`abTesting.*`); `verify:integrations` / `verify:integrations:strict`; CI informational integration report; `CRM_STAGING_CHECKLIST.md`. | `pnpm run verify:quick` — **309** tests; `pnpm run check` |
| 2026-04-04 | A/B: select variant by **SignalWire callSid** before greeting; `recordAbTestResult` with duration + dedupe; CRM **Connect** opens OAuth; **Leads** cloud menu → `crm.syncLead`; workflow `release-verify.yml` (manual strict). | `pnpm run verify:quick` |
