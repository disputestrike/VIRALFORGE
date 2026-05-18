# ViralForge Build Matrix

## Runtime Matrix

| Area | Built | Local Proof | Railway Requirement |
|---|---:|---|---|
| Web/API server | Yes | `GET /health` returns `ok=true` | `npm start` |
| Persistence | Yes | local file fallback stores runs/events/assets | `DATABASE_URL` for PostgreSQL |
| Migrations | Yes | `npm run migrate` initializes repository | Railway Postgres |
| Queue | Yes | in-process queue works locally | `REDIS_URL` for BullMQ |
| Worker | Yes | `npm run worker` available | separate worker service recommended |
| TrendScout | Yes | generated 7 ranked trend candidates | add live trend APIs later |
| BriefForge | Yes | creates structured brief | `CEREBRAS_API_KEY` for live LLM |
| Scriptor | Yes | creates scene script/caption/hashtags | `CEREBRAS_API_KEY` |
| VisualPlanner | Yes | selects FFmpeg template path | premium providers optional |
| AssetGen | Yes | generated image + audio assets | `OPENAI_API_KEY`, `DEEPGRAM_API_KEY` |
| Renderer | Yes | rendered real MP4 through FFmpeg | included `ffmpeg-static` |
| PolicyOS | Yes | 10 compliance events per run | always active |
| PulsePost | Yes | creates 8 platform export/publish records | connector credentials + `PUBLISH_MODE=live` |
| SignalLoop | Yes | writes recursive learning signals | platform analytics keys later |
| ForgeOps Agent | Yes | `/api/chat` answers status and triggers runs | live DB/logs |
| Quality Matrix | Yes | `/api/status` returns gates | always active |
| Compliance Tracker | Yes | `/api/compliance` returns crosswalk | always active |

## API Matrix

| Endpoint | Purpose | Status |
|---|---|---|
| `GET /health` | Railway healthcheck | Built |
| `GET /api/status` | providers, connectors, quality, compliance | Built |
| `GET /api/evidence` | runs, trends, assets, posts, logs, learning | Built |
| `GET /api/connectors` | key/connector readiness | Built |
| `GET /api/runs` | run history | Built |
| `POST /api/runs/start` | enqueue full pipeline | Built |
| `POST /api/autopilot/tick` | force autonomous cycle | Built |
| `POST /api/chat` | ForgeOps agent | Built |
| `GET /api/compliance` | compliance crosswalk | Built |

## Connector Matrix

| Connector | Current Behavior Without Keys | Live Behavior With Keys |
|---|---|---|
| YouTube | export package record | refresh token + resumable upload |
| Telegram | export package record | bot `sendVideo` |
| TikTok | readiness status | gated for app review/direct post implementation |
| Instagram | readiness status | gated for Meta review/content publishing |
| X | readiness status | gated for paid API/account credentials |
| LinkedIn | readiness status | gated for OAuth author URN |
| Pinterest | readiness status | gated for board/account token |
| Reddit | readiness status | gated for OAuth/subreddit rules |

## Railway Services

Recommended Railway layout:

1. Web service: `npm start`
2. Worker service: `npm run worker`
3. PostgreSQL service
4. Redis service
5. Storage Bucket

Single-service MVP:

- Set `RUN_WORKER_IN_WEB=true`.
- Use `npm start`.
- Later split worker into its own Railway service.
