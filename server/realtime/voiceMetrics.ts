/**
 * voiceMetrics.ts — structured latency + phase tracing for Fin-style debugging
 */

export type VoiceTracePhase =
  | "engine_init"
  | "ws_connected"
  | "stream_start"
  | "first_media_in"
  | "deepgram_ready"
  | "cartesia_ready"
  | "greeting_sent"
  | "stt_final"
  | "response_pause"
  | "llm_route"
  | "llm_stream_start"
  | "turn_policy"
  | "tts_first_chunk"
  | "hangup_signal"
  | "cleanup"
  | "barge_in_energy";

const starts = new Map<string, number>();

export function traceStart(callId: string): void {
  starts.set(callId, Date.now());
}

export function traceEvent(
  callId: string,
  phase: VoiceTracePhase,
  extra?: Record<string, unknown>
): void {
  const t0 = starts.get(callId) ?? Date.now();
  const elapsed = Date.now() - t0;
  const payload = { phase, msSinceCallStart: elapsed, ...extra };
  console.log(`[VOICE-TRACE] ${callId} | ${phase} | +${elapsed}ms`, JSON.stringify(payload));
}

export function traceTurnTiming(
  callId: string,
  metrics: {
    speechEndMs?: number;
    sttMs?: number;
    llmMs?: number;
    ttsMs?: number;
    totalMs?: number;
  }
): void {
  console.log(`[VOICE-METRICS] ${callId}`, JSON.stringify(metrics));
}

export function traceEnd(callId: string): void {
  starts.delete(callId);
  sttFinalWallClock.delete(callId);
}

/** Wall-clock anchor when Deepgram emitted speech_final (user stop). */
const sttFinalWallClock = new Map<string, number>();

/** Call when committing a final transcript to the LLM path (after STT, before micro-pause/LLM). */
export function markSttFinalForLatency(callId: string): void {
  sttFinalWallClock.set(callId, Date.now());
}

/**
 * Call on first outbound TTS audio after user speech. Logs ms from STT final → audio.
 * Target under 800ms for snappy feel; if higher, tighten endpointing / reduce micro-pause.
 */
export function logSttFinalToTtsLatencyIfPending(callId: string): void {
  const t0 = sttFinalWallClock.get(callId);
  if (t0 === undefined) return;
  sttFinalWallClock.delete(callId);
  const ms = Date.now() - t0;
  const warn = ms > 800 ? " | ⚠ target <800ms (try VOICE_DEEPGRAM_ENDPOINTING_MS=250, VOICE_RESPONSE_MICRO_PAUSE_MS=120)" : "";
  console.log(`[VOICE-LATENCY] ${callId} | stt_final→tts_first_audio | ${ms}ms${warn}`);
}
