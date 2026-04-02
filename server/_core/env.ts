/**
 * Central environment configuration for ApexAI
 * All process.env reads go through here — never access process.env directly in app code
 */

import { normalizeToE164US } from "./phoneE164";

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
  signalwirePhoneNumber: normalizeToE164US(process.env.SIGNALWIRE_PHONE_NUMBER ?? "") || (process.env.SIGNALWIRE_PHONE_NUMBER ?? "").trim(),
  signalwireSigningKey:  process.env.SIGNALWIRE_SIGNING_KEY ?? "",

  // ── thinQ LCR (optional — add later for even cheaper routing) ────────────
  thinqAccountId:  process.env.THINQ_ACCOUNT_ID ?? "",
  thinqAuthToken:  process.env.THINQ_AUTH_TOKEN ?? "",
  thinqSipDomain:  process.env.THINQ_SIP_DOMAIN ?? "sip.thinq.com",

  // ── Resend (transactional email) ──────────────────────────
  resendApiKey:     process.env.RESEND_API_KEY ?? "",
  resendFromEmail:  process.env.RESEND_FROM_EMAIL ?? "",
  resendFromName:   process.env.RESEND_FROM_NAME ?? "ApexAI",

  // ── ElevenLabs (TTS) ──────────────────────────────────────
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY ?? "",

  // ── OpenAI (Whisper STT) ──────────────────────────────────
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",

  // ── Live voice stack (realtime engine) ────────────────────
  deepgramApiKey:  process.env.DEEPGRAM_API_KEY ?? "",
  cartesiaApiKey:  process.env.CARTESIA_API_KEY ?? "",

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
  voiceTtsSpeedScale: Math.min(1.25, Math.max(0.55, parseFloat(process.env.VOICE_TTS_SPEED_SCALE ?? "1.0") || 1.0)),
  /** After Deepgram speech_final, pause before LLM — target 200–300ms for natural turn-taking. */
  voiceResponseMicroPauseMs: Math.max(0, parseInt(process.env.VOICE_RESPONSE_MICRO_PAUSE_MS ?? "275", 10) || 0),
  /**
   * After assistant audio finishes, if the caller stays quiet, prompt one upbeat check-in (sales tempo).
   * Set VOICE_USER_SILENCE_REENGAGE_ENABLED=false to disable.
   */
  voiceUserSilenceReengageEnabled: process.env.VOICE_USER_SILENCE_REENGAGE_ENABLED !== "false",
  /** Ms of user silence after assistant playback ends before auto check-in (2s–20s). Default ~4.5s. */
  voiceUserSilenceReengageMs: Math.max(
    2000,
    Math.min(20000, parseInt(process.env.VOICE_USER_SILENCE_REENGAGE_MS ?? "4500", 10) || 4500)
  ),
  /**
   * Mu-law barge-in threshold on the 0–127 scale used by estimateEnergy (avg distance from silence).
   * Lower = easier interrupt. Values above 127 are treated as legacy mis-scaled (e.g. 600) and mapped with /5 so they still work.
   */
  voiceBargeInEnergyThreshold: (() => {
    const raw =
      parseInt(process.env.VOICE_BARGE_IN_ENERGY_THRESHOLD || process.env.INTERRUPTION_ENERGY_THRESHOLD || "48", 10) || 48;
    const scaled = raw > 127 ? Math.round(raw / 5) : raw;
    return Math.max(12, Math.min(125, scaled));
  })(),
  /** Deepgram streaming: ms of silence before end-of-turn (lower = faster replies; too low may clip words). */
  voiceDeepgramEndpointingMs: Math.max(100, Math.min(2000, parseInt(process.env.VOICE_DEEPGRAM_ENDPOINTING_MS ?? "250", 10) || 250)),
  /** Deepgram utterance_end_ms — cap wait for utterance boundary. */
  voiceDeepgramUtteranceEndMs: Math.max(300, Math.min(3000, parseInt(process.env.VOICE_DEEPGRAM_UTTERANCE_END_MS ?? "800", 10) || 800)),
  /** Voice LLM (Anthropic Claude streaming): max tokens per turn. Default 800; cap 1200. */
  voiceLlmMaxTokens: Math.min(1200, Math.max(400, parseInt(process.env.VOICE_LLM_MAX_TOKENS ?? "800", 10) || 800)),
  /** Voice LLM temperature — lower = more consistent; higher = more varied. */
  voiceLlmTemperature: Math.min(0.85, Math.max(0.2, parseFloat(process.env.VOICE_LLM_TEMPERATURE ?? "0.40") || 0.4)),
  /**
   * Anthropic model for live voice streaming. claude-3-5-haiku-20241022 was retired 2026-02-19.
   * Override with VOICE_CLAUDE_MODEL or CLAUDE_MODEL.
   */
  voiceClaudeModel: (
    process.env.VOICE_CLAUDE_MODEL ||
    process.env.CLAUDE_MODEL ||
    "claude-haiku-4-5-20251001"
  ).trim(),
  /**
   * Live voice LLM: `openai` (default) or `anthropic`. OpenAI is tried first when primary is openai;
   * Anthropic is used as fallback if OpenAI fails or is unavailable.
   */
  voiceLlmPrimary:
    (process.env.VOICE_LLM_PRIMARY ?? "openai").trim().toLowerCase() === "anthropic"
      ? ("anthropic" as const)
      : ("openai" as const),
  /**
   * OpenAI Chat model for voice (streaming). Default gpt-4o-mini ≈ Haiku-class: fast, cost-efficient.
   * Upgrade: gpt-4o for higher quality (higher cost). Override with VOICE_OPENAI_MODEL.
   */
  voiceOpenAiModel: (process.env.VOICE_OPENAI_MODEL ?? "gpt-4o-mini").trim(),

  /** Barge-in: spoken ack only when enabled and heuristics pass (see realtimeVoiceEngine). */
  interruptAckEnabled: process.env.INTERRUPT_ACK_ENABLED !== "false",
  interruptAckMinSpeechMs: Math.max(200, parseInt(process.env.INTERRUPT_ACK_MIN_SPEECH_MS ?? "1200", 10) || 1200),
  /** When true, only STT low-confidence finals trigger a spoken interrupt ack (not duration-based). */
  interruptAckOnLowConfidenceOnly: process.env.INTERRUPT_ACK_ON_LOW_CONFIDENCE_ONLY === "true",
  /** Deepgram final transcript confidence below this = “low confidence” turn boundary. */
  voiceSttConfidenceLowThreshold: Math.min(0.99, Math.max(0.5, parseFloat(process.env.VOICE_STT_CONFIDENCE_LOW ?? "0.82") || 0.82)),
  /** Above this = “high confidence” — with short assistant playback, suppress interrupt ack (calm operator). */
  voiceSttConfidenceHighThreshold: Math.min(0.99, Math.max(0.6, parseFloat(process.env.VOICE_STT_CONFIDENCE_HIGH ?? "0.92") || 0.92)),
  /** Soft booking readiness gate for deterministic booking (0–1). */
  bookingScoreThreshold: Math.min(0.99, Math.max(0.2, parseFloat(process.env.BOOKING_SCORE_THRESHOLD ?? "0.65") || 0.65)),

  // ── Stripe (subscriptions — Customer Portal + Checkout) ───
  stripeSecretKey: (process.env.STRIPE_SECRET_KEY ?? "").trim(),
  stripeWebhookSecret: (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim(),
  /** Price ids from Stripe Dashboard (recurring prices) */
  stripePriceStarter: (process.env.STRIPE_PRICE_STARTER ?? "").trim(),
  stripePriceGrowth: (process.env.STRIPE_PRICE_GROWTH ?? "").trim(),
  stripePriceEnterprise: (process.env.STRIPE_PRICE_ENTERPRISE ?? "").trim(),
  stripeCheckoutSuccessPath: process.env.STRIPE_CHECKOUT_SUCCESS_PATH ?? "/settings?billing=success",
  stripeCheckoutCancelPath: process.env.STRIPE_CHECKOUT_CANCEL_PATH ?? "/settings?billing=cancel",

  // ── Legacy (kept for backward compat) ─────────────────────
  appId: process.env.VITE_APP_ID ?? "",

  // ── Feature flags (derived — no extra env vars needed) ────
  get voiceEnabled()  { return this.signalwireProjectId !== "" && this.signalwireToken !== ""; },
  get smsEnabled()    { return this.signalwireProjectId !== "" && this.signalwireToken !== ""; },
  get emailEnabled()  { return this.resendApiKey !== ""; },
  get ttsEnabled()    { return (process.env.CARTESIA_API_KEY ?? "").trim() !== ""; },
  get sttEnabled()    { return this.openAiApiKey !== "" || this.deepgramApiKey !== ""; },
  /** Live SignalWire streaming voice: Deepgram + Cartesia + OpenAI and/or Anthropic (LLM). */
  get voiceRealtimeReady() {
    return (
      this.deepgramApiKey !== "" &&
      this.cartesiaApiKey !== "" &&
      (this.openAiApiKey !== "" || this.anthropicApiKey !== "")
    );
  },
  /** When true and a transfer target exists (user profile or env), live voice may transfer via SignalWire. */
  liveTransferEnabled: process.env.LIVE_TRANSFER_ENABLED === "true",
  /** Fallback PSTN when `users.transferNumber` is empty — E.164 e.g. +15551234567 */
  liveTransferNumber: (process.env.LIVE_TRANSFER_NUMBER ?? "").trim(),
  get queueEnabled()  { return this.redisUrl !== ""; },
  get stripeEnabled() { return this.stripeSecretKey !== ""; },

  /** Resend `from` header — uses Railway RESEND_FROM_* when set. */
  get resendFromHeader(): string {
    const email = this.resendFromEmail || "noreply@apexai.com";
    const name = (this.resendFromName || "ApexAI").trim() || "ApexAI";
    return `${name} <${email}>`;
  },
  /** TRPC / templates / SMS-email AI — Claude (Anthropic). */
  get aiEnabled() {
    return this.anthropicApiKey !== "";
  },
};
