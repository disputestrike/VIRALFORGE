# API and Integration Map

## API entrypoints

- Express REST/webhook routes in `server/_core/index.ts`
- tRPC API mounted at `/api/trpc`
- Public webchat routes in `server/_core/webchatPublicApi.ts`
- OAuth routes in `server/_core/oauth.ts`
- CRM and provider routers under `server/routers/`

## External systems

- Railway for deployment.
- MySQL-compatible database through `DATABASE_URL`.
- Redis/BullMQ through `REDIS_URL`.
- SignalWire-compatible voice/SMS provider.
- Deepgram-compatible streaming STT.
- Configured LLM provider through server env.
- Cartesia/ElevenLabs-compatible TTS.
- Resend-compatible email.
- Google OAuth/Calendar where configured.
- HubSpot, Salesforce, and Pipedrive connectors where configured.
- Stripe billing where configured.

## Public communication rule

Frontend copy should communicate outcomes and capabilities. Backend provider names, keys, deployment internals, and operational wiring should remain in internal docs/admin screens rather than user marketing surfaces.
