# Known Gaps and Risks

## P0 Blockers and External Verification Gaps

- Live Railway database tables were not directly inspected in this local run.
- Live Railway Redis connectivity was not directly inspected in this local run.
- Live telephony/STT/LLM/TTS/email/billing provider credentials were not available in the local shell.
- Local integration readiness reported missing env groups; Railway may still have them configured.
- Drizzle migration metadata is unsafe to repair blindly: `drizzle/meta/_journal.json` only records through `0004_perf_indexes`, while `drizzle/` contains SQL through `0021_ab_testing.sql`. Drizzle applies migrations by journal entries and `created_at`, so this must be fixed against a staging copy of the Railway DB before production certification.
- Working product verification against the real Railway deployment has not been completed. Required proof: deployed URL, signup/login, onboarding, core lead/campaign action, persisted data, Redis-backed queue durability, and provider smoke tests.

## P1 Product and Engineering Risks

- In-memory queue fallback is useful locally but not production durable.
- Vite build emits large chunk warnings.
- `lint` is currently a TypeScript check alias; a dedicated ESLint configuration is still absent.
- Existing docs contain some provider-era drift and should be kept aligned with the actual env model.
- Worktree has pre-existing untracked folders and modified files; this makes release scope control important.
- `/api/admin/force-migrate` embeds legacy hand-written SQL and must be aligned with Drizzle migrations before it is used on live data.
- Demo call UI requires Railway/provider verification because local tests prove queueing and fallback behavior, not live SignalWire delivery.
- Message send UX can show success copy even when delivery status is `failed`; fix before GA if SMS/email delivery is customer-facing on day one.
- Workflow builder UI stores simple `trigger`/`action` definitions, while the workflow engine executes structured `steps`/`actions`; fix before advertising workflow automation as live.

## P2 Cleanup

- Normalize internal documentation encoding where legacy mojibake appears.
- Keep architecture docs provider-neutral for public surfaces and precise for internal ops docs.
- Add live Railway smoke evidence after production env variables are available.
- Add a dedicated ESLint config if linting beyond TypeScript is required by CI.
