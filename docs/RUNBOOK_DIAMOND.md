# Diamond Runbook

## Local verification

```powershell
pnpm run check
pnpm run test
pnpm run build
pnpm run release:gate
pnpm run verify:integrations
```

## Strict integration verification

```powershell
$env:VERIFY_STRICT='1'
pnpm run verify:integrations
```

## Railway verification

1. Confirm Railway variables match `docs/ENVIRONMENT_VARIABLES.md`.
2. Deploy latest commit.
3. Confirm startup migrations complete.
4. Open `https://<railway-domain>/api/health`.
5. Run login, dashboard, lead/campaign, voice, SMS/email, and billing smoke tests according to enabled providers.

## Failure response

1. Stop deploy promotion.
2. Capture logs and failing route.
3. Identify whether failure is code, env, provider, migration, or data.
4. Apply smallest safe fix.
5. Re-run full gate sequence.
