# Diamond Fix Prompt Handoff

Generated: 2026-05-19

## Baseline

- Branch: `main`
- Safety tag: `mvp-baseline-20260519-151235`
- Evidence folder: `docs/diamond/evidence/20260519-151235`
- TypeScript: PASS (`pnpm run check`)
- Tests: PASS (`pnpm run test`, 48 files, 441 tests)
- Build: PASS on final rerun (`BUILD_EXIT=0`)
- Release gate: APPROVED in `docs/internal/WAVE_COMPLETION_REPORT.md`
- Integration readiness: local shell missing provider and Railway env groups

## What Is Working Locally

- React/Vite app routes are wired in `client/src/App.tsx`.
- Server starts from `server/_core/index.ts` and binds to `process.env.PORT` in production.
- `/api/health` exists as a liveness endpoint.
- tRPC protected/admin procedure gates exist.
- Core server tests cover auth, leads, campaigns, templates, analytics, onboarding, admin/security, queue fallback, and voice guardrails.

## Fixes Applied In This Pass

1. Removed the standalone email worker's Redis localhost fallback. Production now depends on `REDIS_URL` instead of silently targeting `redis://localhost:6379`.
2. Changed fatal startup errors to log and `process.exit(1)`, so Railway can restart or fail the deployment clearly.
3. Updated go-live, Railway, known-risks, testing, and certification docs to match current evidence instead of stale `20260519-1456` evidence.

## Master Repair Plan

### P0 Blockers

- P0-001: Verify and repair Drizzle migration metadata against a staging copy of Railway DB. File: `drizzle/meta/_journal.json`. Effort: M. Status: BLOCKED by live/staging DB access.
- P0-002: Confirm Railway production env variables and service links. Files: `docs/ENVIRONMENT_VARIABLES.md`, `RAILWAY_ENV_VARS.md`. Effort: S. Status: BLOCKED by Railway access.
- P0-003: Run working-product verification against Railway: login, onboarding, core lead/campaign action, persisted result, Redis queue durability, provider smoke. Effort: M. Status: BLOCKED by deployed URL/credentials.

### P1 Critical

- P1-001: Align or retire `/api/admin/force-migrate` legacy SQL before any live use.
- P1-002: Add a readiness endpoint or release check that fails when production-required provider groups are missing.
- P1-003: Fix message-send UX so delivery failure does not toast as success.
- P1-004: Align workflow builder output with workflow engine `steps`/`actions`.

### P2 Important

- P2-001: Add dedicated ESLint config if lint must be more than TypeScript.
- P2-002: Reduce large Vite chunks with targeted dynamic imports.
- P2-003: Complete browser smoke evidence for public and authenticated routes.

## Do Not Claim

Do not claim production-ready, market-ready, or Diamond-certified until the Railway deployment, live DB migrations, Redis, provider credentials, and real browser core journey are proven.
