# Financial Model and Unit Economics

## Purpose

The source bundle includes monetization research, cost research, a financial potential report, and a Python projection script. This document converts those into a practical financial operating model for the build.

The financial model must not be fantasy math. It should be a living model connected to real usage, platform analytics, provider invoices, SaaS subscriptions, and content performance.

## Revenue Thesis

The system should not depend on one revenue stream.

Revenue layers:

1. Owned media platform revenue.
2. Affiliate and CPA revenue.
3. Sponsorship and branded content.
4. Digital products and lead magnets.
5. Poll/data/report products.
6. Licensing content or templates.
7. SaaS subscriptions.
8. Usage credits and add-ons.
9. Agency/managed-service packages.

## Owned Network Revenue

Potential sources:

- YouTube ad revenue once eligible,
- platform creator programs where available,
- sponsorships,
- affiliate links,
- product placements,
- newsletter funnels,
- digital downloads,
- paid communities,
- poll result reports,
- licensing content packages.

Important constraint:

- platform monetization eligibility depends on originality, policy compliance, audience quality, and account health. Revenue cannot be modeled as a simple views-times-RPM machine without a policy-quality multiplier.

## SaaS Revenue

SaaS sources:

- monthly subscriptions,
- annual subscriptions,
- usage credit packs,
- seat add-ons,
- extra channel packs,
- advanced analytics,
- white-label exports,
- premium templates,
- API access,
- enterprise support,
- managed production.

PayPal is the required billing integration.

## Cost Categories

### Fixed Costs

- hosting,
- database,
- object storage,
- logging/monitoring,
- domain and email,
- design/assets,
- SaaS support tools,
- compliance/legal review,
- accounting/admin,
- baseline team tools.

### Variable AI Costs

- text generation,
- image generation,
- video generation,
- voice generation,
- music/SFX,
- long-form research,
- documentary voiceover minutes,
- documentary chapter renders,
- stock-footage licensing,
- transcription,
- translation,
- moderation,
- embeddings/search,
- rerenders,
- failed generations.

### Platform Costs

- API plans,
- developer verification,
- app review overhead,
- aggregator tools if used,
- social account management,
- analytics tools.

### Human Review Costs

- fact review,
- policy review,
- rights review,
- brand review,
- customer support,
- incident handling.

## Unit Economics Per Content Item

Every content item should calculate:

- trend research cost,
- script generation cost,
- source/fact-check cost,
- asset generation cost,
- voice/audio cost,
- render cost,
- storage cost,
- policy/review cost,
- publish cost,
- analytics cost,
- total cost,
- revenue attributed,
- ROI,
- payback period.

## Unit Economics Per Documentary

Documentaries need a separate financial model because they consume more research, narration, footage, render time, and review.

Track:

- target minutes,
- finished minutes,
- research cost,
- script cost,
- source/fact-review cost,
- voiceover cost,
- stock/generative visual cost,
- music cost,
- chapter render cost,
- assembly cost,
- human review cost,
- total cost,
- cost per finished minute,
- full-video revenue,
- cutdown revenue,
- affiliate/sponsor revenue,
- source library reuse value,
- total ROI.

Financial rule:

- a documentary is justified when it either earns directly, produces high-performing cutdowns, builds authority for a channel, or creates reusable research/source assets for multiple future outputs.

Minimum required fields:

- `content_item_id`
- `total_provider_cost`
- `total_infra_cost_estimate`
- `human_review_cost_estimate`
- `total_cost`
- `revenue_7d`
- `revenue_30d`
- `revenue_90d`
- `gross_margin`
- `profit_status`

## Projection Model From Source Bundle

The uploaded Python model used the following broad structure:

- daily master videos,
- average views per video,
- RPM,
- fixed monthly costs,
- cost per master video,
- scenario outputs.

Keep that model, but upgrade it.

## Upgraded Projection Inputs

### Production Inputs

- daily content items generated,
- daily content items approved,
- daily content items published,
- number of channels,
- number of platforms,
- render variants per item,
- language variants per item,
- approval pass rate,
- render failure rate,
- policy block rate.

### Performance Inputs

- average views per platform,
- median views per platform,
- P90 views,
- retention,
- CTR,
- saves,
- shares,
- follower conversion,
- monetized view percentage,
- RPM by platform,
- affiliate click rate,
- affiliate conversion rate,
- sponsorship fill rate.

### Cost Inputs

- text cost per item,
- image cost per item,
- video cost per item,
- voice cost per item,
- music cost per item,
- render cost per item,
- storage cost per GB,
- review cost per item,
- platform/API cost,
- fixed operating cost.

### SaaS Inputs

- free users,
- paid tenants,
- ARPU,
- churn,
- plan mix,
- credits consumed,
- gross margin,
- PayPal fees,
- support cost,
- onboarding cost.

