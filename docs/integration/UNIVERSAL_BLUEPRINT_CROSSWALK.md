# Universal Voice Blueprint ↔ Apex Implementation

This document maps the **Universal Conversational System** blueprint to **what Apex runs in production**, using **SignalWire**, **Deepgram**, **Groq**, **Cartesia** (and optional **ElevenLabs**), not Twilio-only or OpenAI Realtime as primary paths.

## Telephony

| Blueprint | Apex |
|-----------|------|
| Twilio Programmable Voice + Media Streams | **SignalWire** — TwiML-compatible `<Connect><Stream>` to `wss://…/api/voice-stream` |
| X-Twilio-Signature | SignalWire-compatible request signing (middleware name retained for Twilio-compatible API) |

## Audio pipeline

| Module | Apex |
|--------|------|
| ASR (e.g. Deepgram Flux) | **Deepgram** streaming — default **nova-3** / `VOICE_DEEPGRAM_MODEL`; endpointing + optional VAD (`realtimeVoiceEngine.ts`, `sttService.ts`) |
| LLM / Realtime API | **Groq** (`GROQ_API_KEY`, `GROQ_MODEL`, default `llama-3.1-8b-instant`) + **Anthropic** via router for batch/smart routes — not OpenAI Realtime |
| TTS (e.g. ElevenLabs Flash) | **Cartesia** Sonic WebSocket (live) + REST; **ElevenLabs** `eleven_turbo_v2` optional (`ttsService.ts`) |

## Domain packs & any industry

- **Canonical logic:** `server/_core/services/domainPacks.ts` — `resolveDomainPack()`, `CURATED_DOMAIN_PACKS`, **universal fallback** for unknown slugs.
- **Per-tenant fields (MySQL `users`):** `primaryIndustryLabel`, `voiceIndustryContext`, `voiceKeyPhrases`, `voiceRestrictionNotes` — edited in **Settings → Voice AI — your industry & domain** and applied on WebSocket connect (`server/_core/index.ts` → `createCallEngine`).
- **Voice prompts:** `formatDomainPackForVoicePrompt()` is injected in `buildVoiceSystemPrompt` (`dynamicPrompt.ts`).

## Conversation modes (blueprint ↔ code)

Blueprint “modes” map to `ConversationMode` in `callPolicy.ts` via `blueprintPhaseToConversationMode()` (e.g. `value_delivery` → `recommend`, `escalation` → `handoff`).

## Deprecated alternate path

`server/realtime/deepgramVoiceAgent.ts` — **not wired** on `/api/voice-stream`. Production uses `realtimeVoiceEngine.ts` only.

## SLO / metrics

Turn latency tracing: `server/realtime/voiceMetrics.ts`, phase `latency_stt_final_to_tts_first`, VAQS crosswalk tests in `vaqsEngineering.test.ts`.

## Proof checklist (for QA)

1. `pnpm run check` — TypeScript  
2. `pnpm run test` — includes `domainPacks.test.ts`, `callPolicy.test.ts`, `dynamicPrompt.test.ts`  
3. DB migrations — `ALTER TABLE users` for voice columns on server boot (`server/_core/index.ts`)
