# Compliance and PolicyOS

## Core Principle

Compliance must be embedded in the system, not added at the end. Every idea, asset, script, render, package, and post must carry policy state.

PolicyOS is the internal governance layer that decides whether content can move forward.

## PolicyOS Mission

PolicyOS protects:

- platform accounts,
- monetization eligibility,
- brand trust,
- audience safety,
- legal rights,
- factual integrity,
- SaaS customer safety,
- long-term scalability.

## PolicyOS Modules

### 1. Rights Engine

Purpose:

- verify asset ownership,
- confirm license terms,
- prevent unlicensed copyrighted use,
- track expiry and restrictions.

Checks:

- stock license,
- generated asset provider terms,
- music license,
- voice license,
- source footage permission,
- public-domain status,
- attribution requirement,
- commercial-use permission.

Required records:

- asset origin,
- provider,
- prompt/source,
- license URL,
- proof file,
- restrictions,
- expiration,
- reviewer.

Blocking defects:

- unknown asset source,
- missing commercial rights,
- copyrighted music without license,
- ripped platform video,
- unverifiable footage,
- voice clone without consent.

### 2. Originality Engine

Purpose:

- prevent duplicate spam,
- detect near-duplicate scripts,
- prevent reused media dependency,
- protect monetization eligibility.

Checks:

- script similarity,
- title/caption similarity,
- render perceptual hash,
- audio fingerprint where available,
- thumbnail similarity,
- template overuse,
- repeated hook patterns,
- repeated stock/generic footage.

Allowed:

- format consistency,
- branded templates,
- recurring series,
- materially transformed variants.

Blocked:

- same content posted repeatedly,
- minor synonym rewrites,
- visual-only color swaps,
- duplicate posts across channels,
- mass-produced low-effort clips.

### 3. Fact Engine

Purpose:

- prevent false or unsupported factual claims.

Checks:

- extract claims from scripts and captions,
- classify claim sensitivity,
- require source support,
- identify outdated claims,
- mark speculation,
- require human review for high-stakes topics.

High-stakes categories:

- medical,
- legal,
- financial,
- political/election,
- public safety,
- breaking news,
- allegations about real people,
- minors,
- crisis events.

Actions:

- approve,
- request source,
- soften language,
- add context,
- remove claim,
- route to human review,
- block.

### 4. AI Label Engine

Purpose:

- determine when synthetic or AI-generated content must be disclosed.

Signals:

- AI-generated video,
- AI-generated voice,
- synthetic human likeness,
- realistic fabricated scene,
- altered real person,
- platform-specific AI label field,
- legal/regulatory requirement,
- brand disclosure rule.

Actions:

- set platform AI flag,
- add caption disclosure,
- add description disclosure,
- route for review,
- block deceptive content.

### 5. Sponsor and Affiliate Disclosure Engine

Purpose:

- ensure paid relationships, affiliate links, and brand sponsorships are disclosed.

Checks:

- affiliate URL,
- coupon code,
- sponsor metadata,
- paid placement,
- product review relationship,
- tenant monetization settings,
- platform branded-content tools.

Actions:

- add disclosure,
- set platform branded-content flag where available,
- block publish until disclosure is present.

### 6. Platform Policy Engine

Purpose:

- apply platform-specific restrictions before packaging and posting.

Examples:

- YouTube repetitious/inauthentic monetization risk,
- TikTok AI-generated content flag,
- Pinterest duplicate Pin risk,
- Reddit subreddit rules,
- LinkedIn professional tone and permissions,
- X automation/rate-limit sensitivity,
- Meta account and media requirements.

Each connector should expose policy rules as versioned config.

### 7. Brand Safety Engine

Purpose:

- protect the network from content that damages trust.

Checks:

- profanity level,
- violent imagery,
- adult content,
- controversial themes,
- shock content,
- deception,
- exploitative tragedy,
- protected-class references,
- unsafe advice.

Actions:

- allow,
- age/risk restrict,
- edit,
- human review,
- block.

### 8. Account Health Engine

Purpose:

- prevent publishing behavior that harms platform accounts.

Inputs:

- warnings,
- takedowns,
- strikes,
- upload failures,
- API errors,
- negative feedback,
- spam signals,
- monetization status,
- app review status,
- rate-limit usage.

Actions:

- slow cadence,
- pause channel,
- require manual review,
- disable direct publish,
- change content mix,
- trigger incident review.

