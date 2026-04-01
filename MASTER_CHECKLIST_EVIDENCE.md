# Master checklist → ApexAI repo evidence (how to find & verify)

This document answers: **Where are the 20 competitive features in *this* codebase?** How do I open them in the app? What APIs and tables back them? What requires external vendor credentials (SignalWire, CRM OAuth, RCS carrier, etc.)?

Your deliverable bundle (`02_TRPC_ROUTERS_PART1.ts`, `05_SERVICE_LOGIC_PART1.ts`, etc.) is **reference material**. The **merged, running implementation** lives under `server/`, `client/`, and `drizzle/`. This file is the **crosswalk from your numbered checklist to those paths**.

**Quick navigation (logged-in product UI)**

| Area | URL / location |
|------|----------------|
| **Admin / tenant settings (most of the 20)** | `https://<your-domain>/settings` — `client/src/pages/Settings.tsx` |
| **Leads (CRM)** | `/leads` — `client/src/pages/Leads.tsx` — `trpc.leads.*` |
| **Analytics** | `/analytics` — `client/src/pages/Analytics.tsx` — `trpc.analytics.*` |
| **Voice AI / recordings** | App nav → Voice AI — summaries on recordings via `call_recordings.aiSummary` |

**Deeper technical crosswalk** (same numbering, more SQL detail): `docs/integration/CROSSWALK.md`

---

## PART 1: 20 features — evidence map

Legend: **DB** = Drizzle + `drizzle/*.sql` | **API** = tRPC namespace | **UI** = primary screen | **Ready** = honest production readiness in *this* repo.

| # | Your checklist name | DB (actual tables) | Backend API (`server/routers/…`) | Frontend / admin | Ready / notes |
|---|----------------------|-------------------|----------------------------------|------------------|----------------|
| **1** | Dedicated phone number management | `user_phone_numbers` | `settings.listPhoneNumbers`, `setPhoneNumberActive`; `onboarding.provisionNumber` in `server/routers.ts` | **Settings** — “Dedicated phone numbers” card | **Wired.** Needs SignalWire + Railway env for live provision. |
| **2** | Knowledge base (crawl + ingest + embeddings) | `knowledge_bases`, `knowledge_base_sources`, `knowledge_base_chunks` | `knowledgeBase.*` → `knowledgeBaseRouter.ts`; ingest/search: `server/_core/services/knowledgeBaseIngestion.ts` | **Settings** — KB card: sources list, chunk stats, **Test semantic search**; `trpc.knowledgeBase.search`, `.stats`, `.reprocessSource` | **Shipped.** `addWebsite` → background `fetch` + Cheerio text → chunk → **OpenAI embeddings** (or keyword-only fallback) → `knowledge_base_chunks`. **Voice:** `tenantContextForVoice.ts` injects top chunks into `voiceRealtimePipeline` system prompt per turn. |
| **3** | Built-in CRM / lead capture | `leads` (+ `createdBy`) | `leads.*` in `server/routers.ts` | **`/leads`** — `Leads.tsx` | **Wired** for list/create/import; leads from calls/webhooks hook into same tables. |
| **4** | Call summaries | `call_recordings` + `aiSummary` | `callSummaryService` + voice session persist | Voice AI → recordings / summary dialog | **Wired** when LLM + session end path runs (Cerebras/env). |
| **5** | Lead scoring | `lead_scoring_rules` | `leadScoring.*` → `server/routers/leadScoringRouter.ts` | **Settings** — “Lead scoring (bonus)” | **Wired** — rules applied on `leads.create` via `leadScoringApply`. |
| **6** | Multiple voice options | `system_config` + `voiceProfiles` catalog | `settings.voiceProfiles`, `settings.update` (`voiceProfileId`) | **Settings** — voice profile selector | **Wired** — Cartesia voices; `server/_core/services/voiceProfiles.ts`, tests in `voiceProfiles.test.ts`. |
| **7** | Spam filtering | `blocked_phone_numbers` | `phoneBlocklist.*` → `phoneBlocklistRouter.ts` | **Settings** — blocklist | **Wired** — inbound checks in `server/_core/index.ts`. |
| **8** | Intelligent escalation | `escalation_rules` | `escalationRules.*` → `escalationRouter.ts` | **Settings** — escalation | **Wired** — keyword → transfer in `voiceRealtimePipeline.ts`. |
| **9** | Zapier | `zapier_webhooks` | `zapier.*` → `zapierRouter.ts`; emits: `server/_core/services/zapierEmit.ts` | **Settings** — Zapier URL/events | **Wired** — `lead.created`, `call.completed` emitted when hooks saved. |
| **10** | CRM sync (SF/HubSpot/Pipedrive) | `crm_connections` | `crm.*` → `crmRouter.ts` | **Settings** — CRM connections | **Connection rows + UI** — provider OAuth and token storage are completed **in your CRM developer console**; ApexAI stores the connection intent. |
| **11** | Workflow builder | `workflows` | `workflows.*` → `workflowRouter.ts`; runner: `server/_core/services/workflowEngine.ts` | **Settings** — “Workflow builder” | **Stored definitions + execution:** on `lead.created`, active workflows run `definition.steps` entries with `{ "type": "http_post", "url": "..." }` (JSON POST with lead payload). |
| **12** | Persistent memory | `customer_memories` | `memory.*` → `memoryRouter.ts` (includes `memory.search`) | **Settings** — Memory | **Wired** — rows shown on live calls via `tenantContextForVoice.ts` (with KB); keyword `memory.search` for admin QA. |
| **13** | Sentiment (product) | `call_recordings.sentiment` | `analytics.sentimentSummary` | **`/analytics`** | **Wired** — heuristic on persist (`sentimentInfer.ts`); not the bundle’s full “real-time emotion API” yet. |
| **14** | Ticketing | `support_tickets` | `tickets.*` → `ticketsRouter.ts` | **Settings** — Tickets | **CRUD wired** in app. |
| **15** | Mobile backend | `mobile_devices` | `mobile.*` → `mobileRouter.ts` | **Settings** — Mobile devices | **Registry wired**; FCM/APNs push requires Apple/Google dev credentials in your environment. |
| **16** | Social | `social_connections` | `social.*` → `socialRouter.ts` | **Settings** — Social | **OAuth + posting** use each network’s developer app — scaffolding and tables are in the repo; finish by adding app keys in Railway. |
| **17** | Email automation | `email_sequences` | `emailSequences.*` → `emailSequencesRouter.ts` + queue | **Settings** — Email sequences | **Wired** — trigger on `lead.created`, Resend queue in `server/_core/index.ts`. |
| **18** | RCS | `rcs_registrations` | `rcs.*` → `rcsRouter.ts` | **Settings** — RCS | **Carrier / Jibe account** (Twilio, Sinch, etc.) — wire credentials in Railway; table + API routes exist. |
| **19** | Webchat | `webchat_widgets` | `webchat.*` + **public** `GET/POST /api/public/webchat/*` (`webchatPublicApi.ts`) | **Settings** — Webchat widgets | **Wired** — embed + lead capture; tests `webchatPublicApi.test.ts`. |
| **20** | Analytics dashboard | `analytics_snapshots` + aggregates | `analytics.dashboardBreakdown`, `recordSnapshot`, etc. | **`/analytics`** — `Analytics.tsx` | **Wired** — charts from tRPC. |

