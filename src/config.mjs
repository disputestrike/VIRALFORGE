import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);
const localOnlyPassword = isRailway ? "" : "viralforge-local";
const localOnlySessionSecret = isRailway ? "" : "viralforge-local-session-secret";

function bool(name, fallback = false) {
  const value = process.env[name];
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function number(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

export const config = {
  app: {
    name: "ViralForge",
    env: process.env.NODE_ENV || "development",
    port: number("PORT", 3001),
    publicUrl: process.env.PUBLIC_URL || "http://localhost:3001",
    autopilotEnabled: bool("AUTOPILOT_ENABLED", false),
    runWorkerInWeb: bool("RUN_WORKER_IN_WEB", true),
    publishMode: process.env.PUBLISH_MODE || "dry_run",
    dataDir: process.env.DATA_DIR || path.join(rootDir, ".data"),
    rootDir,
  },
  auth: {
    adminPassword: process.env.VIRALFORGE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || localOnlyPassword,
    sessionSecret: process.env.SESSION_SECRET || localOnlySessionSecret,
    cookieName: "vf_session",
  },
  db: {
    url: process.env.DATABASE_URL || "",
  },
  redis: {
    url: process.env.REDIS_URL || "",
  },
  providers: {
    cerebrasApiKey: process.env.CEREBRAS_API_KEY || "",
    openaiApiKey: process.env.OPENAI_API_KEY || "",
    deepgramApiKey: process.env.DEEPGRAM_API_KEY || "",
    runwayApiKey: process.env.RUNWAY_API_KEY || "",
    lumaApiKey: process.env.LUMA_API_KEY || "",
    klingApiKey: process.env.KLING_API_KEY || "",
  },
  storage: {
    bucketName: process.env.RAILWAY_BUCKET_NAME || process.env.S3_BUCKET || "",
    endpoint: process.env.RAILWAY_BUCKET_ENDPOINT || process.env.S3_ENDPOINT || "",
    accessKeyId: process.env.RAILWAY_BUCKET_ACCESS_KEY || process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.RAILWAY_BUCKET_SECRET_KEY || process.env.S3_SECRET_ACCESS_KEY || "",
    region: process.env.RAILWAY_BUCKET_REGION || process.env.S3_REGION || "auto",
    publicBaseUrl: process.env.RAILWAY_BUCKET_PUBLIC_URL || process.env.S3_PUBLIC_BASE_URL || "",
  },
  platforms: {
    youtube: {
      clientId: process.env.YOUTUBE_CLIENT_ID || "",
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET || "",
      refreshToken: process.env.YOUTUBE_REFRESH_TOKEN || "",
      privacyStatus: process.env.YOUTUBE_PRIVACY_STATUS || "private",
    },
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || "",
      chatId: process.env.TELEGRAM_CHAT_ID || "",
    },
    tiktok: {
      clientKey: process.env.TIKTOK_CLIENT_KEY || process.env.TIKTOK_CLIENT_ID || "",
      clientSecret: process.env.TIKTOK_CLIENT_SECRET || "",
      accessToken: process.env.TIKTOK_ACCESS_TOKEN || "",
    },
    meta: {
      appId: process.env.META_APP_ID || "",
      appSecret: process.env.META_APP_SECRET || "",
      accessToken: process.env.META_ACCESS_TOKEN || "",
      instagramUserId: process.env.INSTAGRAM_USER_ID || "",
    },
    x: {
      bearerToken: process.env.X_BEARER_TOKEN || "",
      apiKey: process.env.X_API_KEY || "",
      apiSecret: process.env.X_API_SECRET || "",
      accessToken: process.env.X_ACCESS_TOKEN || "",
      accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET || "",
    },
    linkedin: {
      accessToken: process.env.LINKEDIN_ACCESS_TOKEN || "",
      authorUrn: process.env.LINKEDIN_AUTHOR_URN || "",
    },
    pinterest: {
      accessToken: process.env.PINTEREST_ACCESS_TOKEN || "",
      boardId: process.env.PINTEREST_BOARD_ID || "",
    },
    reddit: {
      clientId: process.env.REDDIT_CLIENT_ID || "",
      clientSecret: process.env.REDDIT_CLIENT_SECRET || "",
      refreshToken: process.env.REDDIT_REFRESH_TOKEN || "",
    },
  },
};

export function providerStatus() {
  return {
    database: config.db.url ? "postgres_configured" : "local_file_fallback",
    redis: config.redis.url ? "redis_configured" : "in_process_queue",
    storage: config.storage.bucketName && config.storage.endpoint ? "railway_bucket_configured" : "local_file_storage",
    cerebras: config.providers.cerebrasApiKey ? "live" : "fallback_deterministic",
    openaiImages: config.providers.openaiApiKey ? "live" : "fallback_svg",
    deepgram: config.providers.deepgramApiKey ? "live" : "fallback_tone_audio",
    ffmpeg: "required",
    publishMode: config.app.publishMode,
  };
}

export function connectorStatus() {
  return {
    YouTube: config.platforms.youtube.clientId && config.platforms.youtube.clientSecret && config.platforms.youtube.refreshToken
      ? "ready_for_live_private_upload"
      : "missing_oauth_credentials",
    Telegram: config.platforms.telegram.botToken && config.platforms.telegram.chatId
      ? "ready_for_live_publish"
      : "missing_bot_credentials",
    TikTok: config.platforms.tiktok.accessToken ? "ready_for_live_attempt_needs_app_review_check" : "missing_oauth_credentials",
    Instagram: config.platforms.meta.accessToken && config.platforms.meta.instagramUserId ? "ready_for_live_attempt_needs_meta_review" : "missing_meta_credentials",
    X: config.platforms.x.accessToken || config.platforms.x.bearerToken ? "ready_for_live_attempt_plan_required" : "missing_x_credentials",
    LinkedIn: config.platforms.linkedin.accessToken && config.platforms.linkedin.authorUrn ? "ready_for_live_attempt" : "missing_linkedin_credentials",
    Pinterest: config.platforms.pinterest.accessToken && config.platforms.pinterest.boardId ? "ready_for_live_attempt" : "missing_pinterest_credentials",
    Reddit: config.platforms.reddit.clientId && config.platforms.reddit.refreshToken ? "ready_for_live_attempt" : "missing_reddit_credentials",
  };
}
