# ViralForge

ViralForge is a standalone AI media operating system prototype.

This repo is the clean ViralForge product surface:

- public website at `/`;
- local login demo at `/login`;
- product console at `/app`;
- engine console alias at `/console`;
- deterministic API at `/api/run`.

## Run Locally

```bash
node server.mjs
```

Open:

```text
http://localhost:3001/
```

## Test

```bash
npm test
```

## What Is Real Now

- standalone server with no third-party dependencies;
- public ViralForge website;
- local sign-in flow for testing;
- AI engine run planner;
- PolicyOS, QAQC, SignalLoop, Documentary Engine, SaaS/PayPal readiness;
- no live external posting or billing without credentials and platform review.

## Product Boundary

ViralForge is its own product. It may later integrate with external AI, video, payment, and social APIs, but those integrations are gated behind credentials, policy, account review, and explicit operator approval.
