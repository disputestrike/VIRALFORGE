# Voice orchestration roadmap — living crosswalk

**Source:** Master plan (sections A–G) + workstreams WS1–WS12 + implementation phases 0–9.  
**Rule:** Update this file when code changes. Status: **Done** | **Partial** | **Open**.  
**Ops detail:** [`VOICE_OPS_RUNBOOK.md`](./VOICE_OPS_RUNBOOK.md)

---

## Verification (run before release)

| Command | Expected |
|---------|----------|
| `pnpm run check` | `tsc --noEmit` exit 0 |
| `pnpm run test` | All tests pass (see count below) |
| `pnpm run build` | Vite + esbuild `dist/` OK |

**Latest automated check:** `pnpm run verify:quick` + `pnpm run build` — pass; **265** tests (full); `pnpm run test:voice` — **55** tests (`server/realtime/`).

---

## Section A — Inventory (evidence anchor)

| Area | Status | Evidence |
|------|--------|----------|
| SignalWire telephony | Done | `server/_core/index.ts`, `signalwireService.ts`, `realtimeVoiceEngine.ts` |
| Deepgram STT | Done | `realtimeVoiceEngine.ts` (interim/final, endpointing env) |
| Turn-taking behavior | Done | Engine + `turnManager.ts` (floor helpers, silence ladder doc); floor on barge, Cartesia `done`, session |
| Policy / blueprint | Done | `callPolicy.ts`, `apexStrictBlueprint.ts`, `strictController.ts` |
| Grok + Cartesia | Done | `respondVoiceLlm`, Cartesia WS; optional JSON envelope + **emotion** |
| Outbound script path | Done | `outboundCallContext.ts`, worker → `initiateCall` → `/api/voice/start` → session → greeting |
| Metrics persistence | Done | `voice_metric_events`; latency rows; Admin + **p50/p95** |
| Canonical vs experimental path | Done | Comment in `voiceMetrics.ts` |

---

## Section B — Workstreams (WS1–WS12)

| WS | Topic | Status | Notes |
|----|-------|--------|-------|
| WS1 | Timing / silence ladder / p50–p95 | Done | Latency + Admin; ladder in `turnManager.ts` |
| WS2 | Turn manager module | Done | `turnManager.ts` + `TurnPhase` + **`turnManager.test.ts`**; engine holds runtime FSM |
| WS3 | Fast intent (interim) | Done | `fastIntentRouter.ts` + tests |
| WS4 | Unified orchestration state | Done | `callOrchestrationTypes.ts` + session snapshot |
| WS5 | Grok JSON envelope | Done | `voiceResponseEnvelope.ts` + `VOICE_GROK_JSON_ENVELOPE` (opt-in) |
| WS6 | Response rewriter | Done | `speakableLine` + **`rewriteForSpeech`** + **`speakability.test.ts`** |
| WS7 | Cartesia policy packs | Done | Speed + `generation_config.emotion`; `VOICE_CARTESIA_EMOTION` |
| WS8 | Risk / compliance | Done | Opt-out + quiet hours + **tenant blocklist** (`outboundBlocklist.ts`, `VOICE_OUTBOUND_BLOCKLIST_CHECK`) |
| WS9 | Observability dashboard | Done | Admin traces + `voiceMetricLatencySummary` |
| WS10 | Inbound / outbound parity | Done | Direction, script, stash, `blocklistUserId` from worker |
| WS11 | Audio jitter buffer | Done | `VOICE_JITTER_BUFFER_FRAMES` |
| WS12 | Automated test matrix | Done | **55** tests under `server/realtime/` (see list below) |

### Realtime test files

`fastIntentRouter`, `speakability`, `voiceResponseEnvelope`, `outboundCompliance`, `outboundBlocklist`, `outboundCallContext`, `callQueueOutbound`, `turnManager`, `apexStrictBlueprint`, `answerDirectGuard`, `callPolicy`, `dynamicPrompt`, `strictController`

---

## Section C — Phases 0–9 (implementation steps)

| Phase | Step | Status |
|-------|------|--------|
| 0 | Canonical path documented | Done |
| 0 | Gap list (this file) | Done |
| 1 | Outbound script wiring | Done |
| 2 | Persist metrics + Admin | Done |
| 3 | Extract turn manager | Done (pragmatic — helpers + tests; engine owns live state) |
| 4 | Fast intent router + tests | Done |
| 5 | Orchestration state on session | Done |
| 6 | JSON envelope / planner | Done (envelope opt-in; prose default) |
| 7 | Rewriter + Cartesia policy | Done |
| 8 | Compliance | Done (product scope: blocklist + hours + recording + opt-out) |
| 9 | CI smoke + runbook | Done | `VOICE_OPS_RUNBOOK.md`, `scripts/voice-ci-smoke.mjs` |

---

## Section D — Surface map

| Surface | Coverage |
|---------|----------|
| Backend | Engine, webhooks, queue, metrics, session, compliance |
| tRPC | `admin.voiceMetricEvents`, `admin.voiceMetricLatencySummary` |
| Admin | Voice traces tab + latency stats |

---

## Section E — Tests (target matrix)

| Layer | Status |
|-------|--------|
| Queue → script contract | **`callQueueOutbound.test.ts`** |
| Fast intent + opt-out | `fastIntentRouter.test.ts` |
| Envelope | `voiceResponseEnvelope.test.ts` |
| Speakability | `speakability.test.ts` |
| Quiet hours | `outboundCompliance.test.ts` |
| Tenant blocklist | `outboundBlocklist.test.ts` |
| Stash | `outboundCallContext.test.ts` |
| Turn floor helpers | `turnManager.test.ts` |
| Policy / blueprint | `apexStrictBlueprint.test.ts`, etc. |

---

## Section F — Deferred / external (not repo gaps)

These are **product or ops choices**, not missing wiring:

- **Federal/state TCPA campaign registry** — legal/compliance process; use counsel + vendor tools.
- **Dedicated turn FSM microservice** — optional; current engine passes production tests.
- **Load/soak** — run k6/Locust against staging with real SignalWire load profile.
- **JSON-only planner** — enable `VOICE_GROK_JSON_ENVELOPE` + prompt training; prose remains default.

---

## Section G — Maintenance

1. After voice changes: `pnpm run verify:quick` (check + test) or full `pnpm run verify`.
2. Keep **`TZ`** correct for `VOICE_OUTBOUND_ALLOW_HOURS`.
3. If Cartesia returns 400 on `emotion`: **`VOICE_CARTESIA_EMOTION=false`**.

---

## Ops runbook (short)

See **[`VOICE_OPS_RUNBOOK.md`](./VOICE_OPS_RUNBOOK.md)**.

**DB:** apply `drizzle/voice_metric_events.sql` if table missing.
