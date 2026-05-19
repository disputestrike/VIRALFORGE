# Backend Route Map

## Express routes

Source: `server/_core/index.ts`.

- `GET /api/voice/ring-tone.wav`
- `GET /api/health`
- `POST /api/e2e-test`
- `POST /api/voice/start`
- `POST /api/voice/status`
- `POST /api/voice/process-recording`
- `POST /api/voice/transcription`
- `POST /api/voice/recording`
- `POST /api/voice/inbound`
- `POST /api/voice/inbound-dtmf`
- `POST /api/voice/voicemail-received`
- `POST /api/voice/queue-wait`
- `POST /api/voice/amd-status`
- `POST /api/voice/transfer`
- `POST /api/knowledge-base/upload`
- `POST /api/extract/document`
- `POST /api/sms/inbound`
- `GET /api/crm/callback`
- `GET /api/auth/gcal/callback`
- `POST /api/admin/force-migrate`

## tRPC routers

Primary router source: `server/routers.ts`.

Detected router exports:

- `appRouter`

Additional router files exist under `server/routers/` for CRM, workflows, webhooks, knowledge base, lead scoring, social, mobile, tickets, webchat, and related domains.

## Auth model

Protected tRPC procedures use the server context user. Admin procedure checks owner/admin authorization before exposing administrative operations.
