# Technical Architecture

## Architecture Goal

Build one modular system that can power our internal media network first and later support external SaaS workspaces without a rewrite.

The architecture must support:

- high-volume content ideation,
- AI provider routing,
- media rendering,
- asset storage,
- platform publishing,
- analytics ingestion,
- policy enforcement,
- audit trails,
- subscriptions and usage billing,
- multiple tenants,
- multiple channels,
- multiple platforms,
- multiple languages and regions.

## Recommended Stack

### Web Control Plane

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui or local component system
- TanStack Query
- Zustand or Redux Toolkit for local state where needed
- Recharts, Tremor, or ECharts for dashboards
- Monaco or rich prompt editor for advanced templates

### API Layer

- Node.js/TypeScript API for product-facing routes if the existing app is already Node-based.
- FastAPI/Python service for AI, media, and data-science heavy workflows.
- OpenAPI contracts between services.
- Background job API for queue submission and monitoring.

### Worker Layer

- Python workers for AI orchestration, media processing, evaluation, translation, and analytics.
- Node workers for platform SDKs or JavaScript-native publisher adapters where appropriate.
- FFmpeg for final media operations.
- Remotion for programmatic video templates if the UI/React skillset is reused.
- MoviePy/OpenCV/Pillow for fallback media manipulation.
- Whisper or provider transcription for captions and alignment.

### Data Layer

- Postgres as system of record.
- Redis for queues, locks, rate limiting, cache, and short-lived state.
- S3-compatible object storage such as Cloudflare R2 or AWS S3 for generated media.
- Optional ClickHouse or BigQuery later for large analytics events.
- Optional vector database or pgvector for memory, similarity, dedupe, content search, and asset retrieval.

### Queue and Orchestration

Preferred progression:

1. Start with BullMQ or Celery for MVP job queues.
2. Add Temporal when workflow complexity, retries, and long-running reliability justify it.
3. Keep workflow state mirrored in Postgres so the product UI remains explainable.

Workflow types:

- trend ingestion,
- brief generation,
- script generation,
- source retrieval,
- claim extraction,
- fact check,
- asset generation,
- render,
- transcode,
- policy review,
- package creation,
- publish,
- analytics import,
- variant generation,
- billing usage aggregation.

## System Layers

### 1. Control Plane

The control plane is the human-facing app.

Responsibilities:

- dashboard,
- channel setup,
- content pipeline,
- approvals,
- policy review,
- provider configuration,
- platform connection,
- billing,
- analytics,
- experiments,
- audit logs.

The control plane must never hide why the system made a decision. Every generated item should expose:

- input signals,
- prompt/template used,
- model/provider,
- sources,
- policy events,
- render logs,
- publish logs,
- costs,
- analytics.

### 2. Intelligence Plane

Responsibilities:

- collect trend signals,
- score topics,
- cluster demand,
- identify competitors,
- detect saturation,
- identify evergreen ideas,
- map ideas to pillars and channels.

Inputs:

- platform APIs where allowed,
- search trend sources,
- RSS feeds,
- public web pages,
- channel analytics,
- comment sentiment,
- poll results,
- manually added topics,
- imported CSVs.

Outputs:

- `trend_signals`,
- `topic_clusters`,
- `opportunity_scores`,
- `content_briefs`.

### 3. Creation Plane

Responsibilities:

- generate briefs,
- generate scripts,
- extract claims,
- create storyboards,
- generate prompts,
- choose providers,
- create thumbnails,
- generate voice/audio,
- translate/localize,
- package metadata.

The creation plane must be template-driven. Prompts are not hidden one-offs; they are versioned assets with evaluations.

### 4. Media Plane

Responsibilities:

- asset ingestion,
- AI image/video/audio generation,
- media normalization,
- scene assembly,
- caption alignment,
- brand overlays,
- render queue,
- transcode,
- thumbnail export,
- quality checks.

Every render produces a manifest:

