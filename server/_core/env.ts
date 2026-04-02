/**
 * Central environment configuration for ApexAI
 * All process.env reads go through here — never access process.env directly in app code
 */

import { normalizeToE164US } from "./phoneE164";

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
  voiceTtsSpeedScale: Math.min(1.25, Math.max(0.55, parseFloat(process.env.VOICE_TTS_SPEED_SCALE ?? "1.0") || 1.0)),
  /** After Deepgram speech_final, pause before LLM — target 200–300ms for natural turn-taking. */
  voiceResponseMicroPauseMs: Math.max(0, parseInt(process.env.VOICE_RESPONSE_MICRO_PAUSE_MS ?? "250", 10) || 0),
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
   * Cerebras `gpt-oss-120b` only: reasoning_effort none|low|medium|high.
   * `low` or `none` = faster time-to-first-token for voice (default low).
   */
  voiceGptOssReasoningEffort: (() => {
    const v = (process.env.VOICE_GPT_OSS_REASONING_EFFORT ?? "low").toLowerCase();
    if (v === "none" || v === "low" || v === "medium" || v === "high") return v;
    return "low";
  })(),

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
  /** Non-voice / legacy routes may still use Cerebras pool when keys are set. Live voice engine uses Anthropic only. */
  get cerebrasConfigured() {
    return hasAnyCerebrasKey();
  },
  /** Live SignalWire streaming voice: Deepgram + Cartesia + Anthropic (Claude). Cerebras is not used on this path. */
  get voiceRealtimeReady() {
    return (
      this.deepgramApiKey !== "" &&
      this.cartesiaApiKey !== "" &&
      this.anthropicApiKey !== ""
    );
  },
  /** When true and `users.transferNumber` is set, live voice may transfer via SignalWire. */
  liveTransferEnabled: process.env.LIVE_TRANSFER_ENABLED === "true",
  get queueEnabled()  { return this.redisUrl !== ""; },
  get stripeEnabled() { return this.stripeSecretKey !== ""; },

  /** Resend `from` header — uses Railway RESEND_FROM_* when set. */
  get resendFromHeader(): string {
    const email = this.resendFromEmail || "noreply@apexai.com";
    const name = (this.resendFromName || "ApexAI").trim() || "ApexAI";
    return `${name} <${email}>`;
  },
  /** TRPC / templates / SMS-email AI text — Cerebras when keys exist; else Anthropic if set (or fallback flag). */
  get aiEnabled() {
    return (
      this.cerebrasConfigured ||
      this.anthropicApiKey !== ""
    );
  },
};
