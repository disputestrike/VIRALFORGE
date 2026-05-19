# Compliance and Safety

## Communication Gates

- Protected procedures guard authenticated app actions.
- Outbound calls use compliance delay helpers before queueing.
- Queue jobs have retries/backoff when Redis/BullMQ is active.
- Webhook and admin surfaces require secret/auth checks where implemented.

## Required Production Proof

- Quiet hours and timezone behavior must be verified with real tenant/contact data.
- STOP/HELP handling must be verified for SMS provider callbacks.
- Consent source tracking must be verified before importing cold outbound lists.
- Suppression enforcement must be verified across SMS, calls, and email.

## Remaining Gaps

- Formal TCPA/CAN-SPAM/GDPR/HIPAA compliance cannot be certified from code alone.
- Live provider rate limits and failure behavior must be documented from provider dashboards/contracts.
- Data export/deletion needs a dedicated operational proof before full production certification.
