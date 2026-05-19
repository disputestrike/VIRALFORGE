# Workspace Modes

## Current Evidence

- Industry and workspace context are stored on users, leads, campaigns, onboarding, user industry packs, and voice settings.
- Voice/script generation uses selected industry context in `client/src/pages/VoiceAI.tsx` and `server/routers.ts`.
- Healthcare/legal/finance/government outbound restrictions are not proven as separate hard modes in this audit.

## Mode Rules

- Existing default users must remain safe when mode metadata is absent.
- Mode switching must not delete leads, campaigns, recordings, transcripts, or templates.
- Regulated modes need explicit compliance gates before they are advertised as live.

## Gaps

- No complete route-by-route mode matrix has been proven.
- No destructive mode-switch migration was verified.
- Custom enterprise label override requires live product verification.
