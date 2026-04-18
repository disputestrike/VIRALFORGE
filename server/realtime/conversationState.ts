/**
 * conversationState.ts — Per-call conversation state machine.
 *
 * Tracks: active topic, canonical question, repeat count, frustration score,
 * last answer summary, and the hard_no_reset flag that prevents mid-call
 * identity resets (the "I'm Alex, an AI assistant" problem).
 *
 * Lifecycle:
 *   1. createConversationState()  — called at engine init
 *   2. updateConvStateAfterUserTurn()  — called each time the user speaks
 *   3. updateConvStateAfterAssistantTurn() — called after each LLM response
 */

export interface ConversationState {
  /** The active topic being discussed. Null only on the first turn. */
  active_topic: string | null;
  /** High-level intent for the active topic (e.g. "quantify_business_outcome"). */
  active_intent: string | null;
  /** Whether the current topic is still open, has been answered, or is being clarified. */
  topic_status: "open" | "answered" | "clarifying";

  /** The caller's question in canonical (cleaned) form — locked once set. */
  canonical_user_question: string | null;
  /** Summary of the last assistant answer for this topic (first 200 chars). */
  last_answer_summary: string | null;

  /** How many times the caller has re-asked the same question this topic. */
  repeat_count: number;
  /** Timestamps of each repeated question (for rate analysis). */
  repeat_timestamps: number[];

  /**
   * Frustration score 0–10. Increments on "I said", "hello?", repeat asking.
   * Decays slightly on successful resolution.
   */
  frustration_score: number;
  patience_level: "high" | "medium" | "low";

  /** How many times a low-confidence fallback has been triggered this call. */
  fallback_count: number;

  /** Full text of the most recent assistant response. */
  last_ai_response: string | null;

  /**
   * TRUE after the caller's first real question.
   * When true, banned reset phrases ("I'm Alex…", "What can I help you with?")
   * are blocked from LLM output by resetGuardrails.
   */
  hard_no_reset: boolean;

  /** Whether the last assistant turn was interrupted by barge-in. */
  was_interrupted: boolean;
  /** The word the assistant was on when interrupted. */
  interrupted_at_word: string | null;

  call_start_time: number;
  last_turn_time: number;
  /** Total number of user turns processed this call. */
  turn_number: number;
}

export function createConversationState(): ConversationState {
  return {
    active_topic: null,
    active_intent: null,
    topic_status: "open",
    canonical_user_question: null,
    last_answer_summary: null,
    repeat_count: 0,
    repeat_timestamps: [],
    frustration_score: 0,
    patience_level: "high",
    fallback_count: 0,
    last_ai_response: null,
    hard_no_reset: false,
    was_interrupted: false,
    interrupted_at_word: null,
    call_start_time: Date.now(),
    last_turn_time: Date.now(),
    turn_number: 0,
  };
}

/**
 * Update state after the caller speaks and we have a STAY/PIVOT/REPAIR/CLOSE decision.
 * Call this BEFORE passing the state to the LLM.
 */
export function updateConvStateAfterUserTurn(
  state: ConversationState,
  userText: string,
  decision: "STAY" | "PIVOT" | "REPAIR" | "CLOSE",
  canonical: string
): ConversationState {
  const now = Date.now();
  const next: ConversationState = { ...state, last_turn_time: now, turn_number: state.turn_number + 1 };

  // Lock hard_no_reset after the first substantive user turn
  if (!state.hard_no_reset && userText.trim().length > 3) {
    next.hard_no_reset = true;
  }

  // Update canonical question if not yet set or pivoting to a new topic
  if (!state.canonical_user_question || decision === "PIVOT") {
    next.canonical_user_question = canonical;
  }

  // Derive a topic label if we don't have one or we're pivoting
  if (!next.active_topic || decision === "PIVOT") {
    next.active_topic = deriveTopicFromCanonical(canonical);
  }

  switch (decision) {
    case "STAY":
      next.repeat_count = state.repeat_count + 1;
      next.repeat_timestamps = [...state.repeat_timestamps, now];
      next.topic_status = "open";
      // Mild frustration accumulation on repeated questions
      if (next.repeat_count >= 2) {
        next.frustration_score = Math.min(10, state.frustration_score + 0.5);
      }
      break;

    case "REPAIR":
      next.frustration_score = Math.min(10, state.frustration_score + 2);
      next.repeat_count = state.repeat_count + 1;
      next.topic_status = "open";
      break;

    case "PIVOT":
      next.canonical_user_question = canonical;
      next.repeat_count = 0;
      next.repeat_timestamps = [];
      next.topic_status = "open";
      next.frustration_score = Math.max(0, state.frustration_score - 1);
      break;

    case "CLOSE":
      next.topic_status = "answered";
      next.frustration_score = Math.max(0, state.frustration_score - 1);
      next.repeat_count = 0;
      break;
  }

  next.patience_level =
    next.frustration_score >= 6 ? "low" : next.frustration_score >= 3 ? "medium" : "high";

  return next;
}

/**
 * Update state after the assistant responds.
 * Stores the answer summary so it can be injected into subsequent turns.
 */
export function updateConvStateAfterAssistantTurn(
  state: ConversationState,
  responseText: string
): ConversationState {
  const trimmed = responseText.trim();
  if (!trimmed) return state;
  const summary = trimmed.slice(0, 200);
  return {
    ...state,
    last_ai_response: summary,
    last_answer_summary: summary,
    last_turn_time: Date.now(),
  };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function deriveTopicFromCanonical(canonical: string): string {
  const c = canonical.toLowerCase();
  if (/revenue|money|earn|income|profit|sales/i.test(c)) return "revenue impact";
  if (/price|cost|pricing|fee|charge|subscription/i.test(c)) return "pricing";
  if (/how.*work|what.*do|what.*is/i.test(c)) return "how it works";
  if (/solar/i.test(c)) return "solar company benefits";
  if (/inbound|outbound|call.*(handling|answer)|answer.*call/i.test(c)) return "call handling";
  if (/sms|text message|follow.?up/i.test(c)) return "SMS follow-up";
  if (/book|appointment|schedule|calendar/i.test(c)) return "appointment booking";
  if (/setup|onboard|deploy|start|get started/i.test(c)) return "onboarding";
  if (/crm|hubspot|salesforce|integration/i.test(c)) return "CRM integration";
  if (/hvac|roofing|insurance|real estate|healthcare/i.test(c)) return "industry fit";
  return canonical.slice(0, 60);
}
