# Operations Runbook

## Deploy

1. Confirm clean intended release scope.
2. Run `pnpm run check`.
3. Run `pnpm run test`.
4. Run `pnpm run release:gate`.
5. Confirm `docs/GO_LIVE_READINESS.md` has no unowned P0 blockers.
6. Push to `main`.
7. Watch Railway build/startup logs.
8. Hit `/api/health`.

## Migration Safety

- Do not repair `drizzle/meta/_journal.json` directly against production.
- Clone or snapshot the Railway DB first.
- Test migration journal repair on staging.
- Confirm `__drizzle_migrations` ordering and created_at values before production.

## Incident: App Down

1. Check Railway deployment status.
2. Check startup logs for fatal migration/env errors.
3. Hit `/api/health`.
4. Roll back to the last known-good Railway deployment if startup fails.
5. If migrations ran, assess DB rollback separately before redeploying old code.

## Incident: Queue/Provider Down

1. Check `REDIS_URL` and Redis service health.
2. Check queue health/admin readiness.
3. Check provider dashboard status.
4. Pause outbound campaigns if delivery is unreliable.
5. Resume only after a controlled smoke test passes.
