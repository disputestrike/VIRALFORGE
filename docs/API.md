# ApexAI API Documentation

## Authentication
All API calls require authentication via session cookie (Google OAuth).

## Voice Webhooks (SignalWire)

### POST /api/voice/start
Called by SignalWire when an inbound call arrives.
- Returns cXML with `<Connect><Stream>` for WebSocket audio
- Auto-creates lead from caller's number
- Tags lead to account owner of the called number

### WebSocket /api/voice-stream
Bidirectional audio stream.
- SignalWire sends `start`, `media`, `mark`, `stop` events
- Server sends AI audio responses back
- Pipeline: mulaw → Whisper STT → Claude LLM → Cartesia TTS → mulaw

### POST /api/voice/status
Call status callbacks from SignalWire.

### POST /api/sms/inbound
Inbound SMS from SignalWire.
- Auto-creates lead from sender's number
- Saves message to DB

## tRPC API (Authenticated)

### Leads
- `leads.list` — List user's leads with filters
- `leads.create` — Create a lead
- `leads.delete` — Delete a lead
- `leads.aiSearch` — Natural language lead search
- `leads.verify` — Verify lead contact info
- `leads.importBulk` — Bulk CSV import

### Campaigns
- `campaigns.list` — List user's campaigns
- `campaigns.create` — Create campaign
- `campaigns.launch` — Start campaign
- `campaigns.pause` — Pause campaign
- `campaigns.delete` — Archive campaign

### Voice AI
- `voiceAI.initiateCall` — Trigger outbound call
- `voiceAI.generateScript` — AI script generation
- `voiceAI.listCallRecordings` — Call history

### Onboarding
- `onboarding.provisionNumber` — Buy SignalWire phone number
- `onboarding.create` — Create onboarding record
- `onboarding.updateStep` — Mark step complete

## Environment Variables
```
DATABASE_URL          — MySQL connection string
REDIS_URL             — Redis connection string
JWT_SECRET            — Session signing key
GOOGLE_CLIENT_ID      — OAuth client ID
GOOGLE_CLIENT_SECRET  — OAuth secret
SIGNALWIRE_PROJECT_ID — SignalWire project
SIGNALWIRE_TOKEN      — SignalWire API token
SIGNALWIRE_SPACE_URL  — SignalWire space URL
SIGNALWIRE_PHONE_NUMBER — Main phone number
OPENAI_API_KEY        — Whisper STT
ANTHROPIC_API_KEY     — Claude LLM
CARTESIA_API_KEY      — Cartesia TTS
RESEND_API_KEY        — Email delivery
```
