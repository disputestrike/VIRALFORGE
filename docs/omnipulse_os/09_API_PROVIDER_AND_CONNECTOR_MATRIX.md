# API Provider and Connector Matrix

## Purpose

This matrix turns the API research and platform plans into implementation modules. Exact limits and permissions must be verified during implementation because APIs change often.

## Connector Classes

### AI Provider Connector

Used for:

- text,
- reasoning,
- image,
- video,
- audio,
- transcription,
- translation,
- moderation,
- embeddings,
- search/retrieval.

Required interface:

- `provider_code`
- `capabilities`
- `models`
- `credential_mode`
- `tenant_key_allowed`
- `system_key_allowed`
- `input_schema`
- `output_schema`
- `cost_estimator`
- `usage_parser`
- `quality_metrics`
- `retry_policy`
- `fallback_policy`
- `terms_notes`
- `last_verified_at`

### Platform Connector

Used for:

- account connection,
- upload,
- publishing,
- scheduling,
- analytics,
- comments,
- post status,
- account health.

Required interface:

- `platform`
- `auth_type`
- `scopes`
- `capabilities`
- `content_types`
- `media_requirements`
- `metadata_requirements`
- `rate_limit_strategy`
- `ai_label_support`
- `sponsor_disclosure_support`
- `analytics_support`
- `manual_export_support`
- `last_verified_at`

### Payment Connector

Used for:

- subscriptions,
- plan changes,
- cancellations,
- payment events,
- webhooks,
- invoices/revenue records.

Required interface:

- `provider`
- `environment`
- `product_id`
- `plan_id`
- `subscription_id`
- `webhook_id`
- `verification_method`
- `event_map`
- `reconciliation_job`

## AI Provider Matrix

| Category | Candidate Providers | Use Cases | Critical Checks |
| --- | --- | --- | --- |
| Text and reasoning | OpenAI, Anthropic, Google, Groq, Cerebras, local models | briefs, scripts, policy review, summaries, analysis, metadata | quality, cost, hallucination, latency, data usage terms |
| Image generation | OpenAI image models, Flux, SDXL, Midjourney where API/workflow permits | thumbnails, stills, backgrounds, concepts, overlays | commercial rights, watermark, style/IP safety, prompt logging |
| Video generation | Runway, Luma, Pika, Kling, Veo, Sora where API/access permits | short clips, b-roll, visual loops, transformations | rights terms, cost, consistency, API availability, realism risk |
| Documentary assembly / AI video tool | InVideo or similar all-in-one tools where API/enterprise access exists | draft long-form chapters, stock-footage assembly, benchmark workflows | public API availability, commercial terms, maximum duration, export rights, cost |
| Voice | ElevenLabs, Cartesia, OpenAI TTS, Azure/Google voices | narration, character voice, multilingual audio | commercial rights, voice consent, clone restrictions, audio quality |
| Music/SFX | licensed libraries, Suno/Udio only if commercial rights are clear | background music, effects, sonic branding | copyright, commercial license, platform claims, reuse rights |
| Transcription | OpenAI Whisper/API, Deepgram, AssemblyAI | captions, source transcription, alignment | accuracy, language support, timestamp quality, cost |
| Translation | OpenAI, DeepL, Google Translate, Microsoft Translator | localization, captions, titles, descriptions | cultural accuracy, sensitive language, right-to-left support |
| Moderation | OpenAI moderation, platform safety APIs where available, custom rules | safety screening, sensitive content | false negatives, false positives, policy mapping |
| Embeddings/search | OpenAI embeddings, pgvector, vector DBs | dedupe, memory, topic clustering, asset search | privacy, cost, similarity thresholds |

## Provider Routing Rules

The system should choose providers based on:

- capability,
- tenant plan,
- cost ceiling,
- expected quality,
- language,
- content risk,
- latency requirement,
- fallback availability,
- rights terms.

Example routing:

- high-risk script review: strongest reasoning model,
- cheap idea expansion: lower-cost text model,
- final policy check: approved moderation/policy stack,
- visual loop: video provider with acceptable commercial terms,
- multilingual captions: translation provider with target language strength.

## Usage Accounting

Every provider call must record:

- tenant,
- job,
- provider,
- model,
- operation,
- input size,
- output size,
- estimated cost,
- actual cost,
- latency,
- error code,
- retry count,
- prompt version,
- output hash.

## Social Platform Matrix

| Platform | Initial Role | Direct Publish | Manual Export | Analytics | Notes |
| --- | --- | --- | --- | --- | --- |
| YouTube | Shorts and long-form anchor | Yes through Data API when verified | Yes | Yes through Analytics API later | Start private/unlisted until audit/account trust is proven. |
| TikTok | short-form reach | Yes through Content Posting API when app/scopes allow | Yes | Limited/verify | Must handle `is_aigc`, privacy options, and app review constraints. |
| Instagram/Facebook | Reels and feed reach | Graph API where eligible and approved | Yes | Insights where permissions allow | Verify current endpoints and business/professional account requirements. |
| X | conversation and distribution | API plan dependent | Yes | API plan dependent | Rate limits and economics must be watched carefully. |
| LinkedIn | professional content | Yes where Marketing API permissions allow | Yes | Available through APIs depending permissions | Use for professional/tech/business channels. |
| Pinterest | evergreen visual/utility discovery | API v5 where access allows | Yes | Available depending access | Strong for DIY, utility, rankings, and visual loops. |
| Reddit | community signal and selective posting | Possible through API, but manual review required | Yes | Limited | Research/listening first. Subreddit rules dominate. |
| Threads | future social distribution | Verify official API support | Yes | Verify | Add only after official connector is clear. |
| Snapchat | future short-form/stories distribution | Public Profile API is allowlist/permission sensitive | Yes | Verify | Treat as phase-two connector after account/app eligibility is confirmed. |
| Telegram | durable channel syndication | Bot API can post to channels where bot is admin | Yes | Limited | Useful for owned distribution, community updates, and long-form drops. |

