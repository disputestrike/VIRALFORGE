# Background Jobs and Cron

## Queue system

- Queue library: BullMQ.
- Redis env: `REDIS_URL`.
- Queue service: `server/_core/services/queue.ts`.
- Workers initialized in `server/_core/index.ts`.
- Dedicated worker files: `server/_core/workers/smsWorker.ts`, `server/_core/workers/emailWorker.ts`.

## Queues observed

- Calls queue for outbound calls.
- SMS queue for messaging work.
- Email queue for email work.

## Runtime behavior

When `REDIS_URL` is absent, tests and local runtime use or warn about in-memory fallback. This keeps development usable but is not durable. Production should set `REDIS_URL` so queued jobs survive restarts.

## Cron

No external cron schedule was verified in this local audit. Any Railway cron or scheduled job configuration must be verified in Railway directly.