## Financial Scenarios

### Conservative Scenario

Assumptions:

- low output volume,
- manual review heavy,
- limited direct publishing,
- slow channel growth,
- revenue mostly indirect or future,
- SaaS not launched.

Goal:

- prove quality and process,
- avoid account risk,
- control burn.

### Base Scenario

Assumptions:

- 3 to 5 channels active,
- 2 to 3 platforms active,
- repeatable render templates,
- analytics loop working,
- some affiliate/sponsor experiments,
- SaaS beta starts.

Goal:

- show content-machine repeatability,
- identify winning formats,
- build first recurring revenue.

### Aggressive Scenario

Assumptions:

- 10+ channel families,
- multiple platforms,
- multilingual variants,
- direct publishing where approved,
- strong analytics,
- SaaS paid plan live,
- templates and credit packs.

Goal:

- compound owned media growth,
- convert product into SaaS business.

## Financial Controls

Required controls:

- provider budget per tenant,
- provider budget per channel,
- cost ceiling per content item,
- approval required above cost threshold,
- automatic stop when cost/revenue ratio worsens,
- monthly model vs actual review,
- provider pricing verification,
- PayPal fee accounting,
- usage credit reconciliation.

Documentary-specific controls:

- require cost estimate before chapter production,
- require approval before full generative hero-shot batches,
- cap cost per finished minute,
- generate one pilot chapter before full 60-minute production,
- stop production if source coverage is too weak,
- reuse research across cutdowns and future episodes.

## Cost Kill Switches

Stop or require approval when:

- video generation cost exceeds budget,
- rerender count exceeds threshold,
- policy block rate wastes generation cost,
- provider failure rate spikes,
- storage grows unexpectedly,
- free tenant usage exceeds cap,
- SaaS tenant payment fails,
- channel is not earning or learning.

## Monetization By Pillar

### Provocative Fixes

Revenue:

- sponsorships,
- affiliates,
- newsletter,
- creator products.

Risk:

- policy/account health,
- brand safety.

### Visual Addiction

Revenue:

- platform revenue,
- licensing loops,
- background/ambient compilations,
- brand-safe sponsorships.

Risk:

- originality,
- music rights,
- low monetization if too repetitive.

### Curiosity/Facts

Revenue:

- platform revenue,
- sponsorship,
- educational products,
- newsletters,
- affiliate to books/tools.

Risk:

- fact errors,
- reused/low-effort monetization issues.

### Rankings/Comparisons

Revenue:

- affiliates,
- sponsorships,
- buyer guides,
- product pages,
- newsletters.

Risk:

- disclosure,
- defamation,
- ranking credibility.

### Utility/Hacks

Revenue:

- affiliates,
- digital products,
- sponsorships,
- platform revenue,
- Pinterest/search discovery.

Risk:

- unsafe advice,
- exaggerated claims.

### Emotional Stories

Revenue:

- platform revenue,
- compilations,
- sponsorship,
- fiction products.

Risk:

- fake-real presentation,
- sensitive content.

### PulseWorld

Revenue:

- platform content,
- sponsorships,
- poll reports,
- trend intelligence,
- newsletter,
- SaaS poll tools.

Risk:

- sampling claims,
- privacy,
- sensitive topics.

## SaaS Metrics

Track:

- MRR,
- ARR,
- new paid tenants,
- churn,
- ARPU,
- average credits used,
- gross margin,
- PayPal payment success,
- failed payments,
- trial conversion,
- activation rate,
- content items per tenant,
- direct publish adoption,
- support tickets per tenant,
- policy incidents per tenant.

## Owned Media Metrics

Track:

- views,
- monetized views,
- RPM,
- revenue per 1,000 views,
- cost per 1,000 views,
- gross margin per video,
- profit per channel,
- profit per pillar,
- revenue per provider dollar,
- revenue per render minute,
- sponsor conversion,
- affiliate conversion.

## Financial Dashboard

Dashboard sections:

- today cost,
- month-to-date cost,
- revenue,
- gross margin,
- provider spend by category,
- content ROI,
- channel ROI,
- pillar ROI,
- SaaS MRR,
- PayPal events,
- failed payments,
- budget warnings.

## Financial Definition Of Done

Every production workflow is financially done only when:

- usage is metered,
- cost is attributed,
- revenue can attach later,
- plan limits apply,
- budget alerts exist,
- provider cost is visible,
- billing event is auditable.

## Strategic Financial Decision

The first financial goal is not immediate maximum revenue. It is controlled proof:

- prove content can be produced safely,
- prove audience signals improve output,
- prove unit costs are trackable,
- prove publishing does not damage accounts,
- prove SaaS billing can meter usage,
- then scale what works.
