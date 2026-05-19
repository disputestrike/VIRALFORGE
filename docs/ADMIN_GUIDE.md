# Admin Guide

## Admin Surface

- Admin route: `/admin`
- Admin router procedures are guarded by `adminProcedure`.
- Admin users can inspect users, disabled users, activity logs, system stats, system config, voice metrics, integration readiness, and audit export.

## Production Admin Rules

- Do not use `/api/admin/force-migrate` on live data until its legacy SQL is aligned with Drizzle migrations.
- Use Railway deployment logs and `/api/health` for liveness.
- Use `pnpm run verify:integrations` locally or in CI to check env shape without printing secrets.
- Role escalation must stay server-side and limited to admin users.

## Operational Tasks

- Create tenant manually: use admin/user management only after confirming auth and DB migration state.
- Disable user: use the admin disable control.
- View logs: Railway service logs plus application startup logs.
- Roll back bad deploy: Railway Deployments -> redeploy previous known-good deployment; if DB migrations ran, follow the migration rollback plan first.
