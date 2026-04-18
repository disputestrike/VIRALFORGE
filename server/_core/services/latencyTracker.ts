/**
 * latencyTracker.ts — Per-stage latency measurement for the voice pipeline.
 *
 * Tracks timestamps for each stage of the Listen→Think→Speak pipeline:
 *   audio_received → stt_partial → stt_final → llm_start → llm_ttft →
 *   llm_complete → tts_start → tts_first_audio → tts_complete
 *
 * Latency budgets (warn if exceeded):
 *   STT:      stt_final - audio_received  > 300ms
 *   LLM TTFT: llm_ttft  - llm_start       > 300ms
 *   TTS:      tts_first_audio - tts_start > 200ms
 *   Turn:     tts_complete - stt_final    > 700ms  (voice-to-voice target)
 */

export type LatencyPhase =
  | "audio_received"
  | "stt_partial"
  | "stt_final"
  | "llm_start"
  | "llm_ttft"
  | "llm_complete"
  | "tts_start"
  | "tts_first_audio"
  | "tts_complete";

export interface LatencyEvent {
  phase: LatencyPhase;
  wallClockMs: number;
  msSinceCallStart: number;
  metadata?: Record<string, unknown>;
}

export interface LatencySummary {
  sessionId: string;
  callId: string;
  events: LatencyEvent[];
  /** stt_final - audio_received */
  sttLatencyMs: number | null;
  /** llm_ttft - llm_start */
  llmTtftMs: number | null;
  /** tts_first_audio - tts_start */
  ttsLatencyMs: number | null;
  /** tts_complete - stt_final (voice-to-voice turn latency) */
  turnLatencyMs: number | null;
  /** tts_first_audio - stt_final (user stops → agent first audio) */
  sttFinalToFirstAudioMs: number | null;
}

interface SessionState {
  sessionId: string;
  callId: string;
  callStartMs: number;
  events: LatencyEvent[];
  timestamps: Partial<Record<LatencyPhase, number>>;
}

// In-memory store — keyed by sessionId
const sessions = new Map<string, SessionState>();

// Latency budgets in ms
const BUDGET_STT_MS = 300;
const BUDGET_LLM_TTFT_MS = 300;
const BUDGET_TTS_MS = 200;
const BUDGET_TURN_MS = 700;

/**
 * Initialise tracking for a new call session.
 * Call this as early as possible (engine_init / stream_start).
 */
export function startLatencyTracking(sessionId: string, callId: string): void {
  sessions.set(sessionId, {
    sessionId,
    callId,
    callStartMs: Date.now(),
    events: [],
    timestamps: {},
  });
}

/**
 * Record a pipeline phase event.
 * Non-blocking — DB persistence is fire-and-forget via setImmediate.
 */
export function recordEvent(
  sessionId: string,
  phase: LatencyPhase,
  metadata?: Record<string, unknown>
): void {
  const state = sessions.get(sessionId);
  if (!state) return;

  const wallClockMs = Date.now();
  const msSinceCallStart = wallClockMs - state.callStartMs;

  const event: LatencyEvent = { phase, wallClockMs, msSinceCallStart, metadata };
  state.events.push(event);
  state.timestamps[phase] = wallClockMs;

  // Warn on budget violations
  _checkBudget(state, phase);

  // Persist asynchronously — never block the voice pipeline
  setImmediate(() => {
    void import("../../db").then(({ insertVoiceMetricEvent }) =>
      insertVoiceMetricEvent({
        sessionId,
        callId: state.callId,
        phase,
        msSinceCallStart,
        extra: metadata ?? null,
      })
    ).catch(() => {/* swallow — metrics must never crash the call */});
  });
}

/**
 * Compute and return a latency summary for the session.
 * Also persists a composite `latency_summary` event to the DB.
 */
