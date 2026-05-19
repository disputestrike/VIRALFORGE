# Email, SMS, and Call Sequences

## Email

- Email queue path uses BullMQ when `REDIS_URL` is configured.
- Resend is the email provider when `RESEND_API_KEY` is configured.
- Templates include appointment confirmation, appointment reminder, follow-up, and custom sequence email.

## SMS

- SMS queue path uses BullMQ when `REDIS_URL` is configured.
- SignalWire-compatible service sends SMS when telephony env is configured.
- Appointment confirmation SMS includes STOP language in the worker template.

## Calls

- Voice call jobs are queued through the queue service.
- Realtime voice requires SignalWire, Deepgram, Cerebras, and Cartesia or ElevenLabs.
- Outbound compliance delay is applied before queued calls when configured.

## Failure Behavior

- Without Redis, local/test runtime uses memory queue and logs that jobs will not survive restarts.
- Without provider env, local tests prove graceful failure/fallback paths, not live delivery.
- Production must configure Redis and provider credentials before channels are advertised as live.
