# Testing and Release Gates

## Required Local Gates

1. `pnpm run check`
2. `pnpm run test`
3. `pnpm run build`
4. `pnpm run release:gate`
5. `pnpm run verify:integrations`

## Current Evidence

- TypeScript: PASS.
- Tests: PASS, 48 files and 441 tests.
- Release gate: APPROVED with 9/9 CTQ gates.
- Integration readiness: runs and reports missing local env groups.
- Build: assets generated; wrapper returned `-1` in this shell, while release gate recorded build PASS.

## Release Rule

Do not promote to full production until local gates pass, Railway deploy succeeds, Railway env is complete, migrations are verified, Redis is active, and real provider smoke tests pass.
