/**
 * Unified orchestration snapshot for voice sessions (roadmap WS4).
 * Engine + session manager read/write; keeps repair/opt-out/compliance in one shape.
 */

export type CallOrchestrationSnapshot = {
  repairTurnCount: number;
  /** Set when recording disclosure was spoken (compliance). */
  recordingDisclosureGiven: boolean;
  /** User asked to stop contact / opt out — policy should end call politely. */
  optOutRequested: boolean;
  /** Last hints from fast intent router (debugging). */
  lastFastIntentHints?: string[];
};

export function emptyOrchestrationSnapshot(): CallOrchestrationSnapshot {
  return {
    repairTurnCount: 0,
    recordingDisclosureGiven: false,
    optOutRequested: false,
  };
}

/** Merge partial updates onto the session snapshot (roadmap WS4). */
export function patchOrchestrationSnapshot(
  current: CallOrchestrationSnapshot | undefined,
  patch: Partial<CallOrchestrationSnapshot>
): CallOrchestrationSnapshot {
  return { ...emptyOrchestrationSnapshot(), ...current, ...patch };
}
