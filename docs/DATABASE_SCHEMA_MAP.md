# Database Schema Map

## Engine

- ORM: Drizzle
- Dialect in active schema: MySQL
- Runtime env variable: `DATABASE_URL`
- Migration folder: `drizzle/`
- Startup migration runner: `server/_core/index.ts`

## Tables detected in `drizzle/schema.ts`

- `ab_test_results`
- `activity_logs`
- `agency_clients`
- `analytics_snapshots`
- `blocked_phone_numbers`
- `call_quality_scores`
- `call_recordings`
- `campaign_contacts`
- `campaigns`
- `crm_connections`
- `customer_memories`
- `email_sequences`
- `escalation_rules`
- `knowledge_base_chunks`
- `knowledge_base_sources`
- `knowledge_bases`
- `lead_scoring_rules`
- `leads`
- `messages`
- `mobile_devices`
- `onboardings`
- `prompt_variants`
- `rcs_registrations`
- `social_connections`
- `support_tickets`
- `system_config`
- `templates`
- `testimonials`
- `user_industry_packs`
- `user_phone_numbers`
- `users`
- `voice_metric_events`
- `webchat_widgets`
- `workflows`
- `zapier_webhooks`

## Critical startup checks

After migrations, startup verifies that tenant-owned tables expose `createdBy` columns for isolation-sensitive data. Missing critical columns block production startup.

## Operational warning

The local audit can verify migration files and schema code. It cannot prove that the live Railway database has every table until `pnpm run db:push`, startup migrations, or a direct Railway database inspection is run against the live `DATABASE_URL`.
