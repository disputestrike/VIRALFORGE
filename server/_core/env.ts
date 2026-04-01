/**
 * Central environment configuration for ApexAI
 * All process.env reads go through here — never access process.env directly in app code
 */

function hasAnyCerebrasKey(): boolean {
  if ((process.env.CEREBRAS_API_KEY ?? "").trim()) return true;
  for (let i = 1; i <= 10; i++) {
    if ((process.env[`CEREBRAS_API_KEY_${i}`] ?? "").trim()) return true;
  }
  return false;
}

export const ENV = {
  // ── Core ──────────────────────────────────────────────────
  nodeEnv:      process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",

  // ── Auth ──────────────────────────────────────────────────
  cookieSecret: process.env.JWT_SECRET ?? "",
  ownerOpenId:  process.env.OWNER_OPEN_ID ?? "",

  // ── Google OAuth ──────────────────────────────────────────
  googleClientId:     process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",

  // ── Database ──────────────────────────────────────────────
  databaseUrl: process.env.DATABASE_URL ?? "",

  // ── Redis (BullMQ queue + workers) ────────────────────────
  redisUrl: process.env.REDIS_URL ?? "",

  // ── Anthropic (script generation, conversation engine, AI features) ──
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",

  // ── SignalWire (voice calls + SMS) ───────────────────────────────────────
  signalwireProjectId:   process.env.SIGNALWIRE_PROJECT_ID ?? "",
  signalwireToken:       process.env.SIGNALWIRE_TOKEN ?? "",
  signalwireSpaceUrl:    process.env.SIGNALWIRE_SPACE_URL ?? "",
  signalwirePhoneNumber: process.env.SIGNALWIRE_PHONE_NUMBER ?? "",
  signalwireSigningKey:  process.env.SIGNALWIRE_SIGNING_KEY ?? "",

  // ── thinQ LCR (optional — add later for even cheaper routing) ────────────
  thinqAccountId:  process.env.THINQ_ACCOUNT_ID ?? "",
  thinqAuthToken:  process.env.THINQ_AUTH_TOKEN ?? "",
  thinqSipDomain:  process.env.THINQ_SIP_DOMAIN ?? "sip.thinq.com",

  // ── Resend (transactional email) ──────────────────────────
  resendApiKey: process.env.RESEND_API_KEY ?? "",

  // ── ElevenLabs (TTS) ──────────────────────────────────────
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ?? "",

  // ── OpenAI (Whisper STT) ──────────────────────────────────
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",

  // ── Live voice stack (realtime engine) ────────────────────
  deepgramApiKey:  process.env.DEEPGRAM_API_KEY ?? "",
  cartesiaApiKey:  process.env.CARTESIA_API_KEY ?? "",
  cerebrasApiKey:  process.env.CEREBRAS_API_KEY ?? "",
  /** A/B test: default is Cerebras-only. Set to "true" to allow Claude when Cerebras fails or is unset. */
  llmAllowAnthropicFallback: process.env.LLM_ALLOW_ANTHROPIC_FALLBACK === "true",

  // ── Public URL (SignalWire webhook callbacks) ─────────────
  publicDomain: process.env.RAILWAY_PUBLIC_DOMAIN ?? "",
  publicUrl: process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : process.env.PUBLIC_URL ?? "https://apexai-production-d567.up.railway.app",

  // ── Admin notifications ───────────────────────────────────
  adminEmail: process.env.ADMIN_EMAIL ?? "",
  adminName:  process.env.ADMIN_NAME ?? "ApexAI Admin",

  /**
   * TwiML: play real US ring-tone audio (from /api/voice/ring-tone.wav) before Connect/Stream.
   * Set VOICE_PLAY_RING_BEFORE_STREAM=false to skip (e.g. debugging).
   */
  voicePlayRingBeforeStream: process.env.VOICE_PLAY_RING_BEFORE_STREAM !== "false",
  /** Multiply Cartesia voice profile speed (~0.91 default; override with VOICE_TTS_SPEED_SCALE). */
  voiceTtsSpeedScale: Math.min(1.25, Math.max(0.55, parseFloat(process.env.VOICE_TTS_SPEED_SCALE ?? "0.91") || 0.91)),
  /** After user stops speaking (STT final), brief pause before LLM/TTS — structured pacing (~200–350ms; set 0 to disable). */
  voiceResponseMicroPauseMs: Math.max(0, parseInt(process.env.VOICE_RESPONSE_MICRO_PAUSE_MS ?? "240", 10) || 0),
  /** Cerebras streaming (phone): max completion tokens per turn — keep low for snappy replies. */
  voiceLlmMaxTokens: Math.min(220, Math.max(56, parseInt(process.env.VOICE_LLM_MAX_TOKENS ?? "105", 10) || 105)),
  /** Cerebras streaming temperature — lower = more consistent; higher = more varied. */
  voiceLlmTemperature: Math.min(0.85, Math.max(0.2, parseFloat(process.env.VOICE_LLM_TEMPERATURE ?? "0.40") || 0.4)),
  /**
   * Cerebras `gpt-oss-120b` only: reasoning_effort none|low|medium|high.
   * `low` or `none` = faster time-to-first-token for voice (default low).
   */
  voiceGptOssReasoningEffort: (() => {
    const v = (process.env.VOICE_GPT_OSS_REASONING_EFFORT ?? "low").toLowerCase();
    if (v === "none" || v === "low" || v === "medium" || v === "high") return v;
    return "low";
  })(),

  // ── Legacy (kept for backward compat) ─────────────────────
  appId: process.env.VITE_APP_ID ?? "",

  // ── Feature flags (derived — no extra env vars needed) ────
  get voiceEnabled()  { return this.signalwireProjectId !== "" && this.signalwireToken !== ""; },
  get smsEnabled()    { return this.signalwireProjectId !== "" && this.signalwireToken !== ""; },
  get emailEnabled()  { return this.resendApiKey !== ""; },
  get ttsEnabled()    { return this.elevenLabsApiKey !== "" || (process.env.CARTESIA_API_KEY ?? "") !== ""; },
  get sttEnabled()    { return this.openAiApiKey !== "" || this.deepgramApiKey !== ""; },
  /** Streaming phone pipeline: Deepgram + Cartesia + LLM (Cerebras primary; Anthropic optional via LLM_ALLOW_ANTHROPIC_FALLBACK) */
  get cerebrasConfigured() {
    return hasAnyCerebrasKey();
  },
  get voiceRealtimeReady() {
    const llm =
      this.cerebrasConfigured ||
      (this.llmAllowAnthropicFallback && this.anthropicApiKey !== "");
    return this.deepgramApiKey !== "" && this.cartesiaApiKey !== "" && llm;
  },
  get queueEnabled()  { return this.redisUrl !== ""; },
  /** TRPC / templates / SMS-email AI text — Cerebras when keys exist; else Anthropic if set (or fallback flag). */
  get aiEnabled() {
    return (
      this.cerebrasConfigured ||
      this.anthropicApiKey !== ""
    );
  },
};
