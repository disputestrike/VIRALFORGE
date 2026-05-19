# Product Overview

ApexAI is the active product in this repository. The codebase is a production-oriented voice, messaging, CRM, campaign, analytics, and automation platform with a React/Vite frontend and an Express/tRPC backend.

## Core value

- Run AI-assisted voice and messaging workflows.
- Manage leads, campaigns, templates, appointments, analytics, agency/client workspaces, knowledge bases, workflows, and integrations.
- Support live voice calls through telephony webhooks and a realtime voice engine.
- Persist tenant data in MySQL through Drizzle migrations.
- Use Redis/BullMQ for durable call, SMS, and email job processing when `REDIS_URL` is configured.

## Product surfaces

Public surfaces include landing, login, about, platform, solutions, resources, pricing, privacy, terms, security, viral/OmniPulse preview, and public demo routes.

Authenticated app surfaces include dashboard, leads, campaigns, appointments, voice AI, messages, templates, analytics, onboarding, admin, settings, agency, knowledge base, workflows, integrations, and OmniPulse.

## MVP preservation rule

The Diamond pass does not remove or rewrite the MVP. It documents the deployable path, records working gates, and flags external dependencies that must be configured on Railway for full production behavior.