## Endpoint-Level Build Checklist

### YouTube

Build modules:

- OAuth connection,
- channel/account selection,
- video upload,
- metadata update,
- thumbnail upload,
- captions support,
- status polling,
- analytics import,
- quota tracking.

Required stored fields:

- video ID,
- channel ID,
- upload status,
- privacy,
- title,
- description,
- tags,
- category,
- made-for-kids flag,
- thumbnail,
- caption status,
- quota cost.

### TikTok

Build modules:

- OAuth connection,
- creator info query,
- privacy options query,
- direct post init,
- upload handling,
- status check,
- error handling,
- AI-generated flag support,
- commercial disclosure support.

Required stored fields:

- creator ID,
- allowed privacy levels,
- post/publish ID,
- `is_aigc`,
- brand/commercial flags,
- token limit state,
- publish status.

### Meta

Build modules after verification:

- Facebook/Instagram OAuth,
- account/page selection,
- media container creation,
- media publish,
- status check,
- insights import,
- disclosure field handling where available.

Required stored fields:

- page/account ID,
- media container ID,
- published media ID,
- caption,
- cover image,
- permissions,
- app review status.

### X

Build modules:

- OAuth connection,
- media upload where available,
- post creation,
- rate-limit header parser,
- post metrics import where available,
- failure handling.

Required stored fields:

- tweet/post ID,
- media IDs,
- rate-limit limit,
- rate-limit remaining,
- rate-limit reset,
- API plan marker.

### LinkedIn

Build modules:

- OAuth connection,
- organization/member selection,
- video initialize/register,
- video upload,
- post creation with video,
- analytics import where allowed.

Required stored fields:

- member/person URN,
- organization URN,
- video URN,
- post/share URN,
- API version,
- permissions.

### Pinterest

Build modules:

- OAuth connection,
- board selection,
- media upload if applicable,
- Pin creation,
- analytics import,
- rate-limit parser.

Required stored fields:

- board ID,
- pin ID,
- media ID,
- title,
- description,
- destination link,
- rate-limit state.

### Reddit

Build modules:

- OAuth connection,
- subreddit lookup,
- subreddit rules storage,
- submit draft,
- manual review,
- post submission if approved,
- comment monitoring where allowed.

Required stored fields:

- subreddit,
- rules snapshot,
- post kind,
- title,
- URL/text,
- flair,
- disclosure,
- permalink,
- manual reviewer.

### Snapchat

Build modules after eligibility is verified:

- OAuth connection,
- public profile selection,
- media upload,
- story/spotlight post creation where allowed,
- status check,
- analytics import if available.

Required stored fields:

- public profile ID,
- media ID,
- story/spotlight ID,
- allowlist/app status,
- token state,
- publish status.

### Telegram

Build modules:

- bot token management,
- channel admin verification,
- send message,
- send video,
- send document,
- post status/logging,
- optional local Bot API server support for large uploads.

Required stored fields:

- bot ID,
- channel ID,
- message ID,
- media file ID,
- upload mode,
- post URL or message reference.

## Payment API Matrix

| Provider | Role | Required Features |
| --- | --- | --- |
| PayPal | Required billing integration | products, plans, subscriptions, approval flow, webhooks, sandbox/live separation, reconciliation |

PayPal modules:

- product setup,
- plan setup,
- subscription approval,
- webhook verification,
- subscription status sync,
- payment event handling,
- billing admin view,
- reconciliation job.

## Connector Versioning

Every connector should have:

- `connector_version`,
- `docs_url`,
- `last_verified_at`,
- `verified_by`,
- `capability_status`,
- `known_limitations`,
- `breaking_change_notes`.

Capability statuses:

- planned,
- manual_export_only,
- sandbox_ready,
- private_publish_ready,
- production_ready,
- paused,
- deprecated.

## Capability Registry Example

```json
{
  "platform": "tiktok",
  "capability": "direct_video_publish",
  "status": "sandbox_ready",
  "required_scopes": ["video.publish"],
  "requires_app_review": true,
  "supports_ai_label": true,
  "supports_sponsor_disclosure": true,
  "manual_export_fallback": true,
  "last_verified_at": "2026-05-17"
}
```

## API Risk Register

| Risk | Mitigation |
| --- | --- |
| API changes after implementation | Connector versioning and scheduled verification. |
| App review blocks direct publishing | Manual export and private/sandbox modes. |
| Quota limits stop uploads | Rate-limit tracking and queue throttling. |
| Platform rejects AI content | AI label engine and platform-specific policy rules. |
| Provider cost spikes | Budgets, provider routing, usage ledger. |
| Provider terms restrict commercial use | Rights engine and provider capability flags. |
| Tenant key leaks | Secret manager, encrypted references, audit logs. |
| Webhook spoofing | Signature verification and event dedupe. |
