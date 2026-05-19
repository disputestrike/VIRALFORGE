# Go-Live Readiness

## Current Local Status

- TypeScript check: PASS (`pnpm run check`, `CHECK_EXIT=0`).
- Tests: PASS (`pnpm run test`, 48 files and 441 tests).
- Backend bundle: PASS (`pnpm exec esbuild ...`, `ESBUILD_EXIT=0`).
- Build command: PASS on final rerun (`BUILD_EXIT=0`). Baseline had a wrapper anomaly, but the final gate is clean.
- Release gate: `docs/internal/WAVE_COMPLETION_REPORT.md` says APPROVED with 9/9 CTQ gates passing; wrapper exit was `RELEASE_GATE_EXIT=-1`.
- Integration readiness: local shell is missing public URL, Redis, auth/session, SignalWire, Deepgram, Cerebras, TTS, Resend, and optional provider groups.

## Verdict

- [ ] READY
- [ ] READY FOR CONTROLLED BETA
- [x] NOT READY FOR FULL PRODUCTION CERTIFICATION

Reason: local code gates are mostly green, but live Railway env, Redis durability, provider credentials, live DB migrations, and the end-to-end working-product journey are not proven.

## P0 Launch Blockers

1. Staging/live migration verification is required because `drizzle/meta/_journal.json` is stale relative to loose SQL migrations through `0021_ab_testing.sql`.
2. Railway variables must be confirmed for `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, public URL, OAuth, SignalWire, Deepgram, Cerebras, TTS, Resend, and Stripe if billing is enabled.
3. Working-product verification is not complete against the real Railway deployment.

## Required Before Full Production Certification

1. Confirm Railway has `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, public domain, OAuth, telephony, STT, LLM, TTS, email, and billing variables as needed.
2. Run or observe startup migrations against a staging copy of the Railway database before production.
3. Hit production `/api/health` and a separate readiness/provider smoke path.
4. Run a real login flow.
5. Run a real lead/campaign workflow.
6. Run a controlled voice call.
7. Run a controlled email/SMS workflow if those products are enabled.
8. Confirm queue jobs persist through Redis.
9. Confirm no frontend page exposes provider keys or operational secrets.
10. Re-run `pnpm run release:gate` and `pnpm run verify` after final changes.

## Working Product Verification

Tester: automated local Codex session, 2026-05-19.

- Local typecheck: PASS.
- Local tests: PASS.
- Local build: PASS.
- Local provider delivery: NOT PROVEN, blocked by missing local provider env.
- Railway URL accessible: UNSURE, requires deployed Railway URL and credentials.
- Signup/login: UNSURE, requires browser/Railway OAuth or test auth path.
- Core action and persistence: partially proven by server tests, not proven in real browser against Railway.
