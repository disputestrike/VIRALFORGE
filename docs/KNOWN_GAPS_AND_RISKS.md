# Known Gaps and Risks

## P0 external verification gaps

- Live Railway database tables were not directly inspected in this local run.
- Live Railway Redis connectivity was not directly inspected in this local run.
- Live telephony/STT/LLM/TTS/email/billing provider credentials were not available in the local shell.
- Local integration readiness reported missing env groups; Railway may still have them configured.

## P1 product/engineering risks

- In-memory queue fallback is useful locally but not production durable.
- Vite build emits large chunk warnings.
- `lint` is currently a TypeScript check alias; a dedicated ESLint configuration is still absent.
- Existing docs contain some provider-era drift and should be kept aligned with the actual env model.
- Worktree has pre-existing untracked folders and modified files; this makes release scope control important.

## P2 cleanup

- Normalize internal documentation encoding where legacy mojibake appears.
- Keep architecture docs provider-neutral for public surfaces and precise for internal ops docs.
- Add live Railway smoke evidence after production env variables are available.
