# Implementation Roadmap

## Roadmap Principle

Build the whole architecture, but activate it in proof-based phases.

We should not wait to think about SaaS, billing, compliance, or platform rules. Those must be in the architecture now. But we should not unleash high-volume publishing until each part is measured, tested, and proven.

## Phase 0: Foundation Lock

Goal:

Turn the documentation into technical decisions and create the first build skeleton.

Deliverables:

- final working product name for repository and UI shell,
- initial channel shortlist,
- first platform shortlist,
- architecture decision record,
- database schema draft,
- provider-router interface,
- PolicyOS rule skeleton,
- docs folder accepted as baseline,
- development branch,
- issue/task breakdown.

Decisions needed:

- final internal name for now,
- first 3 to 5 channels,
- first 2 platforms,
- first AI providers,
- initial cloud/storage choices,
- whether to use current repo or new repo/folder,
- internal launch target date.

Exit criteria:

- architecture approved,
- data model approved,
- initial build backlog created,
- no unresolved blocker for Phase 1.

## Phase 1: Core Control Plane and Data Model

Goal:

Build the console foundation and database system.

Deliverables:

- white-first app shell using magenta-violet brand palette,
- navigation for core modules,
- tenant model,
- user/member/role model,
- channel templates,
- channels,
- content pillars,
- content items,
- job model,
- audit logs,
- usage events,
- base dashboards.

Pages:

- Command Center
- Channel Factory
- Content Pipeline
- PolicyOS Review
- Asset Library
- Provider Console
- Admin/Audit

Exit criteria:

- tenant-scoped app works,
- channel can be created from a template,
- content item can move through statuses,
- audit logs record key changes,
- tests cover role and tenant isolation basics.

## Phase 2: Intelligence and Brief Engine

Goal:

Generate high-quality, pillar-aware content briefs from trend and idea inputs.

Deliverables:

- trend signal table,
- manual trend entry,
- source URL ingestion,
- topic cluster scoring,
- content brief generator,
- duplicate idea check,
- risk scoring v1,
- first prompt templates,
- prompt eval fixtures.

Initial sources:

- manual inputs,
- imported CSV,
- RSS/public web where appropriate,
- platform trend inputs where APIs allow,
- internal evergreen idea bank.

Exit criteria:

- generate 30 briefs for each launch channel,
- each brief maps to pillar/channel/platform,
- risk score present,
- duplicate check runs,
- prompt evals pass baseline.

## Phase 3: Script, Source, and Policy Skeleton

Goal:

Move from brief to script with claim extraction and early compliance.

Deliverables:

- script generator,
- storyboard JSON,
- title/caption/hashtag generation,
- claim extraction,
- source attachment,
- high-stakes topic classifier,
- PolicyOS events v1,
- human review UI,
- revision workflow.

Exit criteria:

- script generated from brief,
- claims extracted,
- missing sources create policy warnings,
- high-risk scripts route to review,
- reviewers can approve/request changes/block.

## Phase 4: Asset Library and Render Engine

Goal:

Produce original, tracked, platform-specific videos.

Deliverables:

- asset library,
- asset provenance fields,
- rights status,
- provider router v1,
- generated still/video/audio asset workflow,
- render templates for first pillars,
- FFmpeg/Remotion render pipeline,
- caption rendering,
- thumbnail generation,
- render manifest,
- golden render tests.

Initial render templates:

- 9:16 fast facts/curiosity,
- 9:16 comparison/ranking,
- 9:16 utility steps,
- 9:16 satisfying loop,
- 9:16 poll prompt/result,
- 16:9 long-form shell later.

Exit criteria:

- render produces playable output,
- captions readable,
- safe-area test passes,
- manifest records all source assets,
- render QA catches broken outputs.

## Phase 5: Platform Packaging and Manual Export

Goal:

Package platform-ready content even before direct publishing is live.

Deliverables:

