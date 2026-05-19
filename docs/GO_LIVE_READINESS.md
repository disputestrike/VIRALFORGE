# Go-Live Readiness

## Current local status

- Build: pass.
- Tests: pass.
- TypeScript check: pass.
- Release gate report: approved.
- Local can-run: pass for built server, health endpoint, and public route HTTP smoke.
- Browser click-through: pass for primary pricing/sign-in clicks and public route navigation.
- Integration readiness script: runs and reports missing local env groups.

## Required before full production certification

1. Confirm Railway has `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, public domain, OAuth, telephony, STT, LLM, TTS, email, and billing variables as needed.
2. Run or observe startup migrations against Railway `DATABASE_URL`.
3. Hit production `/api/health`.
4. Run a real login flow.
5. Run a real lead/campaign workflow.
6. Run a controlled voice call.
7. Run a controlled email/SMS workflow if those products are enabled.
8. Confirm queue jobs persist through Redis.
9. Confirm no frontend page exposes provider keys or operational secrets.
10. Re-run `pnpm run release:gate` and `pnpm run verify` after final changes.
