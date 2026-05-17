# Six Sigma QAQC System

## Purpose

This project must be built with engineering discipline. The operating model is not "build once and hope." It is:

1. define the work,
2. measure the work,
3. test the work,
4. prove the work,
5. correct defects,
6. control the improved process.

Six Sigma gives us the operating language for that.

## Methodology

Use two complementary frameworks:

- DMAIC for improving workflows after they exist: Define, Measure, Analyze, Improve, Control.
- DMADV for designing new workflows: Define, Measure, Analyze, Design, Verify.

## Critical To Quality Metrics

CTQs define whether the system is good enough to scale.

### Content CTQs

| CTQ | Target Direction |
| --- | --- |
| Originality score | High |
| Policy pass rate | High |
| Factual source coverage | High |
| Rights completeness | 100 percent for published assets |
| Hook quality score | High |
| Render defect rate | Low |
| Caption readability | High |
| Audio loudness compliance | High |
| Platform metadata validity | High |
| Duplicate score | Low |

### Distribution CTQs

| CTQ | Target Direction |
| --- | --- |
| Publish success rate | High |
| Duplicate publish incidents | Zero |
| Rate-limit errors | Low |
| Account warnings | Zero |
| Failed token refreshes | Low |
| Manual export completeness | High |
| Time from approval to publish | Low |

### Analytics CTQs

| CTQ | Target Direction |
| --- | --- |
| Analytics import success | High |
| Snapshot freshness | High |
| Metric normalization accuracy | High |
| Revenue/cost attribution completeness | High |
| Experiment result confidence | High |

### SaaS CTQs

| CTQ | Target Direction |
| --- | --- |
| Tenant isolation defects | Zero |
| Billing webhook processing accuracy | High |
| Subscription state accuracy | High |
| Usage event completeness | High |
| Role permission defects | Zero |
| Audit log coverage | High |

## Defect Taxonomy

### Ideation Defects

- trend signal stale,
- topic already saturated,
- topic mapped to wrong pillar,
- risk under-scored,
- duplicate idea generated,
- weak audience fit.

### Script Defects

- unsupported claim,
- generic AI voice,
- weak hook,
- wrong tone,
- incorrect facts,
- unsafe advice,
- non-native platform pacing,
- title mismatch.

### Asset Defects

- missing rights,
- low-resolution media,
- watermark,
- copyrighted music,
- voice mismatch,
- visual artifacts,
- unsafe synthetic realism,
- file corruption.

### Render Defects

- text outside safe area,
- captions unreadable,
- audio clipping,
- wrong aspect ratio,
- frame glitches,
- export failure,
- thumbnail unreadable,
- incorrect duration.

### Policy Defects

- missing AI label,
- missing sponsor disclosure,
- duplicate content,
- high-risk content bypassed review,
- platform rule mismatch,
- privacy violation,
- unauthorized override.

### Publish Defects

- invalid metadata,
- token expired,
- quota exhausted,
- duplicate post,
- wrong account,
- wrong privacy,
- wrong schedule,
- API failure not retried correctly.

### Analytics Defects

- missing post mapping,
- stale snapshot,
- wrong metric normalization,
- revenue not attributed,
- cost missing,
- experiment corrupted.

### Billing Defects

- webhook unverified,
- duplicate webhook processed,
- subscription not updated,
- usage not metered,
- tenant over limit not enforced,
- wrong plan limit.

## Tollgate System

Each stage has a gate. A content item cannot move forward unless the gate passes or an authorized review override exists.

### Gate 0: Channel Launch Gate

Required:

- channel template selected,
- brand kit defined,
- platform accounts connected or manual export selected,
- policy profile set,
- cadence set,
- monetization route selected,
- first 30 ideas generated,
- risk review completed.

### Gate 1: Brief Gate

Required:

- topic source captured,
- audience defined,
- platform targets defined,
- risk score calculated,
- duplicate idea check passed,
- claims list identified.

### Gate 2: Script Gate

Required:

- hook approved,
- script fits target duration,
- claims extracted,
- required sources attached,
- tone matches channel,
- CTA does not violate platform rules.

### Gate 3: Asset Gate

Required:

- every asset has provenance,
- every asset has rights status,
- generated assets have prompt/provider records,
- copyrighted media blocked unless licensed,
- audio license verified.

### Gate 4: Render Gate

Required:

- correct aspect ratio,
- safe-area check,
- caption readability,
- audio loudness normalization,
- visual artifact scan,
- duration check,
- manifest created.

### Gate 5: Policy Gate

Required:

- rights pass,
- fact pass,
- AI label decision,
- sponsor disclosure decision,
- duplicate score acceptable,
- account health pass,
- platform-specific rules pass.

### Gate 6: Publish Gate

Required:

- platform package complete,
- metadata valid,
- rate limit available,
- idempotency key set,
- correct account selected,
- schedule time valid,
- retry policy set.

### Gate 7: Measurement Gate

Required:

- post ID captured,
- first analytics snapshot scheduled,
- cost events attached,
- experiment link if applicable,
- channel dashboard updated.

### Gate 8: Optimization Gate

Required:

- enough data or marked inconclusive,
- winner/loser logic applied,
- variant recommendation created,
- learning stored,
- bad pattern prevented from repeating.

