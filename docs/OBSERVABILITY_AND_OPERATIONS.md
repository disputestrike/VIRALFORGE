# Observability and Operations

## Health checks

- Railway health check path: `/api/health`.
- Health response is implemented in `server/_core/index.ts`.
- tRPC system health exists through `server/_core/systemRouter.ts`.

## Operational reports

- Release report: `docs/internal/WAVE_COMPLETION_REPORT.md`.
- Railway deployment docs: `RAILWAY_DEPLOY.md`, `RAILWAY_ENV_VARS.md`.
- Integration readiness script: `scripts/verify-integrations.mjs`.
- Strict integration script: `scripts/verify-integrations-strict.mjs`.

## Logging

Startup logs feature-flag readiness for database, queue, auth, voice/SMS, email, STT, TTS, and AI/LLM. Logs should remain operational and should not disclose secret values.

## Release operations

Use `pnpm run release:gate` for the wave completion gate. Use `pnpm run verify` for typecheck, tests, build, and integration readiness.
