/**
 * VAQS (Voice Agent Quality Spec) — automated crosswalk metadata.
 * @see docs/internal/VOICE_AGENT_QUALITY_SPEC_SHEET.md
 *
 * Human-only criteria (listening rubric, live PSTN) are listed in vaqsEngineering.test.ts as skipped/notes.
 */

export type VaqsCrosswalkRow = {
  id: string;
  dimension: string;
  description: string;
  /** Paths relative to ApexAI repo root */
  paths: string[];
  /** Each substring must appear in the concatenation of all path files (for single-file rows, that file only). */
  mustContain?: string[];
};

/** Rows verifiable from repo artifacts without a live call. */
export const VAQS_AUTOMATED_CROSSWALK: VaqsCrosswalkRow[] = [
  {
    id: "VAQS-01",
    dimension: "TT",
    description: "Configurable Deepgram endpointing + post-final debounce before LLM",
    paths: ["server/realtime/realtimeVoiceEngine.ts", "server/_core/env.ts"],
    mustContain: ["voiceDeepgramEndpointingMs", "FINAL_SILENCE_DEBOUNCE"],
  },
  {
    id: "VAQS-02",
    dimension: "TT",
    description: "Turn pipeline hands off to response after micro-pause + policy",
    paths: ["server/realtime/realtimeVoiceEngine.ts"],
    mustContain: ["voiceResponseMicroPauseMs", "handleUserTurnImpl"],
  },
  {
    id: "VAQS-03",
    dimension: "TT",
    description: "Debounced Deepgram finals + optional jitter buffer reduce VAD flapping",
    paths: ["server/realtime/realtimeVoiceEngine.ts", "server/_core/env.ts"],
    mustContain: ["deepgramFinalDebounceTimer", "voiceJitterBufferFrames"],
  },
  {
    id: "VAQS-04",
    dimension: "TT",
    description: "Turn-commit trace after debounce for QA review of false cut-offs",
    paths: ["server/realtime/realtimeVoiceEngine.ts", "server/realtime/voiceMetrics.ts"],
    mustContain: ["deepgram_turn_committed", "debounceMs"],
  },
  {
    id: "VAQS-05",
    dimension: "BI",
    description: "Energy barge-in with sustained frames + stopSpeaking",
    paths: ["server/realtime/realtimeVoiceEngine.ts", "server/_core/env.ts"],
    mustContain: ["bargeInEnergyFrameCount", "voiceBargeInSustainFrames", "stopSpeaking"],
  },
  {
    id: "VAQS-06",
    dimension: "BI",
    description: "STT backup barge-in gated (final, min length) to reduce noise chops",
    paths: ["server/realtime/realtimeVoiceEngine.ts"],
    mustContain: ["sttBackupBarge", "transcript.trim().length >= 8"],
  },
  {
    id: "VAQS-07",
    dimension: "BI",
    description: "Inbound track processing + phone-optimized voice profiles (AEC is carrier/endpoint-dependent)",
    paths: ["server/realtime/realtimeVoiceEngine.ts", "server/realtime/voiceProfiles.ts"],
    mustContain: ["inbound", "phone"],
  },
  {
    id: "VAQS-08",
    dimension: "BI",
    description: "Generation epoch invalidates stale LLM/TTS after barge-in",
    paths: ["server/realtime/realtimeVoiceEngine.ts"],
    mustContain: ["generationEpoch++", "epoch !== generationEpoch"],
  },
  {
    id: "VAQS-09",
    dimension: "RT",
    description: "STT final → first TTS latency logging + warn >800ms",
    paths: ["server/realtime/voiceMetrics.ts", "server/realtime/realtimeVoiceEngine.ts"],
    mustContain: ["logSttFinalToTtsLatencyIfPending", "latency_stt_final_to_tts_first"],
  },
  {
    id: "VAQS-10",
    dimension: "RT",
    description: "Streaming first clause to TTS without waiting for full completion",
    paths: ["server/realtime/realtimeVoiceEngine.ts", "server/realtime/voiceMetrics.ts"],
    mustContain: ["tts_first_clause_streaming", "llm_stream_start"],
  },
  {
    id: "VAQS-11",
    dimension: "RT",
    description: "Backchannel policy in persona + interrupt-ack path",
    paths: ["server/realtime/dynamicPrompt.ts", "server/realtime/realtimeVoiceEngine.ts"],
    mustContain: ["Got it", "scheduleBlueprintInterruptAck"],
  },
  {
    id: "VAQS-12",
    dimension: "AQ",
    description: "Prompt requires spoken-complete factual answers (not one-word)",
    paths: ["server/realtime/dynamicPrompt.ts"],
    mustContain: ["FACTUAL QUESTIONS", "single word"],
  },
  {
    id: "VAQS-13",
    dimension: "AQ",
    description: "No markdown / lists — phone speech only",
    paths: ["server/realtime/dynamicPrompt.ts"],
    mustContain: ["markdown", "phone speech"],
  },
  {
    id: "VAQS-14",
    dimension: "AQ",
    description: "Length guard in persona + guardrails module",
    paths: ["server/realtime/dynamicPrompt.ts", "server/realtime/responseGuardrails.ts"],
    mustContain: ["4 short sentences", "checkClause"],
  },
  {
    id: "VAQS-15",
    dimension: "AQ",
    description: "Session facts + strict blueprint reduce contradictions",
    paths: ["server/realtime/realtimeVoiceEngine.ts", "server/realtime/strictTypes.ts"],
    mustContain: ["strictFacts", "HARD_RULES"],
  },
  {
    id: "VAQS-16",
    dimension: "DP",
    description: "Active question + answered flags in policy state",
    paths: ["server/realtime/callPolicy.ts"],
    mustContain: ["activeQuestion", "questionAnswered"],
  },
  {
    id: "VAQS-17",
    dimension: "DP",
    description: "Topic drift redirect + small-talk micro-policy",
    paths: ["server/realtime/realtimeVoiceEngine.ts", "server/realtime/smallTalkPolicy.ts", "server/realtime/responseGuardrails.ts"],
    mustContain: ["detectTopicDrift", "classifySmallTalk", "getDriftRedirectResponse"],
  },
  {
    id: "VAQS-18",
    dimension: "DP",
    description: "Conversation modes + live transfer intent detection",
    paths: ["server/realtime/callPolicy.ts", "server/realtime/dynamicPrompt.ts"],
    mustContain: ["ConversationMode", "handoff", "detectLiveTransferIntent"],
  },
  {
    id: "VAQS-19",
    dimension: "LA",
    description: "WebSocket reuse for Deepgram/Cartesia per call session",
    paths: ["server/realtime/realtimeVoiceEngine.ts"],
    mustContain: ["dgWs", "cartesiaWs"],
  },
  {
    id: "VAQS-20",
    dimension: "LA",
    description: "Voice LLM max tokens + dynamic prompt (not full dump every turn unbounded)",
    paths: ["server/_core/env.ts", "server/realtime/dynamicPrompt.ts"],
    mustContain: ["voiceLlmMaxTokens", "buildVoiceSystemPrompt"],
  },
  {
    id: "VAQS-21",
    dimension: "LA",
    description: "Exported trace phases + DB persistence for latency percentiles",
    paths: ["server/realtime/voiceMetrics.ts", "server/db.ts"],
    mustContain: ["insertVoiceMetricEvent", "latency_stt_final_to_tts_first"],
  },
];

/** IDs that still require manual PSTN / listening rubric (cannot assert in CI). */
export const VAQS_MANUAL_ONLY_HINTS: { id: string; note: string }[] = [
  { id: "VAQS-01", note: "False cut-off rate: measure from recordings + deepgram_turn_committed vs stt_final counts." },
  { id: "VAQS-02", note: "Natural handoff: listener checklist §7 spec sheet." },
  { id: "VAQS-06", note: "Noise fixture ≤1 false stop / 2 min TTS: lab audio scenario." },
  { id: "VAQS-07", note: "Echo self-trigger: handset test; not fully simulatable in unit tests." },
  { id: "VAQS-09", note: "p50/p95 TTFB: use persisted voice_metric_events after real calls." },
  { id: "VAQS-12", note: "≥90% factual rubric: human or golden transcript eval." },
  { id: "VAQS-13", note: "Listening checklist for speakability." },
  { id: "VAQS-14", note: "TTS duration vs word count: listening or offline TTS measure." },
  { id: "VAQS-16", note: "Tangent return scenarios §7.1 spec sheet." },
  { id: "VAQS-17", note: "Listener rates re-anchor after small talk." },
  { id: "VAQS-18", note: "Scripted handoff vs answer modes on live call." },
];
