/**
 * callPolicy.ts — Enforces conversation rules
 * Active-question lock, booking guardrails, hangup logic
 */

export type ConversationMode = "answer" | "qualify" | "recommend" | "book" | "close";

export interface CallState {
  mode: ConversationMode;
  activeQuestion: string | null;
  questionAnswered: boolean;
  interestConfirmed: boolean;
  bookingAllowed: boolean;
  objectionCount: number;
  turnCount: number;
  endCallRequested: boolean;
}

export function createCallState(): CallState {
  return {
    mode: "answer",
    activeQuestion: null,
    questionAnswered: false,
    interestConfirmed: false,
    bookingAllowed: false,
    objectionCount: 0,
    turnCount: 0,
    endCallRequested: false,
  };
}

/** Heuristic: caller asked something that must be answered before booking */
export function detectUserQuestion(transcript: string): boolean {
  const t = transcript.toLowerCase();
  if (t.includes("?")) return true;
  const q = [
    "how much",
    "what is",
    "who is",
    "do you",
    "can you",
    "are you",
    "tell me",
    "explain",
    "discount",
    "cost",
    "price",
    "zip",
    "serve",
    "coverage",
    "area",
    "where",
    "when",
    "why",
  ];
  return q.some((k) => t.includes(k));
}

/** Booking slots may only be offered when policy allows */
export function canOfferBooking(state: CallState): boolean {
  return (
    state.questionAnswered &&
    state.interestConfirmed &&
    state.bookingAllowed &&
    !state.endCallRequested
  );
}

export function detectEndCallIntent(transcript: string): boolean {
  const t = transcript.toLowerCase().trim();
  const endPhrases = [
    "no thanks", "no thank you", "not interested", "i'm done",
    "that's all", "stop calling", "remove me", "don't call",
    "goodbye", "bye", "i have to go", "i'm busy",
  ];
  return endPhrases.some(p => t === p || t.startsWith(p) || t.endsWith(p));
}

export function isObjection(transcript: string): boolean {
  const t = transcript.toLowerCase();
  return [
    "too expensive", "too much", "can't afford", "not worth",
    "already have", "scam", "fake", "not legit", "chatbot", "just a robot",
  ].some(k => t.includes(k));
}

export function isComplexTurn(transcript: string): boolean {
  const t = transcript.toLowerCase();
  // Keep most turns on the fast path (Cerebras); reserve Claude for clearly heavy turns
  if (transcript.length > 220) return true;
  if ((transcript.match(/\?/g) || []).length >= 3) return true;
  return [
    "how does this work", "what makes you different",
    "compare", "versus", "better than", "prove it",
    "guarantee", "contract", "walk me through", "explain in detail",
  ].some(k => t.includes(k));
}

export function updateCallState(state: CallState, transcript: string): CallState {
  const updated = { ...state };
  updated.turnCount++;

  if (detectEndCallIntent(transcript)) {
    updated.endCallRequested = true;
    updated.mode = "close";
    return updated;
  }

  if (isObjection(transcript)) {
    updated.objectionCount++;
  }

  if (detectUserQuestion(transcript)) {
    updated.activeQuestion = transcript.slice(0, 220);
    updated.questionAnswered = false;
    updated.bookingAllowed = false;
  }

  const t = transcript.toLowerCase();
  if (["yes", "yeah", "sure", "sounds good", "interested", "let's do it", "book it"].some((p) => t.includes(p))) {
    if (updated.questionAnswered) {
      updated.interestConfirmed = true;
    }
  }

  if (updated.endCallRequested) {
    updated.mode = "close";
  } else if (!updated.questionAnswered) {
    updated.mode = "answer";
  } else if (!updated.interestConfirmed) {
    updated.mode = "qualify";
  } else if (!updated.bookingAllowed) {
    updated.mode = "recommend";
  } else {
    updated.mode = "book";
  }

  return updated;
}

export function markQuestionAnswered(state: CallState): CallState {
  const updated = { ...state };
  updated.questionAnswered = true;
  updated.activeQuestion = null;
  if (updated.interestConfirmed) {
    updated.bookingAllowed = true;
  }
  if (updated.mode === "answer") updated.mode = "qualify";
  return updated;
}
