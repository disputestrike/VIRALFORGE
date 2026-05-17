# Platform API and Posting Rules

## Purpose

This document defines how platform publishing should be built. It is not a static promise that every platform supports every workflow today. APIs, scopes, review requirements, quotas, and policy rules change. The product must treat platform support as a versioned connector system.

The rule is simple:

> Official API first. Verified capability second. Manual export fallback when direct publishing is blocked, unavailable, or risky.

## Connector Design

Each platform connector must define:

- platform name,
- supported content types,
- authentication method,
- scopes,
- app review status,
- account permission requirements,
- direct publish support,
- draft support,
- upload method,
- rate limits,
- file requirements,
- caption/title limits,
- hashtag behavior,
- AI-label fields,
- branded-content disclosure fields,
- privacy fields,
- comment settings,
- analytics support,
- webhook support,
- failure codes,
- retry policy,
- manual fallback steps,
- last verified date,
- official documentation URL.

Do not hard-code rate limits or upload assumptions in publishing logic. Store them as connector configuration and refresh them during implementation reviews.

## Universal Posting Rules

These rules apply before any platform-specific adapter runs:

1. The content item must have an approved render.
2. The render must have a manifest and checksum.
3. Every source asset must have rights status.
4. Every factual claim must be verified, removed, or marked for human review.
5. The content must pass duplicate/originality checks.
6. The platform package must use platform-native metadata.
7. AI disclosure must be set when required by platform, law, ad policy, or brand rule.
8. Sponsored, affiliate, or paid placement disclosure must be set when required.
9. Rate-limit and account-health checks must pass.
10. Idempotency must prevent accidental duplicate posts.
11. The platform package must record all policy decisions.
12. High-risk topics must route to human review.

## YouTube

Official sources:

- YouTube Data API `videos.insert`: https://developers.google.com/youtube/v3/docs/videos/insert
- YouTube channel monetization policies: https://support.google.com/youtube/answer/1311392

Connector capabilities:

- upload videos through `videos.insert`,
- set metadata,
- set privacy status where permitted,
- read video/channel metadata,
- ingest analytics through YouTube Analytics API later,
- support captions and thumbnails through relevant endpoints where approved.

Important current constraints from official docs:

- `videos.insert` supports media upload and metadata.
- Uploaded media must be video-compatible.
- Current docs list quota cost for `videos.insert`; connector must read official quota docs and store the verified cost.
- API projects created after July 28, 2020 that are unverified can have uploads restricted to private viewing until API audit compliance is complete.
- YouTube monetization policies warn against inauthentic, repetitive, mass-produced, reused, and low-effort content.

Implementation rules:

- Start YouTube publishing in private/unlisted/draft-like workflow until audit and account trust are solved.
- Track upload quota per project.
- Treat repetitive template output as a monetization defect.
- Store title, description, tags, category, privacy, made-for-kids setting, license setting, thumbnail, captions, and AI/synthetic disclosure notes when applicable.
- Keep evidence that every video is original or meaningfully transformed.
- Do not scale YouTube volume before channel retention, policy, and monetization health are proven.

Content QA:

- no reused clips without rights,
- no near-duplicate reposting,
- no misleading thumbnails,
- no unsupported factual claims,
- no metadata spam,
- no keyword stuffing,
- no deceptive AI persona.

## TikTok

Official sources:

- Content Posting API Direct Post: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
- Content Posting API get started: https://developers.tiktok.com/doc/content-posting-api-get-started

Connector capabilities:

- initialize direct video post where app approval and scopes allow,
- upload from URL or file depending on API mode,
- set caption/title,
- set privacy,
- set AI-generated-content indicator where required,
- set brand-content and commercial disclosure fields where applicable,
- query creator info and allowed privacy options.

Important current constraints from official docs:

- Direct post endpoint uses `/v2/post/publish/video/init/`.
- Required scope includes `video.publish`.
- `is_aigc` is available to mark AI-generated content.
- Privacy level must match the creator's returned privacy options.
- User access tokens have strict request limits.
- App audit/review status affects public posting capability.

Implementation rules:

- Always query creator info before creating a package.
- Store allowed privacy options per account.
- Default to private/self-only in testing.
- Require `is_aigc=true` when content is AI generated and the platform requires or supports it.
- Preserve commercial disclosure state.
- Avoid mass identical uploads across accounts.
- Respect per-user token limits.

Content QA:

- first 1 to 2 seconds must be strong,
- captions must fit mobile safe areas,
- no platform watermark recycling,
- no copied TikTok content,
- no deceptive synthetic identity.

## Instagram and Facebook

Official source area:

- Meta Graph API and Instagram Platform documentation: https://developers.facebook.com/docs/

Connector capabilities to verify:

- Instagram Reels publishing for eligible professional accounts,
- media container creation,
- publish media,
- Facebook Page video/Reels publishing,
- analytics/insights where permissions allow,
- branded content and disclosure fields where available.

Implementation-time verification required:

- current Instagram content publishing endpoint paths,
- account type requirements,
- app review permissions,
- Reels availability,
- media URL hosting requirements,
- video length/format constraints,
- rate limits,
- Threads publishing if added.

Implementation rules:

- Treat Meta as official Graph API only.
- Do not assume personal account publishing.
- Require connected professional/business account where needed.
- Store app review status per permission.
- Use manual export until direct publishing is approved and verified.
- Keep captions, hashtags, cover image, aspect ratio, and disclosure fields platform-native.

Content QA:

- cover image must be readable,
- no unsupported music,
- no stolen Reels/TikTok reuse,
- disclosures included for affiliate/sponsored content,
- no dark-pattern engagement bait.

