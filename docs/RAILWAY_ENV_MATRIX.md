# Railway Environment Matrix

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | PostgreSQL persistence |
| `REDIS_URL` | Yes | BullMQ queue and workers |
| `PUBLIC_URL` | Yes | Public app URL for callbacks and links |
| `SESSION_SECRET` | Yes | Session signing |
| `ENCRYPTION_KEY` | Yes | Future credential encryption |
| `AUTOPILOT_ENABLED` | Yes | Turns autonomous scheduled runs on/off |
| `RUN_WORKER_IN_WEB` | Optional | Run worker in web service for single-service deployments |
| `RAILWAY_BUCKET_NAME` | Yes | Video/image/audio storage |
| `RAILWAY_BUCKET_ENDPOINT` | Yes | Railway bucket S3-compatible endpoint |
| `RAILWAY_BUCKET_ACCESS_KEY` | Yes | Bucket access key |
| `RAILWAY_BUCKET_SECRET_KEY` | Yes | Bucket secret |
| `RAILWAY_BUCKET_PUBLIC_URL` | Optional | Public URL prefix for assets |
| `CEREBRAS_API_KEY` | Yes | Brief/script/agent LLM |
| `OPENAI_API_KEY` | Yes | Image generation |
| `DEEPGRAM_API_KEY` | Yes | Voiceover TTS |
| `PUBLISH_MODE` | Yes | `dry_run` or `live` |
| `YOUTUBE_CLIENT_ID` | Connector | YouTube upload |
| `YOUTUBE_CLIENT_SECRET` | Connector | YouTube upload |
| `YOUTUBE_REFRESH_TOKEN` | Connector | YouTube upload |
| `TELEGRAM_BOT_TOKEN` | Connector | Telegram publishing |
| `TELEGRAM_CHAT_ID` | Connector | Telegram publishing |
| `TIKTOK_CLIENT_KEY` | Connector | TikTok connector readiness |
| `TIKTOK_CLIENT_SECRET` | Connector | TikTok connector readiness |
| `TIKTOK_ACCESS_TOKEN` | Connector | TikTok connector readiness |
| `META_APP_ID` | Connector | Instagram connector readiness |
| `META_APP_SECRET` | Connector | Instagram connector readiness |
| `META_ACCESS_TOKEN` | Connector | Instagram connector readiness |
| `INSTAGRAM_USER_ID` | Connector | Instagram connector readiness |
| `X_BEARER_TOKEN` | Connector | X connector readiness |
| `LINKEDIN_ACCESS_TOKEN` | Connector | LinkedIn connector readiness |
| `PINTEREST_ACCESS_TOKEN` | Connector | Pinterest connector readiness |
| `REDDIT_CLIENT_ID` | Connector | Reddit connector readiness |
| `REDDIT_REFRESH_TOKEN` | Connector | Reddit connector readiness |