### 9. Data Privacy Engine

Purpose:

- protect user and audience data, especially as SaaS expands.

Checks:

- tenant data separation,
- PII handling,
- poll response storage,
- export permissions,
- retention policies,
- deletion requests,
- child/minor data risk,
- regional privacy requirements.

## Policy Event Lifecycle

Every policy check creates or updates a `policy_event`.

Statuses:

- passed,
- warning,
- needs_review,
- blocked,
- overridden,
- resolved.

Override rule:

- Only authorized roles can override.
- Overrides require reason and audit log.
- Some blocks cannot be overridden, such as missing rights for copyrighted assets.

## Risk Scoring

Every content item gets a risk score.

Inputs:

- pillar risk,
- topic risk,
- source confidence,
- factual sensitivity,
- asset rights certainty,
- duplicate score,
- AI realism,
- platform risk,
- account health,
- monetization risk,
- language/region sensitivity.

Risk levels:

- green: can auto-advance,
- yellow: needs focused check or soft warning,
- orange: human review required,
- red: blocked until corrected.

## Human Review Gates

Human review is required for:

- high-stakes claims,
- realistic synthetic people,
- medical/legal/financial advice,
- politics/elections,
- allegations about real people,
- minors,
- sponsor/affiliate ambiguity,
- unknown asset rights,
- Reddit posting,
- first-time platform connector launch,
- account warning recovery,
- new channel launch,
- any content with red risk score.

## Corrections and Appeals

The system must support:

- post takedown logging,
- correction notes,
- replacement content,
- appeal evidence package,
- source/provenance export,
- incident timeline,
- root cause analysis,
- preventive action.

## Compliance Defect Taxonomy

| Defect | Description | Default Severity |
| --- | --- | --- |
| Missing rights | Asset has no commercial-use proof. | Critical |
| Unsupported claim | Factual claim lacks source support. | High |
| High-stakes no review | Sensitive content bypassed human review. | Critical |
| AI label missing | Synthetic content lacks required platform label/disclosure. | High |
| Duplicate content | Near-identical package created for reposting. | High |
| Platform metadata invalid | Title/caption/privacy/settings violate connector rules. | Medium |
| Sponsor disclosure missing | Affiliate/sponsor relationship not disclosed. | High |
| Subreddit rule mismatch | Reddit package ignores community rules. | High |
| Account health ignored | Publishing continues after warning/strike. | Critical |
| Prompt injection accepted | External source manipulates AI workflow. | High |
| Unsafe advice | Practical content creates physical, financial, medical, or legal risk. | High |

## Content Rules By Pillar

### Provocative Fixes

- Require evidence for factual hot takes.
- Avoid protected-class framing.
- Avoid harassment.
- Avoid fake outrage.
- Avoid public-person allegations without strong sources and review.

### Visual Addiction

- Require asset originality.
- Avoid copied viral footage.
- Check visual artifacts.
- Avoid unsettling synthetic realism unless intentional and disclosed.

### Curiosity/Facts

- Require source links.
- Mark uncertainty.
- Avoid outdated claims.
- Route high-stakes facts to review.

### Rankings/Comparisons

- Define ranking criteria.
- Disclose affiliate/sponsor incentives.
- Avoid defamatory product claims.
- Source objective data.

### Utility/Hacks

- Safety check required.
- No dangerous shortcuts.
- No health/legal/financial guarantees.
- Prefer disclaimers when risk exists.

### Emotional Stories

- Fiction must not be falsely presented as real reporting.
- Avoid exploiting tragedy.
- Do not use private-person identities.
- Avoid deepfake realism.

### PulseWorld/Polls

- Do not overstate representativeness.
- Store poll methodology.
- Filter duplicate/bot votes.
- Avoid manipulative political polling without review.

## SaaS Compliance

When external tenants use the system:

- tenants can set stricter policies,
- system baseline policies cannot be weakened below safety floor,
- tenant admins can require approvals,
- billing plan does not unlock unsafe publishing,
- policy violations affect tenant account health,
- platform account credentials remain tenant-scoped,
- audit exports are available.

## Compliance Output

Every approved post should have a compact compliance report:

- content item ID,
- channel,
- platform,
- render ID,
- rights status,
- sources status,
- AI label decision,
- sponsor disclosure decision,
- duplicate score,
- risk score,
- policy events,
- reviewer if any,
- approval timestamp.
