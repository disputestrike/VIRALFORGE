# Testing and Quality

## Scripts

- `dev`: `tsx watch server/_core/index.ts`
- `build`: `vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist`
- `start`: `node dist/index.js`
- `check`: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit`
- `type-check`: `pnpm run check`
- `lint`: `pnpm run check`
- `test`: `vitest run`
- `release:gate`: `node scripts/release-six-sigma-gate.mjs`
- `verify`: `pnpm run check && pnpm run test && pnpm run build && node scripts/verify-integrations.mjs`
- `verify:integrations`: `node scripts/verify-integrations.mjs`
- `verify:integrations:strict`: `node scripts/verify-integrations-strict.mjs`

## Baseline Results From This Diamond Sequence

- `pnpm run check`: PASS.
- `pnpm run test`: PASS, 48 files and 441 tests.
- `pnpm run build`: PASS on final rerun (`BUILD_EXIT=0`). Baseline had a wrapper anomaly after Vite output.
- `pnpm run release:gate`: generated an approved wave completion report; the outer wrapper returned `-1` after report generation.
- `pnpm run verify:integrations`: completed and reported local missing env groups.
- `pnpm run lint`: aliases `pnpm run check`.
- `pnpm run type-check`: aliases `pnpm run check`.
- After Redis fallback/startup fixes: `pnpm run check`, `pnpm run test`, and `pnpm run build` passed.

## Quality Risks

- `lint` is currently a static type gate alias, not a dedicated ESLint run. Add a true ESLint config when the team wants style/import linting as a separate release gate.
- Build bundle warnings indicate an optimization opportunity, not a blocking failure.
- Some tests intentionally exercise degraded/missing-env fallback paths, so warnings in test logs are expected.
- Browser smoke against the active Railway deployment is still required for final market readiness.