- source assets,
- template version,
- dimensions,
- duration,
- audio settings,
- caption mode,
- provider costs,
- output files,
- checksum,
- render logs,
- QA results.

### 5. PolicyOS Plane

Responsibilities:

- platform policy checks,
- AI-label requirements,
- rights checks,
- fact checks,
- duplication checks,
- sensitive topic risk,
- monetization risk,
- account health risk,
- human-review routing,
- incident logging.

PolicyOS must be callable before:

- brief approval,
- script approval,
- asset approval,
- render approval,
- publish approval,
- variant approval.

### 6. Distribution Plane

Responsibilities:

- platform account connections,
- OAuth/token refresh,
- platform-specific metadata,
- upload sessions,
- draft creation,
- direct publishing where approved,
- scheduling,
- retries,
- rate limiting,
- manual export when direct publishing is unavailable.

Publishing must be idempotent. A retry cannot create duplicate posts unless explicitly approved.

### 7. Measurement Plane

Responsibilities:

- ingest platform analytics,
- normalize metrics,
- track costs,
- track revenue,
- compute KPIs,
- detect winners,
- detect failures,
- feed optimization.

Metrics should be stored as snapshots because platform analytics values change over time.

### 8. Optimization Plane

Responsibilities:

- experiment design,
- prompt scoring,
- provider scoring,
- channel health scoring,
- hook/retention analysis,
- variant recommendation,
- scale/pause decisions.

The optimization layer must never bypass PolicyOS.

## Named Internal Modules

The build should use clear domain modules so the product can grow without becoming a pile of scripts.

| Module | Responsibility | Main Outputs |
| --- | --- | --- |
| TrendScout | Ingest trends, comments, seasonal signals, platform demand, competitor moves, and regional interest. | trend signals, ranked topics, opportunity scores |
| BriefForge | Convert demand into structured content briefs. | briefs, hooks, constraints, target KPIs |
| Scriptor | Generate scripts, overlays, captions, claims, titles, descriptions, CTAs, and variants. | scene timelines, claim lists, metadata options |
| Visual Planner | Decide whether a piece should use template, stock-hybrid, generative-hybrid, or full-generative production. | render plan, asset requirements, cost estimate |
| AssetGen | Create, retrieve, license, or import visual/audio assets. | asset records, rights records, prompts, previews |
| Renderer | Produce final media files. | MP4/WebM/JPG/PNG bundles, manifests |
| PolicyOS | Govern originality, rights, claims, labeling, brand safety, and platform policy. | pass/block/review decisions, policy events |
| PulsePost | Schedule, route, retry, publish, and export. | publish jobs, platform post IDs, manual packages |
| SignalLoop | Normalize analytics, compute rewards, run experiments, and feed optimization. | metric snapshots, reward snapshots, recommendations |
| ModelMesh | Route AI/provider calls by cost, quality, latency, risk, and tenant plan. | provider calls, cost logs, outputs |
| QuotaBroker | Reserve and track platform/API quota and rate-limit buckets. | token reservations, cool-downs, rate-limit state |
| IdempotencyLedger | Prevent accidental duplicate renders, webhooks, and posts. | idempotency records, conflict decisions |
| Human Exception Queue | Route bounded edge cases to people. | review tasks, SLAs, resolutions |

## Rendering Path Strategy

The newest master PDF makes an important architecture point: most output should be deterministic or semi-deterministic, not expensive full generative video.

| Path | Uses | Typical Use | Why It Matters |
| --- | --- | --- | --- |
| Template | Remotion, FFmpeg, internal assets, text, charts, maps, captions | polls, rankings, comparisons, text-led explainers | lowest cost, fastest QA, easiest monetization control |
| Stock Hybrid | licensed stock, overlays, narration, music, FFmpeg | emotional stories, utility, travel, broad b-roll formats | richer visuals without full generative cost |
| Generative Hybrid | LLMs, image generation, light motion, TTS, stock/template assembly | mystery reveals, novelty hooks, impossible concepts | controlled originality with bounded cost |
| Full Generative Video | text-to-video/image-to-video providers plus post-production | premium experiments, hero shots, cinematic openings | use only where ROI justifies cost and rights are clear |

