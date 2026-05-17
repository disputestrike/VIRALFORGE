# SaaS and PayPal Billing

## SaaS Goal

The product must be built as an internal operating system first, but SaaS-ready from day one.

That means:

- no single hard-coded owner account,
- no global-only channels,
- no shared provider credentials unless explicitly system-managed,
- no mixed tenant data,
- no billing retrofit that requires rewriting core tables,
- no compliance bypass for external users.

## SaaS Customer Types

### Creator

Needs:

- one or more channels,
- simple templates,
- content generation,
- manual approval,
- scheduling/export,
- analytics.

### Agency

Needs:

- multiple client workspaces,
- team roles,
- approval queues,
- white-label exports,
- usage tracking per client,
- billing controls.

### Brand

Needs:

- stricter brand safety,
- compliance approvals,
- sponsor/affiliate controls,
- asset library,
- team collaboration,
- audit logs.

### Enterprise Media Operator

Needs:

- high-volume channel factory,
- custom providers,
- advanced analytics,
- custom templates,
- private deployment options,
- support/SLA.

## Tenant Model

Each tenant owns:

- channels,
- platform accounts,
- provider keys,
- content items,
- assets,
- policy settings,
- analytics,
- billing subscription,
- usage events,
- users and roles.

Tenant isolation must be enforced everywhere:

- database queries,
- object storage paths,
- cache keys,
- queue jobs,
- logs,
- analytics exports,
- billing records.

## Roles

Base roles:

- owner,
- admin,
- editor,
- reviewer,
- publisher,
- analyst,
- billing_admin,
- viewer.

Permission examples:

- create channel,
- edit brand kit,
- generate content,
- approve policy review,
- override warnings,
- publish,
- connect platform account,
- view billing,
- manage team,
- export assets.

High-risk permissions:

- policy override,
- direct publish,
- billing changes,
- platform credential management,
- delete content,
- tenant admin changes.

## Plans

Initial SaaS plan concept:

| Plan | Target | Included |
| --- | --- | --- |
| Starter | Solo creator | 1 workspace, limited channels, manual export, basic AI credits, basic analytics. |
| Growth | Creator or small team | more channels, more credits, direct publishing where supported, experiments, asset library. |
| Agency | client operators | multiple workspaces/clients, approval flows, team seats, client reports, higher limits. |
| Scale | serious operators | high-volume generation, advanced analytics, provider routing, premium templates, priority queues. |
| Enterprise | custom | custom limits, support, security review, optional dedicated deployment. |

Do not over-optimize pricing now. Build the plan/limits system so pricing can change later.

## Usage and Credits

Usage should be metered because AI/media generation cost varies.

Meter:

- text generations,
- image generations,
- video generations,
- voice minutes,
- transcription minutes,
- render minutes,
- storage,
- platform posts,
- analytics imports,
- translation/localization,
- advanced policy checks.

Each usage event records:

- tenant,
- user,
- job,
- provider,
- model,
- operation,
- estimated cost,
- actual cost,
- credits charged,
- timestamp.

Credit rules:

- included monthly credits by plan,
- add-on credit packs,
- hard limit or soft overage setting,
- failed jobs may refund credits depending on cause,
- policy-blocked generations may still cost provider usage but can be discounted by product decision.

## PayPal Integration

Official sources:

- PayPal Subscriptions API: https://developer.paypal.com/docs/api/subscriptions/v1/
- PayPal subscription integration guide: https://developer.paypal.com/docs/subscriptions/integrate/
- PayPal Webhooks API: https://developer.paypal.com/docs/api/webhooks/v1/

PayPal is the required payment integration.

## PayPal Objects

Use PayPal products and plans:

- Product: OmniPulse OS SaaS product.
- Plans: Starter, Growth, Agency, Scale, Enterprise/custom where applicable.
- Subscription: tenant's active recurring billing relationship.

Map PayPal IDs into internal records:

- `plans.paypal_product_id`
- `plans.paypal_plan_id`
- `subscriptions.paypal_subscription_id`
- `paypal_webhook_events.event_id`

## Checkout Flow

1. User selects plan.
2. Backend creates or retrieves PayPal plan ID.
3. Frontend renders PayPal subscription approval button or redirects to approval link.
4. User approves subscription in PayPal.
5. PayPal returns subscription ID.
6. Backend stores pending subscription.
7. Webhook confirms activation.
8. Tenant plan limits become active.

## Webhook Requirements

Every PayPal webhook must:

- be received over HTTPS,
- be signature verified,
- store raw event,
- dedupe by PayPal event ID,
- process idempotently,
- update subscription state,
- create audit log,
- create billing/revenue event when applicable.

Webhook event categories to support:

- subscription activated,
- subscription cancelled,
- subscription suspended,
- subscription expired,
- payment completed,
- payment failed,
- plan changed,
- billing agreement events where applicable.

Implementation must verify exact event names in the current PayPal dashboard/API before go-live.

## Subscription States

Internal statuses:

- trialing,
- pending,
- active,
- past_due,
- suspended,
- cancelled,
- expired,
- failed,
- unpaid.

Access logic:

- active/trialing: normal plan limits,
- past_due: grace period with warnings,
- suspended/unpaid: block generation and direct publishing, allow export of own data,
- cancelled: retain until period end if applicable,
- expired: read-only or limited access based on policy.

## Plan Limits

Plan limits should be JSON-configurable:

- max workspaces,
- max channels,
- max users,
- monthly credits,
- max active renders,
- max platform accounts,
- direct publishing enabled,
- analytics retention,
- storage quota,
- provider access,
- premium templates,
- API access,
- white-label export.

## Billing Safety

Billing defects can destroy trust. Required controls:

- webhook replay tests,
- duplicate event tests,
- subscription state reconciliation job,
- daily PayPal vs internal state check,
- admin billing event viewer,
- failed payment alerts,
- usage ledger immutable after close,
- manual credit adjustment with audit log.

## Free/Internal Mode

Our own internal tenant should exist as a tenant with a special plan, not as hard-coded global access.

Internal plan:

- no PayPal requirement,
- high but budgeted usage limits,
- same policy gates,
- same audit logs,
- same provider cost tracking.

This ensures the system we use is the same system customers can later buy.

## SaaS Onboarding Flow

1. Create account.
2. Create tenant/workspace.
3. Choose role: creator, brand, agency, media operator.
4. Choose channel template.
5. Define language/region.
6. Define policy strictness.
7. Connect platform accounts or choose manual export.
8. Choose PayPal plan.
9. Generate first content brief.
10. Review policy tutorial.
11. Produce first export/publish package.

## Tenant Compliance Settings

Tenants can configure:

- forbidden topics,
- required review roles,
- brand words,
- blocked words,
- allowed providers,
- max risk level for auto-advance,
- required disclosures,
- data retention,
- platform-specific publishing defaults.

The system baseline cannot be disabled:

- no missing rights,
- no fake engagement,
- no platform evasion,
- no unverified high-stakes claims,
- no unsafe direct publishing,
- no tenant data mixing.

## SaaS Admin Console

Admin views:

- tenants,
- subscriptions,
- usage,
- provider cost,
- failed jobs,
- policy incidents,
- platform connector status,
- support tickets,
- webhook events,
- audit logs.

Admin actions:

- adjust credits,
- pause tenant,
- replay webhook,
- force subscription sync,
- disable connector,
- impersonate with audit,
- export compliance package,
- resolve incident.

## Marketplace Future

Leave room for:

- channel templates marketplace,
- prompt packs,
- render templates,
- provider integrations,
- stock asset integrations,
- analytics report templates,
- agency-managed services.

Marketplace rules:

- templates must include policy metadata,
- prompt packs must have evals,
- render templates must pass safe-area tests,
- revenue share can be added later,
- PayPal marketplace/multiparty payment needs separate verification if used.
