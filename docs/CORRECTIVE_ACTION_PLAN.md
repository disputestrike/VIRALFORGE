# Corrective Action Plan

ViralForge uses DMAIC for operational correction.

## Define

Every failure must identify:

- run ID;
- agent/stage;
- expected result;
- actual result;
- customer or platform impact.

## Measure

Collect:

- job logs;
- run output;
- provider response;
- policy events;
- asset metadata;
- connector response;
- quota state;
- cost data.

## Analyze

Classify root cause:

- missing credential;
- provider error;
- invalid schema;
- render failure;
- policy failure;
- quota exceeded;
- duplicate content;
- platform app review needed;
- deployment/config issue.

## Improve

Apply one or more:

- retry job;
- regenerate script;
- replace asset;
- downgrade render path;
- route to human review;
- reschedule post;
- update prompt;
- patch connector;
- add test.

## Control

Prevent recurrence:

- add regression test;
- add quality gate;
- add alert;
- add dashboard status;
- add connector readiness state;
- add documentation.

## Release Rule

No live publish when:

- `PUBLISH_MODE` is not `live`;
- connector is not ready;
- policy gate is `hold` or `block`;
- quota is unavailable;
- asset provenance is missing;
- audit events are missing.
