# Railway Deployment

## Configured deploy path

- Railway config file: `railway.json`
- Builder: Dockerfile
- Dockerfile path: `Dockerfile`
- Start command: `node dist/index.js`
- Healthcheck path: `/api/health`
- Healthcheck timeout: 120 seconds
- Restart policy: on failure, max 3 retries

## Build path

1. Docker builder installs pnpm.
2. Installs dependencies with `pnpm install --frozen-lockfile`.
3. Copies the source tree.
4. Builds frontend and backend with `pnpm build`.
5. Production image installs prod dependencies.
6. Copies `dist/`, `drizzle/`, and `drizzle.config.ts`.
7. Runs `node dist/index.js`.

## Runtime migration path

`server/_core/index.ts` runs migrations on startup when `DATABASE_URL` is set. In production, migration failure throws and blocks startup.

## Required Railway services

- App service.
- MySQL/Postgres-compatible DB note: this code currently uses Drizzle MySQL/mysql2, so the active `DATABASE_URL` must be MySQL-compatible unless the schema/runtime are migrated.
- Redis service.

## Certification note

The repo is Railway-ready by config and local build evidence. Full Railway-live certification requires access to the deployed service logs, variables, health endpoint, and live database.