Default production mix:

- 80 percent or more template/stock-hybrid.
- Generative hybrid for selected content that needs novelty.
- Full generative video for high-value experiments, long-form hero shots, or brand moments.

This is not a creativity compromise. It is the engineering choice that keeps cost, QA, rights, and monetization under control.

## QuotaBroker and IdempotencyLedger

Every outbound platform/API action must pass through QuotaBroker.

QuotaBroker responsibilities:

- track per-platform limits,
- track per-account limits,
- parse rate-limit headers,
- reserve publish/upload capacity,
- cool down adapters after 429s,
- prevent queue floods,
- expose quota heatmaps to the dashboard.

IdempotencyLedger responsibilities:

- prevent duplicate posts,
- prevent duplicate webhook processing,
- prevent duplicate billing updates,
- prevent repeated render jobs for the same exact manifest unless requested,
- store idempotency keys based on tenant, channel, asset hash, scheduled slot, and operation.

Publish state model:

- queued,
- auth_checked,
- quota_reserved,
- uploading,
- platform_processing,
- live,
- metrics_linked,
- failed,
- cancelled.

## SLOs

Initial service-level objectives:

| SLO | Target |
| --- | --- |
| Successful render completion | at least 98 percent |
| Successful publish completion after retries | at least 99 percent where platform supports direct publishing |
| Template-path p95 render latency | under 60 seconds |
| Publish-to-live confirmation p95 | under 5 minutes where platform supports status confirmation |
| Dashboard freshness p95 | under 15 minutes for supported analytics |
| False-positive compliance blocks | under 5 percent after tuning |
| Provider outage failover time | under 10 minutes for configured fallbacks |
| Queued job data loss | zero tolerated |

## Provider Router

The provider router abstracts AI providers and keeps the system from being locked to one vendor.

Provider categories:

- text models,
- reasoning models,
- image generation,
- video generation,
- voice,
- music/SFX,
- transcription,
- translation,
- embeddings,
- moderation/safety,
- fact retrieval/search.

Provider router requirements:

- provider credentials per tenant or system,
- cost estimate before job,
- actual cost after job,
- latency tracking,
- failure tracking,
- quality score,
- fallback provider,
- policy restrictions,
- model version logging,
- prompt version logging.

Potential providers from source docs and current market:

- OpenAI for text, images, speech, moderation, embeddings where appropriate.
- Anthropic for long-form reasoning and review workflows where available.
- Google models for multimodal generation and YouTube-adjacent workflows where appropriate.
- Runway, Luma, Pika, Kling, Veo, Sora, or other video providers where API access and rights terms support production.
- ElevenLabs, Cartesia, OpenAI TTS, or equivalent for voice.
- Suno/Udio or licensed music libraries only when commercial usage rights are clear.
- Local or open-source models for cost control where quality is acceptable.

Implementation rule: provider availability changes. The provider router should load providers from config and capability records, not from hard-coded assumptions.

## Data Model

### Identity and Tenancy

`tenants`

- id
- name
- slug
- billing_status
- default_locale
- default_timezone
- created_at
- updated_at

`users`

- id
- email
- name
- avatar_url
- status
- created_at
- updated_at

`memberships`

- id
- tenant_id
- user_id
- role
- permissions
- created_at
- updated_at

`audit_logs`

- id
- tenant_id
- actor_user_id
- action
- entity_type
- entity_id
- before_json
- after_json
- ip_address
- user_agent
- created_at

### Billing and Usage

`plans`

- id
- code
- name
- monthly_price
- included_credits
- included_seats
- limits_json
- paypal_product_id
- paypal_plan_id
- status

`subscriptions`

- id
- tenant_id
- plan_id
- paypal_subscription_id
- status
- current_period_start
- current_period_end
- cancel_at_period_end
- created_at
- updated_at

