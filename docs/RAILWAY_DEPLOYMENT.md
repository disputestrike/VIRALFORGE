# Railway Deployment

## Configured Deploy Path

- Railway config file: `railway.json`
- Builder: Dockerfile
- Dockerfile path: `Dockerfile`
- Start command: `node dist/index.js`
- Healthcheck path: `/api/health`
- Healthcheck timeout: 120 seconds
- Restart policy: on failure, max 3 retries

## Build Path

1. Docker builder installs pnpm.
2. Installs dependencies with `pnpm install --frozen-lockfile`.
3. Copies the source tree.
4. Builds frontend and backend with `pnpm build`.
5. Production image installs prod dependencies.
6. Copies `dist/`, `drizzle/`, and `drizzle.config.ts`.
7. Runs `node dist/index.js`.

## Runtime Migration Path

`server/_core/index.ts` runs migrations on startup when `DATABASE_URL` is set. In production, migration failure throws and blocks startup.

Fatal startup errors now exit with code 1, so Railway can mark the deploy failed or restart instead of allowing a silent clean exit.

## Required Railway Services

- App service.
- MySQL-compatible database. The active runtime uses Drizzle MySQL/mysql2, so `DATABASE_URL` must be MySQL-compatible unless the schema/runtime are migrated.
- Redis service for BullMQ queue durability.

## Current Railway Blockers

- `drizzle/meta/_journal.json` is stale relative to migration SQL files. Do not promote a production migration change until this is tested against a staging copy of the Railway database.
- `REDIS_URL` is required for production queue durability. Local memory queue fallback is acceptable only for dev/test.
- `/api/health` is a liveness endpoint. Treat queue/provider readiness as separate release proof from `pnpm run verify:integrations` and live smoke tests.

## Certification Note

The repo is Railway-ready by config shape, port binding, start command, and local code gates. Full Railway-live certification requires access to deployed service logs, variables, health endpoint, live database migration output, Redis, and provider smoke tests.