export function getLatencySummary(sessionId: string): LatencySummary | null {
  const state = sessions.get(sessionId);
  if (!state) return null;

  const ts = state.timestamps;

  const sttLatencyMs =
    ts.stt_final != null && ts.audio_received != null
      ? ts.stt_final - ts.audio_received
      : null;

  const llmTtftMs =
    ts.llm_ttft != null && ts.llm_start != null
      ? ts.llm_ttft - ts.llm_start
      : null;

  const ttsLatencyMs =
    ts.tts_first_audio != null && ts.tts_start != null
      ? ts.tts_first_audio - ts.tts_start
      : null;

  const turnLatencyMs =
    ts.tts_complete != null && ts.stt_final != null
      ? ts.tts_complete - ts.stt_final
      : null;

  const sttFinalToFirstAudioMs =
    ts.tts_first_audio != null && ts.stt_final != null
      ? ts.tts_first_audio - ts.stt_final
      : null;

  const summary: LatencySummary = {
    sessionId,
    callId: state.callId,
    events: [...state.events],
    sttLatencyMs,
    llmTtftMs,
    ttsLatencyMs,
    turnLatencyMs,
    sttFinalToFirstAudioMs,
  };

  // Persist composite summary event
  const msSinceCallStart = Date.now() - state.callStartMs;
  setImmediate(() => {
    void import("../../db").then(({ insertVoiceMetricEvent }) =>
      insertVoiceMetricEvent({
        sessionId,
        callId: state.callId,
        phase: "latency_summary",
        msSinceCallStart,
        extra: {
          sttLatencyMs,
          llmTtftMs,
          ttsLatencyMs,
          turnLatencyMs,
          sttFinalToFirstAudioMs,
        },
      })
    ).catch(() => {});
  });

  return summary;
}

/** Clean up session state after call ends. */
export function clearLatencySession(sessionId: string): void {
  sessions.delete(sessionId);
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function _checkBudget(state: SessionState, phase: LatencyPhase): void {
  const ts = state.timestamps;
  const callId = state.callId;

  if (phase === "stt_final" && ts.audio_received != null && ts.stt_final != null) {
    const ms = ts.stt_final - ts.audio_received;
    if (ms > BUDGET_STT_MS) {
      console.warn(
        `[LatencyTracker] ⚠ STT latency ${ms}ms > budget ${BUDGET_STT_MS}ms | callId=${callId}`
      );
    }
  }

  if (phase === "llm_ttft" && ts.llm_start != null && ts.llm_ttft != null) {
    const ms = ts.llm_ttft - ts.llm_start;
    if (ms > BUDGET_LLM_TTFT_MS) {
      console.warn(
        `[LatencyTracker] ⚠ LLM TTFT ${ms}ms > budget ${BUDGET_LLM_TTFT_MS}ms | callId=${callId}`
      );
    }
  }

  if (phase === "tts_first_audio" && ts.tts_start != null && ts.tts_first_audio != null) {
    const ms = ts.tts_first_audio - ts.tts_start;
    if (ms > BUDGET_TTS_MS) {
      console.warn(
        `[LatencyTracker] ⚠ TTS first-audio ${ms}ms > budget ${BUDGET_TTS_MS}ms | callId=${callId}`
      );
    }
  }

  if (phase === "tts_complete" && ts.stt_final != null && ts.tts_complete != null) {
    const ms = ts.tts_complete - ts.stt_final;
    if (ms > BUDGET_TURN_MS) {
      console.warn(
        `[LatencyTracker] ⚠ Turn latency ${ms}ms > budget ${BUDGET_TURN_MS}ms (target <700ms) | callId=${callId}`
      );
    }
  }
}

/**
 * Compute percentiles from a sorted numeric array.
 * @param sorted Ascending-sorted array of numbers
 */
export function computePercentiles(
  sorted: number[],
  percentiles: number[]
): Record<string, number | null> {
  if (sorted.length === 0) {
    return Object.fromEntries(percentiles.map((p) => [`p${p}`, null]));
  }
  return Object.fromEntries(
    percentiles.map((p) => {
      const idx = Math.floor((sorted.length - 1) * (p / 100));
      return [`p${p}`, sorted[idx] ?? null];
    })
  );
}