`paypal_webhook_events`

- id
- event_id
- event_type
- transmission_id
- verification_status
- resource_json
- processed_at
- created_at

`usage_events`

- id
- tenant_id
- user_id
- job_id
- content_item_id
- provider
- model
- operation
- units
- estimated_cost
- actual_cost
- credit_cost
- created_at

### Channel System

`content_pillars`

- id
- code
- name
- description
- default_risk_level
- policy_rules_json

`channel_templates`

- id
- pillar_id
- name
- description
- default_brand_json
- default_formats_json
- default_policy_json
- default_prompt_pack_id
- status

`channels`

- id
- tenant_id
- template_id
- name
- handle
- pillar_id
- language
- region
- timezone
- tone
- risk_level
- brand_json
- cadence_json
- monetization_json
- status
- created_at
- updated_at

`platform_accounts`

- id
- tenant_id
- platform
- display_name
- account_identifier
- oauth_status
- token_secret_ref
- scopes
- app_review_status
- account_health_status
- rate_limit_state_json
- created_at
- updated_at

`channel_platform_links`

- id
- channel_id
- platform_account_id
- platform_channel_id
- default_privacy
- default_settings_json
- status

### Intelligence and Briefs

`trend_signals`

- id
- tenant_id
- source
- source_url
- topic
- keywords
- language
- region
- volume_score
- velocity_score
- saturation_score
- risk_score
- freshness_score
- raw_json
- captured_at

`topic_clusters`

- id
- tenant_id
- name
- summary
- keywords
- opportunity_score
- risk_score
- status

`content_briefs`

- id
- tenant_id
- channel_id
- pillar_id
- topic_cluster_id
- title
- hook
- audience
- format
- platform_targets
- promise
- emotional_driver
- visual_direction
- claims_required
- monetization_angle
- risk_score
- status
- created_by
- created_at
- updated_at

### Scripts, Claims, and Sources

`scripts`

- id
- brief_id
- version
- script_text
- scene_json
- caption_json
- title_options
- description_options
- hashtag_options
- status
- prompt_version_id
- model
- created_at

`claims`

- id
- script_id
- claim_text
- claim_type
- confidence_score
- sensitivity_level
- verification_status
- reviewer_notes
- created_at

`sources`

- id
- tenant_id
- source_type
- url
- title
- publisher
- published_at
- accessed_at
- trust_score
- notes

`claim_sources`

- id
- claim_id
- source_id
- support_level
- notes

### Assets and Rights

`assets`

- id
- tenant_id
- asset_type
- storage_url
- preview_url
- source_type
- provider
- prompt
- source_url
- license_type
- rights_status
- content_hash
- metadata_json
- created_at

`asset_rights`

- id
- asset_id
- rights_holder
- license_url
- allowed_uses
- restrictions
- expiration_at
- proof_storage_url
- reviewed_by
- reviewed_at

`asset_usage`

- id
- asset_id
- content_item_id
- render_id
- usage_context
- created_at

### Renders and Packages

`content_items`

- id
- tenant_id
- channel_id
- brief_id
- script_id
- title
- status
- risk_score
- target_publish_at
- created_at
- updated_at

`renders`

- id
- content_item_id
- render_profile
- aspect_ratio
- duration_seconds
- storage_url
- thumbnail_url
- captions_url
- manifest_json
- qa_status
- status
- created_at

`platform_packages`

- id
- content_item_id
- render_id
- platform
- platform_account_id
- title
- description
- caption
- hashtags
- thumbnail_url
- privacy_status
- ai_label_required
- ai_label_value
- sponsor_disclosure_required
- metadata_json
- policy_status
- publish_status
- scheduled_at
- created_at

`posts`

- id
- platform_package_id
- platform
- platform_post_id
- platform_url
- publish_status
- published_at
- failure_reason
- retry_count
- created_at
- updated_at

