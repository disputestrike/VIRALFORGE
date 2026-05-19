# Security and Compliance

## Implemented controls

- Google OAuth/session path.
- Protected tRPC procedures.
- Admin-only procedure for sensitive admin operations.
- Telephony webhook signature validation on voice/SMS routes.
- Webhook secret validation in the webhooks router.
- Rate limit middleware for API, auth, AI, and webhook surfaces.
- Tenant isolation via `createdBy` columns and startup schema checks.
- Outbound compliance tests and call policy tests.

## High-risk areas

- `/api/admin/force-migrate` must be protected by a strong `ADMIN_SECRET`; do not rely on fallback test secrets in production.
- Production queue durability requires `REDIS_URL`.
- Provider keys must never be embedded in frontend bundles.
- Live database certification requires direct Railway/live DB verification.

## Compliance posture

The codebase has audit logging, tenant scoping, and outbound scheduling/compliance tests. Formal SOC 2, HIPAA, GDPR, or enterprise certification status cannot be asserted from code alone; it requires policy, legal, vendor, and operational evidence outside the repo.
