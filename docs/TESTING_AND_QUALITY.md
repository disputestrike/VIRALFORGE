# Testing and Quality

## Scripts

- `dev`: `tsx watch server/_core/index.ts`
- `build`: `vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist`
- `start`: `node dist/index.js`
- `check`: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit`
- `type-check`: `pnpm run check`
- `lint`: `pnpm run check`
- `format`: `prettier --write .`
- `test`: `vitest run`
- `test:settings-contract`: `vitest run server/settings.contract.test.ts`
- `test:voice`: `vitest run server/realtime`
- `test:vaqs`: `vitest run server/realtime/vaqsEngineering.test.ts`
- `voice:qa`: `tsx scripts/voice-qa-report.ts`
- `release:gate`: `node scripts/release-six-sigma-gate.mjs`
- `release:voice-gate`: `node scripts/release-six-sigma-gate.mjs`
- `verify`: `pnpm run check && pnpm run test && pnpm run build && node scripts/verify-integrations.mjs`
- `verify:integrations`: `node scripts/verify-integrations.mjs`
- `verify:integrations:strict`: `node scripts/verify-integrations-strict.mjs`
- `verify:quick`: `pnpm run check && pnpm run test`
- `db:push`: `drizzle-kit generate && drizzle-kit migrate`

## Baseline results from this Diamond sequence

- `pnpm run check`: passed.
- `pnpm run test`: passed; final run reported 48 test files and 441 tests passing.
- `pnpm run build`: passed, with Vite large-chunk warnings.
- `pnpm run release:gate`: passed and generated an approved wave completion report.
- `pnpm run verify:integrations`: completed and reported local missing env groups.
- `pnpm run lint`: passed after Diamond fix; currently aliases the TypeScript check until a dedicated ESLint config is added.
- `pnpm run type-check`: passed after Diamond fix; aliases `pnpm run check`.
- `pnpm run verify:integrations:strict`: failed locally because the local shell is missing required production provider env groups.

## Local can-run and click-through

- Built server started locally on port 4173 with live DB/provider env cleared to avoid mutating Railway data.
- `GET /`, `/about`, `/platform`, `/solutions`, `/resources`, `/pricing`, `/privacy`, `/terms`, `/security`, and `/api/health` returned HTTP 200.
- Browser click-through verified the home page, nav pricing click, sign-in click, and direct public route loads with expected H1/title evidence.
- Browser screenshot capture timed out in the in-app browser backend; DOM, URL, H1, and HTTP evidence were captured instead.

## Quality risks

- `lint` is currently a static type gate alias, not a dedicated ESLint run. Add a true ESLint config when the team wants style/import linting as a separate release gate.
- Build bundle warnings indicate an optimization opportunity, not a blocking failure.
- Some tests intentionally exercise degraded/missing-env fallback paths, so warnings in test logs are expected.