### Analytics and Optimization

`analytics_snapshots`

- id
- post_id
- snapshot_at
- views
- impressions
- watch_time_seconds
- avg_view_duration
- retention_json
- likes
- comments
- shares
- saves
- click_through_rate
- followers_gained
- revenue
- raw_json

`experiments`

- id
- tenant_id
- name
- hypothesis
- metric
- status
- start_at
- end_at
- result_json

`experiment_variants`

- id
- experiment_id
- content_item_id
- variant_type
- hypothesis
- result_score

`optimization_actions`

- id
- tenant_id
- channel_id
- action_type
- reason
- evidence_json
- status
- created_at
- resolved_at

### Policy, Defects, and Incidents

`policy_events`

- id
- tenant_id
- entity_type
- entity_id
- policy_module
- rule_code
- severity
- status
- message
- evidence_json
- reviewer_user_id
- created_at
- resolved_at

`defects`

- id
- tenant_id
- stage
- defect_type
- severity
- entity_type
- entity_id
- root_cause
- corrective_action
- preventive_action
- status
- created_at
- closed_at

`incidents`

- id
- tenant_id
- incident_type
- severity
- platform
- account_id
- summary
- timeline_json
- owner_user_id
- status
- created_at
- resolved_at

## API Design

API should be modular by domain:

- `/api/tenants`
- `/api/channels`
- `/api/trends`
- `/api/briefs`
- `/api/scripts`
- `/api/assets`
- `/api/renders`
- `/api/policy`
- `/api/packages`
- `/api/publish`
- `/api/analytics`
- `/api/experiments`
- `/api/billing`
- `/api/providers`
- `/api/admin`

Key principles:

- all routes scoped by tenant,
- role checks on every mutation,
- immutable audit log for important actions,
- idempotency keys for generation, render, and publish actions,
- signed URLs for media,
- no raw provider secrets in app database,
- structured error codes,
- retryable job status,
- webhooks verified before processing.

## Job Status Model

Every long-running operation should follow a shared status model:

- queued,
- running,
- blocked,
- needs_review,
- failed,
- succeeded,
- cancelled.

Every job stores:

- input JSON,
- output JSON,
- logs,
- provider calls,
- cost,
- retries,
- parent job,
- child jobs,
- policy events,
- created_at,
- started_at,
- completed_at.

## Internationalization

The system should support any language, region, and timezone by design.

Requirements:

- tenant default locale,
- channel locale,
- platform locale,
- title/caption translation,
- region-specific cultural review,
- right-to-left support in UI and caption rendering,
- region-sensitive forbidden terms,
- local holiday/event calendars,
- localized hashtag rules,
- local monetization restrictions,
- local privacy and data-retention rules where needed.

## Security

Security requirements:

- tenant isolation at database query level,
- row-level security where practical,
- encrypted secrets,
- OAuth token refresh management,
- least-privilege platform scopes,
- audit logs,
- admin impersonation logging,
- webhook signature verification,
- rate-limit abuse controls,
- signed media URLs,
- content export permission checks,
- deletion and retention policy.

## Observability

Observability must cover:

- app errors,
- worker errors,
- job latency,
- provider latency,
- provider failure rate,
- render failure rate,
- publish failure rate,
- policy block rate,
- cost per content item,
- queue depth,
- rate-limit usage,
- webhook failures,
- billing failures.

Recommended tools:

- OpenTelemetry,
- Sentry,
- structured logs,
- Postgres event tables,
- dashboard metrics,
- alerting for critical failures.

## Environments

Environments:

- local development,
- test,
- staging,
- production.

Staging must include:

- sandbox PayPal,
- platform sandbox or private/draft posting where available,
- fake providers for low-cost tests,
- seeded channel templates,
- synthetic analytics,
- policy test cases.

Production must include:

- secret rotation,
- provider budgets,
- publish rate caps,
- incident alerts,
- backup and restore,
- tenant billing enforcement,
- admin audit logs.
