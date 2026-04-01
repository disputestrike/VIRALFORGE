# Master checklist → ApexAI repo evidence (how to find & verify)

This document maps **your master checklist** (20 features + voice + site) to **this repository**. **Every checklist item is a required deliverable** — the tables below show **where it lives** and **what still depends on third-party accounts** (SignalWire, Stripe, Meta, carriers, etc.), not “optional product ideas.”

Your deliverable bundle (`02_TRPC_ROUTERS_PART1.ts`, etc.) is **reference material**. The **running implementation** is under `server/`, `client/`, and `drizzle/`.

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

Legend: **DB** = Drizzle + `drizzle/*.sql` | **API** = tRPC namespace | **UI** = primary screen | **Notes** = in-repo behavior + external credentials if any.

| # | Your checklist name | DB (actual tables) | Backend API (`server/routers/…`) | Frontend / admin | Notes |
|---|----------------------|-------------------|----------------------------------|------------------|--------|
| **1** | Dedicated phone number management | `user_phone_numbers` | `settings.listPhoneNumbers`, `setPhoneNumberActive`; `onboarding.provisionNumber` in `server/routers.ts` | **Settings** — “Dedicated phone numbers” card | **In app.** Live provisioning uses **SignalWire** (Railway env). |
| **2** | Knowledge base (crawl + documents + embeddings + branding) | `knowledge_bases` (+ `brandProfile`), `knowledge_base_sources`, `knowledge_base_chunks` | `knowledgeBase.*` → `knowledgeBaseRouter.ts`; `knowledgeBaseIngestion.ts` | **Settings** — website, **PDF URL**, **text URL**, **PDF upload**, **brand panel**, search test | **In app:** website **+ og/meta branding** → `brandProfile`; `pdf`/`txt` URLs; **multipart** `/api/knowledge-base/upload`; chunks + voice RAG. **OPENAI_API_KEY** for embeddings. |
| **3** | Built-in CRM / lead capture | `leads` (+ `createdBy`) | `leads.*` in `server/routers.ts` | **`/leads`** — `Leads.tsx` | **In app.** |
| **4** | Call summaries | `call_recordings` + `aiSummary` | `callSummaryService` + voice session persist | Voice AI → recordings / summary dialog | **In app** when LLM + session end path runs (**Cerebras** / env). |
| **5** | Lead scoring | `lead_scoring_rules` | `leadScoring.*` → `server/routers/leadScoringRouter.ts` | **Settings** — “Lead scoring (bonus)” | **In app** — rules on `leads.create`. |
| **6** | Multiple voice options | `system_config` + `voiceProfiles` catalog | `settings.voiceProfiles`, `settings.update` (`voiceProfileId`) | **Settings** — voice profile selector | **In app** — **Cartesia**. |
| **7** | Spam filtering | `blocked_phone_numbers` | `phoneBlocklist.*` → `phoneBlocklistRouter.ts` | **Settings** — blocklist | **In app** — inbound filter in `server/_core/index.ts`. |
| **8** | Intelligent escalation | `escalation_rules` | `escalationRules.*` → `escalationRouter.ts` | **Settings** — escalation | **In app** — **SignalWire** transfer in `voiceRealtimePipeline.ts`. |
| **9** | Zapier | `zapier_webhooks` | `zapier.*` → `zapierRouter.ts`; `zapierEmit.ts` | **Settings** — Zapier URL/events | **In app** — `lead.created`, `call.completed`. |
| **10** | CRM sync (SF/HubSpot/Pipedrive) | `crm_connections` | `crm.*` → `crmRouter.ts` | **Settings** — CRM connections | **In app:** connection rows + UI. **Full OAuth + sync** requires **each vendor’s developer app + tokens** in your environment (not something you can ship without those accounts). |
| **11** | Workflow builder | `workflows` | `workflowRouter.ts` + `workflowEngine.ts` | **Settings** — “Workflow builder” | **In app:** `lead.created` runs `definition.steps` with `http_post` URLs. Visual canvas beyond JSON is **UI depth**, not missing server execution. |
| **12** | Persistent memory | `customer_memories` | `memory.*` → `memoryRouter.ts` (`memory.search`) | **Settings** — Memory | **In app** — voice context via `tenantContextForVoice.ts`. |
| **13** | Sentiment analysis | `call_recordings.sentiment` | `analytics.sentimentSummary` | **`/analytics`** | **In app** — heuristic on persist; full **bundle** “real-time emotion per utterance” would add more LLM calls (can extend). |
| **14** | Ticketing | `support_tickets` | `tickets.*` → `ticketsRouter.ts` | **Settings** — Tickets | **In app** — CRUD. |
| **15** | Mobile app backend | `mobile_devices` | `mobile.*` → `mobileRouter.ts` | **Settings** — Mobile devices | **In app:** registry. **Push delivery** needs **FCM/APNs** keys in your env. |
| **16** | Social media integration | `social_connections` | `social.*` → `socialRouter.ts` | **Settings** — Social | **In app:** scaffolding. **Live posting** needs **Meta/Telegram/etc. app credentials**. |
| **17** | Email automation | `email_sequences` | `emailSequences.*` + queue | **Settings** — Email sequences | **In app** — **Resend** + `lead.created`. |
| **18** | RCS messaging | `rcs_registrations` | `rcs.*` → `rcsRouter.ts` | **Settings** — RCS | **In app:** routes + tables. **Send path** needs **carrier / Twilio / Sinch** RCS product. |
| **19** | Webchat | `webchat_widgets` | `webchat.*` + `/api/public/webchat/*` | **Settings** — Webchat widgets | **In app** — embed + lead capture; tests `webchatPublicApi.test.ts`. |
| **20** | Analytics dashboard | `analytics_snapshots` + aggregates | `analytics.dashboardBreakdown`, `recordSnapshot`, etc. | **`/analytics`** — `Analytics.tsx` | **In app.** |

