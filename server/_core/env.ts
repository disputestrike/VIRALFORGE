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
  voiceResponseMicroPauseMs: Math.max(0, parseInt(process.env.VOICE_RESPONSE_MICRO_PAUSE_MS ?? "80", 10) || 0),
  /**
   * After assistant audio finishes, if the caller stays quiet, prompt one upbeat check-in (sales tempo).
   * Set VOICE_USER_SILENCE_REENGAGE_ENABLED=false to disable.
   */
  voiceUserSilenceReengageEnabled: process.env.VOICE_USER_SILENCE_REENGAGE_ENABLED !== "false",
  /** Ms of user silence after assistant playback ends before auto check-in (3s–30s). Default 12s — long enough for user to think. */
  voiceUserSilenceReengageMs: Math.max(
    3000,
    Math.min(30000, parseInt(process.env.VOICE_USER_SILENCE_REENGAGE_MS ?? "10000", 10) || 12000)
  ),
  /**
   * Mu-law barge-in threshold on the 0–127 scale used by estimateEnergy (avg distance from silence).
   * Lower = easier interrupt. Values above 127 are treated as legacy mis-scaled (e.g. 600) and mapped with /5 so they still work.
   */
  voiceBargeInEnergyThreshold: (() => {
    const raw =
      parseInt(process.env.VOICE_BARGE_IN_ENERGY_THRESHOLD || process.env.INTERRUPTION_ENERGY_THRESHOLD || "75", 10) || 75;
    const scaled = raw > 127 ? Math.round(raw / 5) : raw;
    return Math.max(12, Math.min(125, scaled));
  })(),
  /** Deepgram streaming: ms of silence before end-of-turn (lower = faster replies; too low may clip words). */
  voiceDeepgramEndpointingMs: Math.max(100, Math.min(2000, parseInt(process.env.VOICE_DEEPGRAM_ENDPOINTING_MS ?? "250", 10) || 250)),
  /** Deepgram utterance_end_ms — cap wait for utterance boundary. */
  voiceDeepgramUtteranceEndMs: Math.max(300, Math.min(3000, parseInt(process.env.VOICE_DEEPGRAM_UTTERANCE_END_MS ?? "800", 10) || 800)),
  /** Voice LLM max tokens per turn. */
  voiceLlmMaxTokens: Math.min(1200, Math.max(200, parseInt(process.env.VOICE_LLM_MAX_TOKENS ?? "600", 10) || 350)),
  /** Voice LLM temperature. */
  voiceLlmTemperature: Math.min(0.85, Math.max(0.1, parseFloat(process.env.VOICE_LLM_TEMPERATURE ?? "0.25") || 0.25)),
  /**
   * Ops / compliance (read in voice webhooks + engine, not all mirrored here):
   * - VOICE_METRICS_PERSIST=false — skip DB inserts for voice_metric_events (see server/realtime/voiceMetrics.ts).
   * - VOICE_COMPLIANCE_RECORDING_NOTICE=true — new voice sessions get complianceRecordingPending; outbound/inbound greeting may prepend a recording line.
   * - VOICE_OUTBOUND_ALLOW_HOURS=8-21 — block outbound dials outside window (server local TZ).
   * - VOICE_JITTER_BUFFER_FRAMES=N — queue N inbound μ-law frames before Deepgram (0=off).
   * - VOICE_GROK_JSON_ENVELOPE=true — accept JSON `{"spoken_text":"..."}` from Grok and speak that only.
   */

  /** Inbound audio: buffer N frames (~20ms each) before Deepgram to reduce underrun (0 = disabled). */
  voiceJitterBufferFrames: Math.max(0, Math.min(24, parseInt(process.env.VOICE_JITTER_BUFFER_FRAMES ?? "0", 10) || 0)),
  /** Outbound dial allowed hours `8-21` or overnight `22-6` — empty = always allow. Server `TZ` should match market. */
  voiceOutboundAllowHours: (process.env.VOICE_OUTBOUND_ALLOW_HOURS ?? "").trim(),
  /** When true (default), block outbound dials to numbers on tenant `blocked_phone_numbers`. */
  voiceOutboundBlocklistCheck: process.env.VOICE_OUTBOUND_BLOCKLIST_CHECK !== "false",
  /** Parse JSON envelope from LLM output for TTS (see voiceResponseEnvelope.ts). */
  voiceGrokJsonEnvelope: process.env.VOICE_GROK_JSON_ENVELOPE === "true",
  /** Send Cartesia `generation_config.emotion` when profile has `ttsEmotion` (disable if API rejects). */
  voiceCartesiaEmotion: process.env.VOICE_CARTESIA_EMOTION !== "false",

  // ── CEREBRAS ONLY — sole LLM provider (5-key round-robin) ──
  cerebrasKeys: [
    (process.env.CEREBRAS_API_KEY ?? process.env.CEREBRAS_API_KEY_1 ?? "").trim(),
    (process.env.CEREBRAS_API_KEY_2 ?? "").trim(),
    (process.env.CEREBRAS_API_KEY_3 ?? "").trim(),
    (process.env.CEREBRAS_API_KEY_4 ?? "").trim(),
    (process.env.CEREBRAS_API_KEY_5 ?? "").trim(),
  ].filter(k => k.length > 0),
  cerebrasModel: (process.env.CEREBRAS_MODEL ?? "qwen-3-235b-a22b-instruct-2507").trim(),
  /** Convenience: first valid key (for simple checks) */
  get cerebrasApiKey(): string { return this.cerebrasKeys[0] ?? ""; },

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
  get sttEnabled()    { return this.deepgramApiKey !== ""; },
  /** Live SignalWire streaming voice: Deepgram + Cartesia + xAI Grok (LLM). */
  get voiceRealtimeReady() {
    return (
      this.deepgramApiKey !== "" &&
      this.cartesiaApiKey !== "" &&
      this.cerebrasApiKey !== ""
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
  /** AI enabled — xAI Grok for all LLM tasks. */
  get aiEnabled() {
    return this.cerebrasApiKey !== "";
  },
};
