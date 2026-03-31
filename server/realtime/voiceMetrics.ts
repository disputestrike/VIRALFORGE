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
  | "llm_route"
  | "tts_first_chunk"
  | "hangup_signal"
  | "cleanup";

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
}