**Router registration:** `server/routers.ts` → `appRouter`.

---

## PART 2: Premium voice agent (5 modules) — where they landed

| Module | Bundle file (reference) | Implementation in *this* repo |
|--------|-------------------------|------------------------------|
| 1 Orchestrator | `01_PREMIUM_VOICE_ORCHESTRATOR.ts` | `server/realtime/realtimeVoiceEngine.ts` + `voiceSessionManager` |
| 2 Dynamic prompt | `02_DYNAMIC_PROMPT_ENGINE.ts` | `server/realtime/dynamicPrompt.ts` — `buildVoiceSystemPrompt`; `dynamicPrompt.test.ts` |
| 3 Sentiment & emotion | `03_SENTIMENT_AND_EMOTION.ts` | `sentimentInfer.ts` + persist; `sentimentInfer.test.ts` |
| 4 Realtime streaming | `04_REALTIME_STREAMING.ts` | `voiceRealtimePipeline.ts`; `voice.realtime.test.ts`; Deepgram/Cartesia when keys set |
| 5 Conversion optimization | `05_CONVERSION_OPTIMIZATION.ts` | `analytics.*` + snapshots — bundle A/B engine can extend on top |

---

## PART 3: Infrastructure

| Topic | Location |
|-------|----------|
| Background jobs | `server/_core/services/queue.ts`; workers in `server/_core/index.ts` |
| Knowledge base RAG + branding | `knowledgeBaseIngestion.ts` + `tenantContextForVoice.ts` + `voiceRealtimePipeline.ts` |
| Webhooks | `server/routers/webhooksRouter.ts`; tests `webhooksRouter.test.ts` |
| Stripe billing | `stripeBilling.ts`; `POST /api/stripe/webhook`; `saas.billing.*`; Settings; `server/_core/env.ts` |
| Schema | `drizzle/schema.ts`; migrations `drizzle/*.sql` |

---

## How to prove it yourself (commands)

From repo root (`ApexAI/`):

```bash
pnpm exec tsc --noEmit
pnpm exec vitest run
pnpm run build
```

Integration env sanity: `node scripts/verify-integrations.mjs`.

---

## Third-party credentials (required for *live* vendor features — not “optional features”)

These are **external accounts** you must configure in **Railway** (or your host): SignalWire, `OPENAI_API_KEY`, Deepgram, Cartesia, Cerebras, Resend, Stripe, CRM OAuth apps, RCS carrier, FCM/APNs, social app keys. **The app code exposes the integration points**; keys are your deployment responsibility.

---

*This file is the canonical “where is it?” map for the master checklist. Keep in sync when routes or migrations change.*
