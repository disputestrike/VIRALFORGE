# Engineering ticket: Voice controller hardening pass (pre–live test batch)

## Summary

Controller-only pass: no new product features, no prompt experiments. Harden conversation control for production voice: sharper replies, less repetition, clean interrupts, gated booking, deterministic routing, structured diagnostics.

## Requirements

1. **Conditional interrupt acknowledgment** — env-driven; short playback → silent stop; longer / mid-utterance / low STT confidence → optional ack (`INTERRUPT_ACK_*`, `VOICE_STT_CONFIDENCE_LOW`).
2. **Deterministic phrase classification** — phrase maps for pressure, objection_staff, recovery, skepticism, chaos; classifier runs before LLM (`apexStrictBlueprint.ts`).
3. **`answered_directly` guard** — `postProcessAssistantResponse` in `answerDirectGuard.ts`; full LLM buffer before TTS in `realtimeVoiceEngine` and `VoiceRealtimePipeline`.
4. **Booking gate** — `canEnterBooking` + explicit phrases + `BOOKING_SCORE_THRESHOLD` + skepticism latch + escalation/recovery checks.
5. **Deterministic copy blocks** — `COPY_BLOCKS` in `apexStrictBlueprint.ts` (app-wide, not vertical-specific).
6. **Response shape** — max 3 sentences, ≤~6s target, one follow-up only when guard passes (prompt + post-process).
7. **Pressure escalation** — L1–L4 copy; L4 ends call via existing `finalizeHard`.
8. **Recovery** — `speak_then_llm`: short reset line + LLM with recovery system hint.
9. **Finals-only + 400ms debounce** — unchanged; debounce cleared on barge with `stale_final_fired` log when applicable.
10. **Structured logging** — `voiceControllerLog.ts` buckets: `missed_intent`, `asked_followup_before_answer`, `interrupt_not_honored`, `spoke_too_long`, `premature_booking`, `classifier_miss`, `recovery_failed`, `repetition_loop`, `stale_final_fired`, `tts_ack_too_talky`.

## Acceptance criteria

| # | Criterion | Evidence |
|---|-----------|----------|
| 1 | Interrupt stops TTS immediately; ack only per policy | `interruptAck.ts`, `scheduleBlueprintInterruptAck`, pipeline `interruptSpeech` |
| 2 | Direct answer before follow-up (heuristic) | `answerDirectGuard.ts`, `streamToCartesia` buffer path |
| 3 | No premature booking under gate | `canEnterBooking`, `premature_booking` log |
| 4 | Pressure L4 ends call | `routeBlueprintDeterministic`, `endCall` + `finalizeHard` |
| 5 | Recovery: reset + LLM | `speak_then_llm`, `recoveryPrefixForLlm` |
| 6 | Logs grepable for test batch | `[VOICE-CTRL]` JSON lines |

## Implementation map

| Area | Files |
|------|--------|
| Policy | `server/realtime/interruptAck.ts`, `server/realtime/answerDirectGuard.ts`, `server/realtime/voiceControllerLog.ts` |
| Blueprint | `server/realtime/apexStrictBlueprint.ts` |
| Telephony | `server/realtime/realtimeVoiceEngine.ts` |
| Pipeline | `server/_core/services/voiceRealtimePipeline.ts` |
| Config | `_core/env.ts` (`INTERRUPT_*`, `VOICE_STT_CONFIDENCE_LOW`, `BOOKING_SCORE_THRESHOLD`) |

## Tests

- `server/realtime/apexStrictBlueprint.test.ts`
- `server/realtime/answerDirectGuard.test.ts`
- Existing `strictController.test.ts` (unchanged contract)

## Pre-test live scenarios (manual)

Run only these before a broad batch: interruption, pressure, recovery, chaos, booking (per product checklist).

## Out of scope (explicit)

Human-realism 10/10, all edge objections, elite sales tone — iterate after structured logs from this pass.

## Related

- [Compliance matrix — delivery & presence pass](VOICE_CONTROLLER_COMPLIANCE_MATRIX.md)