## X

Official source:

- X API rate limits: https://docs.x.com/x-api/fundamentals/rate-limits

Connector capabilities:

- create posts where plan and access allow,
- upload media where access allows,
- read metrics/analytics where access allows,
- monitor rate-limit headers,
- use OAuth user context for posting.

Important current constraints:

- X rate limits are endpoint-specific.
- `POST /2/tweets` has per-user and per-app limits.
- The connector must read `x-rate-limit-limit`, `x-rate-limit-remaining`, and `x-rate-limit-reset` headers.
- Usage billing and rate limits are separate.

Implementation rules:

- Store current rate-limit state after every call.
- Use idempotency around posting.
- Use short-form native copy, not pasted YouTube descriptions.
- Avoid automated reply spam, quote spam, hashtag spam, or trend hijacking.
- Treat paid API plan changes as connector configuration.

Content QA:

- no mass replies,
- no impersonation,
- no deceptive screenshots,
- no unsupported breaking-news claims,
- media must be sized and compressed for X limits.

## LinkedIn

Official source:

- LinkedIn Videos API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/videos-api

Connector capabilities:

- upload video using the Videos API,
- attach uploaded video to posts where permitted,
- support organization or member posting depending on permissions,
- support captions/thumbnail functionality where available.

Important current constraints from official docs:

- LinkedIn Marketing APIs are versioned.
- The Videos API replaces older Assets API flows.
- Permissions such as `w_organization_social` and `w_member_social` may be required.
- Organization posting requires appropriate page admin/content permissions.
- LinkedIn video file requirements include MP4 and specified duration/file-size ranges.

Implementation rules:

- Store LinkedIn API version per connector.
- Build migration readiness because versioned APIs sunset.
- Validate organization/admin permissions before scheduling.
- Keep LinkedIn tone professional and less clickbait-heavy.
- Use LinkedIn for business, work, trend intelligence, creator economy, and professional explainers rather than every entertainment format.

Content QA:

- strong but professional hooks,
- no spammy hashtags,
- no mass-posted low-effort videos,
- captions and thumbnails appropriate for feed viewing.

## Pinterest

Official sources:

- Pinterest API v5 documentation: https://developers.pinterest.com/docs/api/v5/
- Pinterest rate limits: https://developers.pinterest.com/docs/reference/rate-limits/

Connector capabilities:

- create Pins where permissions allow,
- create boards/sections where permissions allow,
- upload or attach media according to API support,
- ingest analytics where available.

Important current constraints from official docs:

- Pinterest enforces universal and endpoint/category rate limits.
- Trial and standard access differ.
- Standard access can be much higher than trial access, but specific categories apply.
- Rate-limit headers must be monitored.

Implementation rules:

- Pinterest is best for evergreen utility, visual comparison, DIY, infographics, product/affiliate, and satisfying visual content.
- Store board strategy per channel.
- Do not flood similar Pins.
- Use text overlays that remain readable in feed and search.
- Respect trial/standard access limits.

Content QA:

- image/video must be useful or visually strong,
- title/description must be search-oriented,
- affiliate disclosure where needed,
- no thin auto-generated duplicate Pin batches.

## Reddit

Official source:

- Reddit API docs: https://www.reddit.com/dev/api/

Connector capabilities:

- submit posts through `/api/submit` where OAuth scopes and subreddit rules allow,
- read subreddit rules and metadata where available,
- monitor comments where allowed,
- use Reddit as research and community signal with care.

Implementation rules:

- Reddit is not a broadcast dumping ground.
- Every subreddit has its own rules.
- Require subreddit-specific review before posting.
- Default Reddit to research/listening first, not automated posting.
- Use strong User-Agent and OAuth compliance.
- Do not post promotional or AI-generated content into communities that disallow it.
- Do not use vote manipulation, sockpuppets, mass accounts, or synthetic engagement.

Content QA:

- subreddit rule check,
- self-promotion check,
- community tone check,
- disclosure check,
- manual review required for posting until trust is built.

## Threads, Snapchat, WhatsApp, Telegram, and Other Platforms

These should be added as connector modules only after official support is verified.

Rules:

- no browser automation for posting unless explicitly allowed and reviewed,
- no scraping private data,
- no automation that violates terms,
- manual export is acceptable,
- partner/API routes should be documented before build.

## Aggregators

Potential aggregators from source docs include tools such as Ayrshare, Buffer, or similar scheduling APIs.

Aggregator policy:

- Useful for early MVP or unsupported platforms.
- Must not hide platform policy responsibility.
- Must expose post IDs, failure reasons, and analytics.
- Must support tenant separation.
- Must support clear cost accounting.
- Must not become a blocker to official adapters later.

Decision:

- Build internal connector interface first.
- Use aggregators as adapter implementations only when they pass compliance and data requirements.

## Posting Cadence Controls

Cadence must be controlled at multiple levels:

- tenant,
- platform,
- platform account,
- channel,
- content pillar,
- risk level,
- API quota,
- account health,
- monetization status.

Publishing should stop or slow when:

- policy blocks rise,
- duplicate score rises,
- publish failures rise,
- account warnings appear,
- negative feedback rises,
- cost exceeds budget,
- retention drops below threshold,
- platform API rate limits approach exhaustion.

## Manual Export Package

Every platform package should be exportable even when direct publishing is unavailable.

Export package includes:

- video file,
- thumbnail,
- captions,
- title,
- description/caption,
- hashtags,
- disclosure text,
- platform-specific settings checklist,
- policy pass report,
- rights/provenance summary,
- recommended post time.

This protects the roadmap when APIs are blocked by review, quotas, or permissions.
