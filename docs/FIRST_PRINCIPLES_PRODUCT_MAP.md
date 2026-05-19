# First Principles Product Map

## Product In One Sentence

ApexAI helps businesses capture, qualify, follow up with, and convert leads through AI-assisted voice, SMS, email, CRM, scheduling, and analytics workflows.

## Core Loop

User imports or captures a lead -> ApexAI qualifies or follows up through voice/message automation -> the user sees outcomes, recordings, transcripts, bookings, and campaign analytics.

## Irreducible Minimum

- Authentication works.
- Onboarding creates usable workspace settings.
- Leads can be created and persisted.
- Campaigns/messages/calls can be queued safely.
- Results remain visible after reload and restart.
- Production queue uses Redis, not memory.

## First Principles Validation

- Leads and campaigns: core loop, keep.
- Voice AI and messaging: core loop, keep.
- Appointments: core conversion result, keep.
- Analytics and recordings: proof/result layer, keep.
- Billing/admin/settings: business and operations support, keep.
- OmniPulse/ViralForge preview surfaces: secondary product surface; keep gated and do not let it destabilize the ApexAI core loop.

## Market-Ready Definition

- Target user can sign in, onboard, add a lead, launch a controlled outreach action, and inspect the result without support.
- Railway deployment has DB, Redis, and provider credentials configured.
- Provider failures are user-visible and recoverable.
- No production path silently falls back to localhost services.
