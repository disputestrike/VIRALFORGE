/**
 * turnController.ts — explicit turn state for phone agents (P0 discipline)
 */

export type TurnState = "idle" | "assistant_speaking" | "user_speaking" | "processing";

export type TurnControllerState = {
  turnState: TurnState;
  interruptRequested: boolean;
  lastUserAudioAt: number | null;
  lastAssistantAudioAt: number | null;
};

export function createTurnController(): TurnControllerState {
  return {
    turnState: "idle",
    interruptRequested: false,
    lastUserAudioAt: null,
    lastAssistantAudioAt: null,
  };
}

/** Caller must bump LLM/audio epoch separately when barge-in invalidates playback */
export function onUserSpeechStart(s: TurnControllerState): TurnControllerState {
  return {
    ...s,
    turnState: "user_speaking",
    interruptRequested: true,
    lastUserAudioAt: Date.now(),
  };
}

export function onAssistantSpeakStart(s: TurnControllerState): TurnControllerState {
  return {
    ...s,
    turnState: "assistant_speaking",
    interruptRequested: false,
    lastAssistantAudioAt: Date.now(),
  };
}

export function onProcessing(s: TurnControllerState): TurnControllerState {
  return { ...s, turnState: "processing" };
}

export function onIdle(s: TurnControllerState): TurnControllerState {
  return { ...s, turnState: "idle" };
}