**Router registration (single place to see all namespaces):** `server/routers.ts` → `appRouter` exports `knowledgeBase`, `zapier`, `leadScoring`, … `rcs`.

---

## PART 2: Premium voice agent (5 modules) — where they landed

| Module | Bundle file (reference) | Implementation in *this* repo |
|--------|-------------------------|------------------------------|
| 1 Orchestrator | `01_PREMIUM_VOICE_ORCHESTRATOR.ts` | `server/realtime/realtimeVoiceEngine.ts` + `voiceSessionManager` / session lifecycle |
| 2 Dynamic prompt | `02_DYNAMIC_PROMPT_ENGINE.ts` | `server/realtime/dynamicPrompt.ts` — `buildVoiceSystemPrompt`; `dynamicPrompt.test.ts` |
| 3 Sentiment & emotion | `03_SENTIMENT_AND_EMOTION.ts` | `sentimentInfer.ts` + persist on recordings; tests `sentimentInfer.test.ts` |
| 4 Realtime streaming | `04_REALTIME_STREAMING.ts` | `server/_core/services/voiceRealtimePipeline.ts`; `voice.realtime.test.ts`; Deepgram/Cartesia when keys set |
| 5 Conversion optimization | `05_CONVERSION_OPTIMIZATION.ts` | `analytics.*` + snapshots — partial vs bundle’s full A/B engine |

---

## PART 3: Infrastructure

| Topic | Location |
|-------|----------|
| Background jobs | `server/_core/services/queue.ts`; workers bootstrapped in `server/_core/index.ts` |
| Knowledge base RAG | `knowledgeBaseIngestion.ts` + `tenantContextForVoice.ts`; voice `buildSystemPromptAsync` in `voiceRealtimePipeline.ts` |
| Webhooks (Omni AI lead, etc.) | `server/routers/webhooksRouter.ts`; tests `webhooksRouter.test.ts` |
| Stripe billing (go-live) | `server/_core/services/stripeBilling.ts`; `POST /api/stripe/webhook`; `saas.billing.*`; Settings billing card; env in `server/_core/env.ts` |
| Schema | `drizzle/schema.ts`; migrations `drizzle/*.sql` |

---

## How to prove it yourself (commands)

From repo root (`ApexAI/`):

```bash
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm run build
```

Integration env sanity: `node scripts/verify-integrations.mjs` (checks required env vars including Stripe when configured).

---

## Why you might not have “seen” this before

1. **Evidence lived in** `docs/integration/CROSSWALK.md` — easy to miss if you only open the PDF or the old bundle folder.
2. **Table names differ** from the bundle (`crm_leads` vs `leads`, etc.) — this file maps **your** checklist to **actual** names.
3. **Third-party credentials** (SignalWire, OpenAI embeddings, Stripe, CRM, RCS) are **your** Railway variables — the code paths are wired; the crosswalk names the files.

---

*Generated as the canonical “where is it?” map for the master checklist. Keep in sync when you ship new workers or rename routes.*