- platform package table,
- YouTube Shorts package profile,
- TikTok package profile,
- Instagram Reels package profile,
- Pinterest package profile,
- X package profile,
- LinkedIn package profile,
- Reddit package profile with manual review,
- export ZIP/package generator,
- posting checklist.

Exit criteria:

- one render can produce multiple platform packages,
- metadata validates against platform profile,
- export package is complete,
- PolicyOS blocks incomplete packages.

## Phase 6: Controlled Direct Publishing

Goal:

Add direct publishing adapters safely, one platform at a time.

Recommended order:

1. YouTube private/unlisted upload path.
2. TikTok Direct Post private/self-only test where approved.
3. Pinterest or LinkedIn depending on API readiness.
4. Meta after Graph API permissions are verified.
5. X depending on API plan and economics.
6. Reddit remains manual/review-first.

Deliverables:

- OAuth/token storage,
- connector capability registry,
- idempotency keys,
- rate-limit tracking,
- publish jobs,
- retry rules,
- publish logs,
- post records,
- kill switch.

Exit criteria:

- sandbox/private publish works,
- duplicate publish prevention proven,
- rate limits recorded,
- publish failures are visible,
- manual fallback remains available.

## Phase 7: Analytics and Optimization

Goal:

Close the loop from content performance to better future content.

Deliverables:

- analytics snapshot model,
- platform analytics imports,
- normalized metric dictionary,
- cost/revenue attribution,
- channel health dashboard,
- content performance dashboard,
- experiment model,
- variant recommendations,
- prompt/provider scoring.

Exit criteria:

- post analytics import works for first platform,
- cost per content item visible,
- winners/losers identified,
- experiment can produce recommendation,
- weak content patterns can be blocked or revised.

## Phase 8: PulseWorld

Goal:

Build the global poll and social experiment product as a content engine and future standalone property.

Deliverables:

- poll creation,
- poll landing pages,
- platform-native poll packages where supported,
- response collection,
- duplicate/bot filtering,
- result visualization,
- result video generation,
- region/language segmentation,
- sampling disclaimer,
- poll analytics.

Exit criteria:

- create poll,
- collect responses,
- produce result package,
- generate result video,
- publish/export results,
- store methodology.

## Phase 9: Documentary Engine

Goal:

Add one-click long-form production for 30-60 minute documentaries and deep dives.

Deliverables:

- documentary project model,
- multi-chapter planner,
- research dossier workflow,
- source/evidence library,
- chapter script generator,
- chapter-level claim review,
- style bible,
- long-form voice and music plan,
- chapter render jobs,
- FFmpeg assembly,
- YouTube long-form package,
- Shorts/Reels cutdown generator,
- long-form QA checklist,
- cost estimator.

Exit criteria:

- one prompt creates a full documentary blueprint,
- chapters are generated and reviewed independently,
- sources and claims are tracked,
- at least one 10-minute chapter renders successfully,
- final assembler can merge chapters,
- long-form package exports for YouTube,
- cutdowns are generated from the long-form master.

## Phase 10: SaaS Billing and Tenant Beta

Goal:

Turn the internal system into a controlled SaaS beta.

Deliverables:

- PayPal products/plans,
- subscription checkout,
- webhook verification,
- subscription state sync,
- plan limits,
- usage credits,
- tenant onboarding,
- team roles,
- admin console,
- support/incident workflow.

Exit criteria:

- test tenant subscribes in PayPal sandbox,
- webhook updates internal subscription,
- usage credits deduct,
- plan limits enforce,
- tenant isolation tests pass,
- beta onboarding works.

## Phase 11: Scale and Enterprise Hardening

Goal:

Prepare for serious volume and external customers.

Deliverables:

- Temporal or robust workflow orchestration if needed,
- advanced provider routing,
- multi-region storage strategy,
- advanced analytics warehouse,
- template marketplace foundation,
- improved prompt evals,
- compliance export,
- incident response runbooks,
- support tooling,
- disaster recovery.

Exit criteria:

- high-volume queues stable,
- cost controls reliable,
- incidents handled,
- customer data protected,
- publishing safe at scale.

## Initial Build Backlog

### Foundation

- Create repo/project structure for OmniPulse OS.
- Add docs baseline.
- Add environment configuration.
- Add database migrations.
- Add tenant/user/member tables.
- Add channel/pillar/template tables.
- Add job table.
- Add audit log.

### UI

- Build white-first shell.
- Add magenta-violet design tokens.
- Add sidebar/topbar.
- Add Command Center.
- Add Channel Factory.
- Add Pipeline Board.
- Add Policy Review queue.
- Add Asset Library.

### AI and Content

- Add provider router interface.
- Add prompt templates table.
- Add brief generator.
- Add script generator.
- Add claim extractor.
- Add source attachment.
- Add risk scorer.

### Media

- Add asset upload/storage.
- Add generated asset record.
- Add render template.
- Add render worker.
- Add FFmpeg/Remotion pipeline.
- Add safe-area/caption QA.
- Add manifest generation.

### Compliance

- Add policy rule registry.
- Add policy event table.
- Add rights checks.
- Add duplicate checks.
- Add AI-label decision.
- Add sponsor disclosure decision.
- Add human review workflow.

### Publishing

- Add platform capability registry.
- Add platform package generator.
- Add manual export.
- Add YouTube connector skeleton.
- Add TikTok connector skeleton.
- Add rate-limit state.
- Add publish logs.

### Analytics

- Add analytics snapshot table.
- Add synthetic analytics importer for testing.
- Add performance dashboard.
- Add experiment table.
- Add variant recommender v1.

### SaaS

- Add plans table.
- Add PayPal product/plan mapping.
- Add subscription table.
- Add PayPal webhook event table.
- Add usage events.
- Add billing admin view.
- Add plan limit enforcement.

## Launch Channels Recommendation

Start with channels that test different system capabilities without overwhelming policy risk.

Recommended first five:

1. FactQuest or MindHook: tests curiosity, claims, sources, captions.
2. QuickFix or DailyShortcut: tests utility, practical value, safety checks.
3. RankIt or CompareLab: tests structured templates and affiliate future.
4. LoopLab or SatisfyCore: tests visual generation and render quality.
5. PulseWorld: tests polls, global framing, audience interaction.

Delay high-risk provocative channels until PolicyOS and account health are proven.

## First Platform Recommendation

Start with:

1. YouTube Shorts private/unlisted workflow.
2. Manual TikTok/Reels export package.
3. Pinterest manual/API depending on readiness.

Why:

- YouTube has clearer upload documentation and monetization risk that teaches us discipline.
- TikTok/Reels are core short-form targets but direct publishing requires review and careful fields.
- Pinterest is useful for evergreen utility and visual content with lower creative pressure.

## Acceptance Criteria For First Real Demo

The first real demo is complete when:

- user can create a tenant,
- user can create a channel from a template,
- user can generate a brief,
- user can generate a script,
- system extracts claims,
- user can attach/approve sources,
- system creates or records assets,
- system renders a 9:16 video,
- PolicyOS reviews it,
- user exports a YouTube/TikTok/Reels package,
- analytics can be simulated,
- optimization recommends a next variant.

## Open Decisions

These should be answered before coding starts in full:

1. Final working product name for the repo and UI.
2. First 3 to 5 channel names.
3. First two platforms to actively support.
4. Initial AI providers and budget ceiling.
5. Whether to build in the current repo or a new project folder.
6. Initial PayPal plan names and rough pricing.
7. Human review thresholds for internal launch.
8. Forbidden content categories for our owned network.
9. Initial language/region focus.
10. Whether to use an aggregator temporarily for any platform.

## Immediate Next Step

The next step after this documentation pack is to create the actual implementation plan:

- file/module architecture,
- database migrations,
- UI route map,
- worker architecture,
- API contracts,
- first sprint tasks,
- test plan,
- milestone acceptance criteria.
