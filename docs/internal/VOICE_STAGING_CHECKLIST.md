# Voice staging checklist (pre-production / release gate)

Use after deploy to **staging** or before a major **production** cut. Automated proof does not replace a real PSTN call.

**Companion docs:** [`VOICE_OPS_RUNBOOK.md`](./VOICE_OPS_RUNBOOK.md) · [`VOICE_ORCHESTRATION_ROADMAP.md`](./VOICE_ORCHESTRATION_ROADMAP.md) · [`../integration/VOICE_COMPLIANCE_MATRIX.md`](../integration/VOICE_COMPLIANCE_MATRIX.md) (manual scenarios §12)

---

## 1. Automated (local or CI)

| Step | Command | Pass |
|------|---------|------|
| Types | `pnpm run check` | Exit 0 |
| Tests | `pnpm run test` | All green |
| Voice slice | `pnpm run test:voice` | All green |
| Full gate | `pnpm run verify` | check + test + build + `verify-integrations.mjs` |
| Strict integrations only | `pnpm run verify:integrations:strict` | Fails if any integration env **group** is incomplete (run locally with Railway `.env`) |
| Strict env (full) | Set `VERIFY_STRICT=1` then run `node scripts/verify-integrations.mjs` before release | Same as above |

Record counts in [`CROSSWALK.md`](../integration/CROSSWALK.md) verification log when you cut a release.

---

## 2. Database (staging MySQL)

- [ ] Migrations through latest (`0011` … `0021_ab_testing.sql`, plus `voice_metric_events` if using persisted traces).
- [ ] `DATABASE_URL` / `TZ` set on the host (quiet hours / business logic).

---

## 3. Environment (voice path)

Minimum for **live** streaming path per [`ARCHITECTURE.md`](../ARCHITECTURE.md):

- [ ] `DEEPGRAM_API_KEY`
- [ ] `CEREBRAS_API_KEY` (streaming `respondVoiceLlm` uses Cerebras OpenAI-compatible API)
- [ ] `CARTESIA_API_KEY`
- [ ] SignalWire: `SIGNALWIRE_PROJECT_ID`, `SIGNALWIRE_TOKEN`, space URL, from-number as configured

Optional / fallback: `ANTHROPIC_API_KEY`, `GROQ_API_KEY`, `ELEVENLABS_API_KEY`, `LLM_PROVIDER`.

---

## 4. Live call smoke (staging number)

- [ ] **Inbound:** dial staging DID → greeting → one exchange → hangup; no stall after greeting (Deepgram **keyterm** config live on server).
- [ ] **Barge-in:** interrupt assistant mid-utterance → TTS stops.
- [ ] **Outbound (if used):** queue/worker → dial → script/greeting; blocklist + quiet hours behave as expected (`VOICE_OUTBOUND_*`).
- [ ] **Admin:** Voice traces / latency rows appear when `VOICE_METRICS_PERSIST` is on.
- [ ] **A/B (if used):** create variant via `abTesting.create`; confirm `[AB] Variant selected` in logs for a new `callId`.

---

## 5. Manual compliance samples

Run at least **3** scenarios from `VOICE_COMPLIANCE_MATRIX.md` §12; keep **recordings + log slice** with matching `callId`.

---

## Sign-off

| Role | Name | Date |
|------|------|------|
| Engineering | | |
| Ops / product | | |
