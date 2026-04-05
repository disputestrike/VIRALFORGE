# ApexAI Architecture

## System Overview
```
Caller → SignalWire → ApexAI Server → WebSocket → AI Pipeline
                                   ↓
                              Database (MySQL)
                              Redis (BullMQ)
                              Resend (Email)
```

## AI Voice Pipeline — Live Realtime Path
```
1. Caller dials SignalWire number
2. SignalWire hits POST /api/voice/start
3. Server returns TwiML <Connect><Stream> XML
4. SignalWire opens WebSocket to /api/voice-stream
5. Bidirectional μ-law 8kHz audio flows over WebSocket

   INBOUND (speech → text):
   mulaw 8kHz → Deepgram Nova-3 Streaming STT (WebSocket)
              → speech_final event → transcript text
              → Optional PII redaction (VOICE_DEEPGRAM_REDACT=true)

   PROCESSING (text → response text, streaming):
   transcript → Groq (OpenAI-compatible API, token streaming, GROQ_API_KEY / GROQ_MODEL)
              → Token stream → sentence splitter → clause-by-clause

   OUTBOUND (text → speech → caller):
   clause → Cartesia Sonic WebSocket TTS (pcm_s16le, 8kHz)
           → pcm16ToMulaw() conversion
           → SignalWire media stream → caller audio
           → Fallback: ElevenLabs TTS (ELEVENLABS_API_KEY)

   BARGE-IN:
   Inbound μ-law energy > threshold → cancel Cartesia context
   → clear SignalWire buffer → new generation epoch

   OPENING LINE:
   Inbound/outbound first TTS line is chosen from rotated templates (`voiceOpeningLines.ts`) keyed by session + vertical label — not one frozen “thanks for calling…” string. LLM prompt forbids duplicating that audio greeting on turn one.

6. End-of-call: finalize session, persist to MySQL, notify owner
```

## AI Voice Pipeline — Batch/Processing Path
```
Audio buffer → Deepgram REST pre-recorded (nova-3)
             → LLM Router (Groq / Claude)
             → Cartesia batch REST TTS (sonic-2, pcm_mulaw)
```

## LLM Provider Abstraction
```
Provider selection: LLM_PROVIDER env var
  groq       (default) — llama-3.1-8b-instant (OpenAI-compatible Groq API)
  anthropic  — claude-3-5-haiku (complex reasoning when ANTHROPIC_API_KEY set)
  Legacy LLM_PROVIDER=cerebras is treated as groq.

Routing heuristics (chooseRoute):
  "fast"  — short utterances, no objections
  "smart" — objections, complex questions, emotional cues
```

## STT Configuration
```
Primary: Deepgram Nova-3 (VOICE_DEEPGRAM_MODEL=nova-3)
  - WebSocket streaming, μ-law 8kHz
  - Interim results for fast intent (barge-in pre-detection)
  - speech_final for authoritative turn boundary
  - Optional PII redaction: VOICE_DEEPGRAM_REDACT=true
  - Optional smart format: VOICE_DEEPGRAM_SMART_FORMAT=true
  - Optional utterance_end: VOICE_DEEPGRAM_USE_UTTERANCE_END=true
  - Multilingual code-switching supported (Nova-3)

Fallback: OpenAI Whisper batch (OPENAI_API_KEY)
```

## TTS Configuration
```
Primary: Cartesia Sonic
  - Streaming: sonic-english (WebSocket, Cartesia-Version: 2024-11-13)
  - Batch: sonic-2 (REST, Cartesia-Version: 2024-11-13)
  - Voice ID: CARTESIA_VOICE_ID (default: Sarah 694f9389...)
  - Emotion control: VOICE_CARTESIA_EMOTION=true

Secondary: ElevenLabs (ELEVENLABS_API_KEY)
  - Activated when Cartesia unavailable or TTS_PROVIDER=elevenlabs
  - Model: eleven_turbo_v2 (low-latency)
```

## Multi-Tenant Architecture
```
User A ─── createdBy=A ─── Leads A, Campaigns A, Messages A
User B ─── createdBy=B ─── Leads B, Campaigns B, Messages B
(no cross-contamination)
```

## Phone Number Ownership
```
user_phone_numbers table:
  userId=1 → +18336596005
  userId=2 → +1XXXXXXXXXX (provisioned on signup)

Inbound call to +1XXXXXXXXXX:
  → getUserIdByPhoneNumber(+1XXXXXXXXXX) → userId=2
  → lead.createdBy = 2
  → appears only in User 2's dashboard
```

## Industry Pack System
```
Canonical packs + universal fallback:
  server/_core/services/domainPacks.ts — resolveDomainPack(), curated verticals + any unknown industry

Per-tenant voice domain (Settings UI → users table):
  primaryIndustryLabel, voiceIndustryContext, voiceKeyPhrases, voiceRestrictionNotes

user_industry_packs:
  userId=1, industry=solar, isPrimary=true
  userId=1, industry=hvac, isPrimary=false (addon)

Blueprint mapping doc:
  docs/integration/UNIVERSAL_BLUEPRINT_CROSSWALK.md
```

## Worker Queue Architecture
```
BullMQ + Redis:
  calls queue → Call Worker → SignalWire API
  sms queue   → SMS Worker  → SignalWire API
  email queue → Email Worker → Resend API
```

## Key Environment Variables
```
# Telephony
SIGNALWIRE_PROJECT_ID, SIGNALWIRE_TOKEN, SIGNALWIRE_SPACE_URL, SIGNALWIRE_PHONE_NUMBER

# STT
DEEPGRAM_API_KEY
VOICE_DEEPGRAM_MODEL=nova-3           # nova-3 | nova-2-phonecall
VOICE_DEEPGRAM_REDACT=true            # PII redaction

# LLM
GROQ_API_KEY                          # Required for live voice + invokeLLM
GROQ_MODEL=llama-3.1-8b-instant
ANTHROPIC_API_KEY                     # Optional: router “smart” route + fallback
LLM_PROVIDER=groq                     # groq | anthropic (cerebras → groq)

# TTS
CARTESIA_API_KEY                      # Primary TTS
CARTESIA_VOICE_ID                     # Voice ID override
ELEVENLABS_API_KEY                    # Secondary TTS
TTS_PROVIDER=cartesia                 # cartesia | elevenlabs

# Core
DATABASE_URL, REDIS_URL, JWT_SECRET
RAILWAY_PUBLIC_DOMAIN                 # for SignalWire callbacks
```

## Latency Budget (Target: sub-700ms end-to-end)
```
Deepgram STT:    ~100–200ms (streaming, speech_final)
Groq LLM:        ~150–300ms (first token streaming, model-dependent)
Cartesia TTS:    ~80–150ms  (first audio chunk)
Network + μ-law: ~50–100ms
Total target:    ≤ 700ms
```

## Release verification

- **Automated:** `pnpm run verify` (Typecheck, full tests, production build, integration env script).
- **Staging voice / DB / env:** [`internal/VOICE_STAGING_CHECKLIST.md`](internal/VOICE_STAGING_CHECKLIST.md) · compliance manual scenarios: [`integration/VOICE_COMPLIANCE_MATRIX.md`](integration/VOICE_COMPLIANCE_MATRIX.md) §12.
