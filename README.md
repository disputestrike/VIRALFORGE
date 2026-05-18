# ViralForge

ViralForge is a Railway-ready autonomous AI media operating system.

It is built to discover viral topics, generate briefs/scripts/assets, render real MP4 videos, run compliance gates, package/publish to official platform connectors, collect analytics, and recursively learn from what works.

## What Is Implemented

- Backend API with health/status/evidence endpoints.
- Real persistence layer:
  - PostgreSQL when `DATABASE_URL` is present.
  - Local file fallback for development proof.
- Queue layer:
  - Railway Redis/BullMQ when `REDIS_URL` is present.
  - In-process fallback for local proof.
- Agent pipeline:
  - TrendScout
  - BriefForge
  - Scriptor
  - VisualPlanner
  - AssetGen
  - Renderer
  - PolicyOS
  - PulsePost
  - SignalLoop recursive learning
- FFmpeg MP4 rendering.
- Deepgram TTS integration with local audio fallback.
- OpenAI image integration with local SVG fallback.
- Cerebras LLM integration with deterministic fallback.
- Railway Bucket/S3-compatible storage with local file fallback.
- YouTube and Telegram live connector paths.
- Other platform connector readiness states.
- ForgeOps chat agent.
- Six Sigma quality matrix and compliance tracker.
- Railway Docker deployment config.

## Local Run

```bash
npm install
npm start
```

Open:

```text
http://localhost:3001
```

## Quality Gates

```bash
npm test
npm run quality
```

## Railway Environment Variables

Required core:

```text
DATABASE_URL
REDIS_URL
PUBLIC_URL
SESSION_SECRET
ENCRYPTION_KEY
AUTOPILOT_ENABLED
```

Storage, using Railway Buckets or any S3-compatible bucket:

```text
RAILWAY_BUCKET_NAME
RAILWAY_BUCKET_ENDPOINT
RAILWAY_BUCKET_ACCESS_KEY
RAILWAY_BUCKET_SECRET_KEY
RAILWAY_BUCKET_PUBLIC_URL
```

Required AI providers for real generation:

```text
CEREBRAS_API_KEY
OPENAI_API_KEY
DEEPGRAM_API_KEY
```

Optional premium video providers:

```text
RUNWAY_API_KEY
LUMA_API_KEY
KLING_API_KEY
```

Publishing:

```text
PUBLISH_MODE=dry_run
```

Set `PUBLISH_MODE=live` only after connector credentials and platform review are verified.

YouTube:

```text
YOUTUBE_CLIENT_ID
YOUTUBE_CLIENT_SECRET
YOUTUBE_REFRESH_TOKEN
YOUTUBE_PRIVACY_STATUS=private
```

Telegram:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

Other connector env vars are surfaced in `/api/connectors`.

## API Endpoints

- `GET /health`
- `GET /api/status`
- `GET /api/evidence`
- `GET /api/connectors`
- `GET /api/runs`
- `POST /api/runs/start`
- `POST /api/autopilot/tick`
- `POST /api/chat`
- `GET /api/compliance`

## Railway Services

Recommended:

1. Web service: `npm start`
2. Worker service: `npm run worker`
3. PostgreSQL plugin/service
4. Redis plugin/service
5. Railway Storage Bucket

For a single Railway service, keep `RUN_WORKER_IN_WEB=true`. For separate web/worker services, set `RUN_WORKER_IN_WEB=false` on the web service and run `npm run worker` in the worker service.

## Recursive Learning

SignalLoop writes `learning_signals` after each run. In local proof mode, it uses local evaluation metrics. When platform analytics credentials are added, those metrics should be replaced by live platform analytics.

The learning signals influence future platform and pillar priority.
