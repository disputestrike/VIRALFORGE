# Voice ops runbook

## Prerequisites

- MySQL: apply `drizzle/voice_metric_events.sql` if `voice_metric_events` is missing.
- **Set `TZ`** on the host for correct quiet hours and business logic (e.g. `America/Chicago`).

## Environment variables

| Variable | Default | Effect |
|----------|---------|--------|
| `VOICE_METRICS_PERSIST` | (on) | Set `false` to skip DB trace inserts. |
| `VOICE_COMPLIANCE_RECORDING_NOTICE` | off | `true` → recording disclosure path on new sessions. |
| `VOICE_OUTBOUND_ALLOW_HOURS` | (empty) | e.g. `8-21` or overnight `22-6`. Empty = dial any time. |
| `VOICE_OUTBOUND_BLOCKLIST_CHECK` | on | `false` = do not block outbound to numbers on tenant **phone blocklist**. |
| `VOICE_JITTER_BUFFER_FRAMES` | `0` | Inbound μ-law frames queued before Deepgram; adds ~20ms×N latency. |
| `VOICE_GROK_JSON_ENVELOPE` | off | `true` → parse `{"spoken_text":"..."}` from Grok for TTS. |
| `VOICE_CARTESIA_EMOTION` | on | Set `false` if `generation_config.emotion` causes API errors. |
| `VOICE_DEEPGRAM_ENDPOINTING_MS` | `250` | End-of-utterance sensitivity. |
| `VOICE_RESPONSE_MICRO_PAUSE_MS` | `275` | Delay after STT final before LLM. |
| `VOICE_TTS_SPEED_SCALE` | `1.0` | Scales Cartesia speed. |

## Smoke checks

1. `pnpm exec vitest run server/realtime/*.test.ts` (or full suite).
2. `pnpm run build`
3. Place one test inbound call; confirm Admin → Voice traces shows rows and latency stats after STT→TTS.

## Rollback

- Disable new behavior: `VOICE_CARTESIA_EMOTION=false`, `VOICE_JITTER_BUFFER_FRAMES=0`, unset `VOICE_OUTBOUND_ALLOW_HOURS`.
