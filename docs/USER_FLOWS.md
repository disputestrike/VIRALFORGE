# User Flows

## Visitor flow

1. Visitor lands on `/`.
2. Visitor explores product pages: `/about`, `/platform`, `/pricing`, `/privacy`, `/resources`, `/security`, `/solutions`, `/terms`.
3. Visitor signs in through `/login`.
4. If authenticated and setup is incomplete, the app redirects to `/onboarding`; otherwise it redirects to `/dashboard`.

## Operator flow

1. Operator opens `/dashboard`.
2. Operator manages leads, campaigns, messages, templates, analytics, voice AI, appointments, settings, agency, knowledge base, workflows, and integrations.
3. Operator launches calls/messages through protected tRPC mutations.
4. Background queue and workers handle outbound execution when Redis is configured.

## Voice call flow

1. Telephony provider calls `POST /api/voice/start` or `POST /api/voice/inbound`.
2. Server returns voice XML with a media stream URL.
3. Realtime engine receives audio on `/api/voice-stream`.
4. STT, LLM, and TTS services produce a voice response.
5. Call status, recordings, transcripts, metrics, and summaries are persisted when the relevant env and schema are present.

## Integration flow

1. Admin configures Railway env variables.
2. OAuth and CRM callbacks receive provider responses.
3. Webhook endpoints validate signatures/secrets where implemented.
4. Internal readiness checks surface missing provider groups without exposing secret values.
