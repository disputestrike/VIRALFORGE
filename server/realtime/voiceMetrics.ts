/**
 * voiceMetrics.ts — structured latency + phase tracing for Fin-style debugging
 *
 * Production path (canonical): SignalWire bidirectional stream → realtimeVoiceEngine.ts
 * (Deepgram STT → Grok → Cartesia TTS). deepgramVoiceAgent.ts is not wired on the live WS path.
 *
 * External metrics: set VOICE_METRICS_URL to post events to voice-metrics-service.
 */

const callIdToSessionId = new Map<string, string>();

/** Fire-and-forget POST to external voice-metrics-service. Never throws, never awaited. */
function postToMetricsService(
  callId: string,
  sessionId: string | null | undefined,
  phase: string,
  msSinceCallStart: number,
  extra?: Record<string, unknown>
): void {
  // Lazy import env to avoid circular deps at module load time
  let url: string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    url = require("../_core/env").env.voiceMetricsServiceUrl as string;
  } catch {
    return;
  }
  if (!url) return;

  const body = JSON.stringify({
    callId,
    sessionId: sessionId ?? null,
    phase,
    msSinceCallStart,
    extra: extra ?? null,
  });

  setImmediate(() => {
    fetch(`${url}/metrics/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(3000),
    }).catch(() => {
      // Silently drop — metrics must never impact call quality
    });
  });
}

/** Binds internal callId to SignalWire session for DB persistence. */
export function registerCallSessionForMetrics(callId: string, sessionId: string | undefined): void {
  if (sessionId) callIdToSessionId.set(callId, sessionId);
}

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
  | "barge_in_energy"
  | "stream_recovery_timeout"
  | "media_stream_stopped"
  | "sigws_ended"
  | "llm_slow_ack_800ms"
  | "failsafe_silence_2s_outbound"
  | "user_silence_reengage"
  | "strict_classify"
  | "date_authority_short_circuit"
  | "fast_intent_interim"
  | "latency_stt_final_to_tts_first"
  | "compliance_opt_out"
  | "llm_json_envelope_applied"
  | "tts_first_clause_streaming"
  | "tts_clause"
  | "latency_budget_exceeded";

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

  const sessionId = callIdToSessionId.get(callId);

  // Post to external voice-metrics-service (fire-and-forget, never blocks)
  postToMetricsService(callId, sessionId, phase, elapsed, extra);

  if (process.env.VOICE_METRICS_PERSIST === "false") return;
  setImmediate(() => {
    void import("../db").then(({ insertVoiceMetricEvent }) =>
      insertVoiceMetricEvent({
        callId,
        sessionId: sessionId ?? null,
        phase,
        msSinceCallStart: elapsed,
        extra: extra ?? null,
      })
    );
  });
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
  callIdToSessionId.delete(callId);
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
  traceEvent(callId, "latency_stt_final_to_tts_first", {
    ms,
    warnSlow: ms > 800,
  });
}