## QA Test Types

### Unit Tests

Cover:

- scoring functions,
- metadata validators,
- platform config parsers,
- rights checks,
- policy rules,
- billing calculations,
- usage aggregation,
- role permissions.

### Integration Tests

Cover:

- brief to script,
- script to claims,
- assets to render,
- render to policy gate,
- package to publish adapter,
- webhook to subscription state,
- analytics import to dashboard.

### End-To-End Tests

Core flows:

1. Create tenant.
2. Create channel from template.
3. Generate brief.
4. Generate script.
5. Attach source.
6. Generate assets.
7. Render video.
8. Pass PolicyOS.
9. Export manual package.
10. Import synthetic analytics.
11. Recommend variant.

Publishing E2E should run against sandbox/private modes first.

### Golden Render Tests

Maintain sample expected renders:

- 9:16 short,
- 16:9 long-form,
- 1:1 square,
- 4:5 feed,
- poll result,
- comparison ranking,
- utility steps.

Each render test checks:

- dimensions,
- duration,
- no blank frames,
- captions visible,
- text safe area,
- audio present,
- thumbnail generated.

### Prompt Evaluations

Every core prompt template needs eval cases:

- hook generation,
- brief generation,
- script generation,
- claim extraction,
- source-aware rewriting,
- policy review,
- metadata packaging,
- localization,
- variant generation.

Score prompts on:

- specificity,
- originality,
- policy awareness,
- source use,
- platform fit,
- tone match,
- hallucination rate,
- repetition rate.

### Policy Regression Tests

Maintain fixtures for:

- missing rights,
- unsupported medical claim,
- affiliate link without disclosure,
- duplicate content,
- AI-generated realistic scene,
- subreddit rule mismatch,
- high-risk political claim,
- private-person allegation,
- copyrighted music.

Every fixture should produce expected policy status.

### Billing Tests

Cover:

- PayPal subscription created,
- PayPal webhook verified,
- duplicate webhook ignored,
- plan changed,
- subscription cancelled,
- usage credits deducted,
- over-limit blocked,
- tenant downgraded,
- invoice/revenue event stored.

## Measurement Dashboards

### Executive Dashboard

- total content created,
- content published,
- channel health,
- top posts,
- revenue,
- cost,
- profit,
- policy pass rate,
- defects by stage,
- current bottleneck.

### Production Dashboard

- queue depth,
- job duration,
- render success,
- render failure reasons,
- approval backlog,
- publish schedule,
- stuck jobs,
- provider failures.

### Compliance Dashboard

- blocked content,
- review queue,
- defects by policy module,
- duplicate risk,
- rights gaps,
- high-risk topics,
- account warnings,
- overrides.

### SaaS Dashboard

- active tenants,
- subscriptions,
- MRR,
- usage credits consumed,
- provider cost by tenant,
- billing failures,
- churn risk,
- plan limits.

## Root Cause Analysis

Use structured RCA for every serious defect.

Required fields:

- defect ID,
- stage,
- severity,
- detection method,
- immediate fix,
- root cause,
- contributing factors,
- corrective action,
- preventive action,
- owner,
- due date,
- verification evidence.

Preferred methods:

- 5 Whys,
- fishbone categories,
- Pareto analysis,
- control charts,
- regression tests.

Fishbone categories:

- people/review,
- process,
- prompt,
- provider,
- platform,
- policy,
- data,
- code,
- environment.

## Control Plan

The control plan keeps the system from drifting after fixes.

Controls:

- automated tests in CI,
- prompt eval thresholds,
- render snapshots,
- policy regression fixtures,
- publish dry-runs,
- billing webhook replay tests,
- weekly connector verification,
- monthly policy review,
- channel health limits,
- provider cost alerts,
- incident review.

## Scale Gates

Volume increases only after proof.

### Gate A: Prototype

Requirements:

- one channel template,
- one render template,
- manual export,
- PolicyOS skeleton,
- all events logged.

### Gate B: Internal Alpha

Requirements:

- three channel templates,
- two active platforms,
- asset rights ledger,
- policy events,
- analytics snapshots,
- basic dashboards.

### Gate C: Controlled Publishing

Requirements:

- approved platform connector,
- private/sandbox tested,
- idempotent publish,
- rate-limit tracking,
- account health dashboard,
- manual kill switch.

### Gate D: Network Scale

Requirements:

- 10+ channels,
- variant engine,
- experiment tracking,
- provider cost controls,
- compliance pass rate target met,
- render defect rate controlled.

### Gate E: SaaS Beta

Requirements:

- tenant isolation tested,
- PayPal subscriptions live,
- usage metering live,
- role permissions tested,
- billing and audit logs,
- support and incident process.

## Definition Of Done

A feature is done only when:

- code works,
- tests exist for risk areas,
- docs are updated,
- telemetry exists,
- errors are handled,
- policy impact is known,
- tenant impact is known,
- billing impact is known if applicable,
- QA evidence is captured.

## Weekly Operating Rhythm

Weekly cycle:

1. Review KPIs and defects.
2. Identify top bottleneck.
3. Choose improvement target.
4. Ship focused correction.
5. Verify with tests and data.
6. Update control plan.
7. Decide scale, pause, or revise.

This is how the system compounds.
