/**
 * Explicit floor / turn-taking helpers (orchestration layer).
 * realtimeVoiceEngine.ts applies these alongside generationEpoch and stopSpeaking().
 *
 * **Silence ladder (WS1)** — implemented as timers + env, not a single FSM:
 * - `FINAL_SILENCE_DEBOUNCE_MS` — Deepgram end-of-utterance debounce
 * - `VOICE_RESPONSE_MICRO_PAUSE_MS` — pause after final before LLM
 * - `VOICE_USER_SILENCE_REENGAGE_MS` — silence after assistant playback → reprompt
 */

export type FloorOwner = "user" | "agent" | "none";

/** High-level turn phases (roadmap WS2) — engine maps behavior; not yet a standalone runtime. */
export type TurnPhase = "listening" | "thinking" | "speaking" | "overlap";

export function floorAfterUserBargeIn(): FloorOwner {
  return "user";
}

export function floorAfterAgentSpeaks(): FloorOwner {
  return "agent";
}

export function floorAfterAgentStops(): FloorOwner {
  return "none";
}
