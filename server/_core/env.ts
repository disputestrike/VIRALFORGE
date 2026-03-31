/**
 * Central environment configuration for ApexAI
 * All process.env reads go through here — never access process.env directly in app code
 */
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
  /** Multiply Cartesia voice profile speed (~0.90 = slightly slower / more natural vs default). */
  voiceTtsSpeedScale: Math.min(1.25, Math.max(0.55, parseFloat(process.env.VOICE_TTS_SPEED_SCALE ?? "0.90") || 0.9)),

  // ── Legacy (kept for backward compat) ─────────────────────
  appId: process.env.VITE_APP_ID ?? "",

  // ── Feature flags (derived — no extra env vars needed) ────
  get voiceEnabled()  { return this.signalwireProjectId !== "" && this.signalwireToken !== ""; },
  get smsEnabled()    { return this.signalwireProjectId !== "" && this.signalwireToken !== ""; },
  get emailEnabled()  { return this.resendApiKey !== ""; },
  get ttsEnabled()    { return this.elevenLabsApiKey !== "" || (process.env.CARTESIA_API_KEY ?? "") !== ""; },
  get sttEnabled()    { return this.openAiApiKey !== "" || this.deepgramApiKey !== ""; },
  /** Streaming phone pipeline: Deepgram + Cartesia + (Cerebras or Claude) */
  get voiceRealtimeReady() {
    const llm = this.cerebrasApiKey !== "" || this.anthropicApiKey !== "";
    return this.deepgramApiKey !== "" && this.cartesiaApiKey !== "" && llm;
  },
  get queueEnabled()  { return this.redisUrl !== ""; },
  get aiEnabled()     { return this.anthropicApiKey !== ""; },
};
