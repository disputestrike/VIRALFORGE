# Tenant Onboarding Guide

## Flow

1. User signs in through `/login`.
2. App checks setup status and redirects to `/onboarding` when setup is incomplete.
3. User configures business/workspace details.
4. User lands in `/dashboard`.
5. User adds leads, campaigns, messaging templates, voice settings, and integrations.

## Tenant Must Configure

- Business identity and industry context.
- Calling/messaging settings.
- Calendar and CRM integrations when needed.
- Provider credentials or platform-managed credentials where applicable.

## Platform Must Configure

- Railway `DATABASE_URL`.
- Railway `REDIS_URL`.
- Auth/session secrets.
- SignalWire, Deepgram, Cerebras, Cartesia/ElevenLabs, Resend, Stripe, and CRM OAuth credentials as needed.

## First-Day Checklist

- Login works.
- Onboarding saves.
- Lead creation persists.
- Campaign/message action queues.
- Redis queue is active in production.
- Provider smoke test succeeds for enabled channels.
