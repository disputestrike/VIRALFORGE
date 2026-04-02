# Voice controller — compliance matrix & crosswalk (delivery + presence pass)

**Scope:** Gaps 1–8 (tone hardening, pressure copy, recovery, booking tone, answer quality, mode tone, interrupt presence, over-questioning).  
**Status:** Implemented and cross-walked to code.

| # | Requirement | Implementation | Verification |
|---|-------------|----------------|--------------|
| G1 | No softening filler; assertive phrasing; first sentence ≤12 words punch | `buildApexBlueprintPromptBlock` — RULE lines + FIRST SENTENCE PUNCH | `apexStrictBlueprint.ts` |
| G1b | Compress softeners in guard | `compressAssertive` + `SOFTENERS` | `answerDirectGuard.ts` |
| G2 | Pressure L1–L4 copy (aggressive, exit L4) | `COPY_BLOCKS.pressure_level_*` | `apexStrictBlueprint.ts` + tests |
| G3 | Recovery: acknowledge → reset → control to user | `COPY_BLOCKS.recovery_controlled` + speak / speak_then_llm | `routeBlueprintDeterministic` |
| G4 | Booking: continuation, assumptive | `COPY_BLOCKS.booking` | Deterministic booking route |
| G5 | Answer quality: core question + concrete outcome | `isAnswerSufficient`, `answersCoreQuestion`, `includesConcreteOutcome` | `answerDirectGuard.ts` |
| G6 | Mode-specific voice | `TONE_PROFILE` + `toneProfileLine` in prompt | `apexStrictBlueprint.ts` |
| G7 | Silence confidence (short interrupt + non-low STT → no ack) | `computeInterruptAck` + `speechMs < MIN && !low` | `interruptAck.ts` |
| G8 | Max 1 question/turn; skeptic → 0 questions | Prompt rules + `skepticismLatch` / intent | `buildApexBlueprintPromptBlock` |

## Crosswalk — env vars

| Variable | Purpose |
|----------|---------|
| `INTERRUPT_ACK_*` | Ack policy |
| `VOICE_STT_CONFIDENCE_LOW` | Low-confidence finals |
| `VOICE_STT_CONFIDENCE_HIGH` | Documented ceiling for “high confidence” STT (tuning / logging) |
| `BOOKING_SCORE_THRESHOLD` | Soft booking gate |

## Proof of work

- `npx tsc --noEmit`
- `npx vitest run server/realtime/apexStrictBlueprint.test.ts server/realtime/answerDirectGuard.test.ts`

## Manual retest (same batch)

Pressure, interrupt, recovery, booking — compare transcripts + `[VOICE-CTRL]` logs.
