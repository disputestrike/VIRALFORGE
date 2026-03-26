# ApexAI — Railway Environment Variables

## How to set them
Railway Dashboard → ApexAI service → Variables tab → Add Variable

---

## ✅ Required Right Now (App won't work without these)

| Variable | Where to get it | Example |
|---|---|---|
| `DATABASE_URL` | Railway → MySQL service → Connect | `mysql://user:pass@host:3306/railway` |
| `REDIS_URL` | Railway → Redis service → Connect | `redis://default:pass@host:6379` |
| `JWT_SECRET` | Generate: `openssl rand -hex 32` | `a1b2c3d4...64chars` |
| `GOOGLE_CLIENT_ID` | console.cloud.google.com → OAuth credentials | `123456.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Same as above | `GOCSPX-...` |
| `OWNER_OPEN_ID` | Your Google account sub ID (see note below) | `123456789012345678901` |
| `RAILWAY_PUBLIC_DOMAIN` | Your Railway URL | `apexai-production-d567.up.railway.app` |
| `NODE_ENV` | Set manually | `production` |

> **OWNER_OPEN_ID**: First time you log in, check Railway logs for `[OAuth] New user:` — it prints your Google sub ID. Set that here and you become admin.

---

## ⚠️ Add When You Have Them (Features activate automatically)

### Voice Calls + SMS (Twilio)
| Variable | Notes |
|---|---|
| `TWILIO_ACCOUNT_SID` | From twilio.com/console |
| `TWILIO_AUTH_TOKEN` | From twilio.com/console |
| `TWILIO_PHONE_NUMBER` | E.164 format: `+15551234567` |

Once set: outbound calls, inbound calls, SMS all activate. No code changes needed.

### Email (Resend)
| Variable | Notes |
|---|---|
| `RESEND_API_KEY` | From resend.com → API Keys |

Once set: email confirmations, reminders, follow-ups activate.

### Voice AI — Speech to Text (OpenAI Whisper)
| Variable | Notes |
|---|---|
| `OPENAI_API_KEY` | From platform.openai.com |

Once set: live call transcription activates.

### Voice AI — Text to Speech (ElevenLabs)
| Variable | Notes |
|---|---|
| `ELEVENLABS_API_KEY` | From elevenlabs.io → Profile → API Key |

Once set: AI voice responses activate (natural-sounding speech).

### AI Conversation + Script Generation
| Variable | Notes |
|---|---|
| `BUILT_IN_FORGE_API_KEY` | Your LLM API key |
| `BUILT_IN_FORGE_API_URL` | LLM API base URL |

Once set: AI script generation, conversation engine, lead search activate.

### Admin Notifications
| Variable | Notes |
|---|---|
| `ADMIN_EMAIL` | Where to send critical alerts |
| `ADMIN_NAME` | Display name in alerts |

---

## How Railway Auto-Connects MySQL and Redis

In Railway, when you add MySQL or Redis to the same project as ApexAI, you can reference their variables directly:

1. Go to **ApexAI service → Variables**
2. Click **+ Add Variable**
3. Set `DATABASE_URL` = `${{MySQL.DATABASE_URL}}` (Railway fills this in)
4. Set `REDIS_URL` = `${{Redis.REDIS_URL}}` (Railway fills this in)

This way if the connection strings change, they auto-update.

---

## Twilio Webhook URLs (configure in Twilio console)

After setting `RAILWAY_PUBLIC_DOMAIN`:

| Twilio Setting | URL |
|---|---|
| Voice webhook (inbound calls) | `https://apexai-production-d567.up.railway.app/api/voice/inbound` |
| Status callback | `https://apexai-production-d567.up.railway.app/api/voice/status` |
| Recording callback | `https://apexai-production-d567.up.railway.app/api/voice/recording` |

Method: **HTTP POST** for all of them.

---

## Google OAuth Redirect URI (configure in Google Cloud Console)

```
https://apexai-production-d567.up.railway.app/api/auth/google/callback
```

Go to: console.cloud.google.com → Credentials → OAuth 2.0 Client → Authorized redirect URIs → Add this URL.
