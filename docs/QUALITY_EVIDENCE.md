# Quality Evidence

## Local Verification

Commands run:

```bash
npm test
npm run quality
```

Result:

- 3 tests passed.
- Quality gate passed.

## End-To-End API Proof

Command:

```bash
POST /api/runs/start
```

Input:

```json
{
  "topic": "Why AI content factories will replace 100 person media teams",
  "objective": "Create a governed viral proof video and platform export package",
  "budgetUsd": 120,
  "risk": "standard"
}
```

Observed output from `/api/evidence`:

```json
{
  "runs": 1,
  "trends": 7,
  "assets": 3,
  "posts": 8,
  "learningSignals": 2,
  "latestRun": "completed",
  "latestDecision": "Ready/exported; live publish waits for connector readiness"
}
```

## Render Proof

The local end-to-end run generated:

- image asset;
- audio asset;
- video asset.

The video asset is a real MP4 generated through FFmpeg. In Railway, generated files should go to Railway Storage Buckets when bucket env vars are present.

## Quality Gates Passed

From `/api/status` after a full run:

| Gate | Status | Evidence |
|---|---|---|
| Persistence | pass | repository stored the run |
| Agent Pipeline | pass | latest run completed |
| Media Rendering | pass | video asset exists |
| Compliance | pass | 10 policy events, no holds/fails |
| Recursive Learning | pass | 2 learning signals |
| Distribution Safety | pass | dry-run export mode |

## Compliance Tracker

The run generated policy events for:

- originality;
- rights;
- fact risk;
- brand safety;
- AI labeling;
- platform fit;
- quota;
- cost;
- human exception;
- audit.

## Corrective Action Rule

Any failed or held gate must create a corrective action before live publishing:

1. define failure;
2. measure logs/evidence;
3. analyze root cause;
4. improve agent/prompt/provider/connector;
5. control with regression test or policy rule.
