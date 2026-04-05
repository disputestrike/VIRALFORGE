/**
 * UNIVERSAL CALL STATE MANAGER
 * Industry-agnostic conversation state machine
 * Industry packs + client configs plug in on top
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type CallStage =
  | "greeting"
  | "intent_discovery"
  | "question_answering"
  | "qualification"
  | "recommendation"
  | "booking"
  | "handoff"
  | "closed";

export type ResponseMode =
  | "answer"
  | "clarify"
  | "qualify"
  | "recommend"
  | "book"
  | "handoff"
  | "fallback";

export type UtteranceIntent =
  | "availability_check"
  | "pricing_question"
  | "discount_question"
  | "product_question"
  | "qualification_response"
  | "booking_interest"
  | "booking_resistance"
  | "support_request"
  | "human_handoff_request"
  | "unclear";

export interface CallState {
  callId: string;
  leadId?: number | null;
  industry: string;
  stage: CallStage;
  responseMode: ResponseMode;

  // Turn state
  assistantSpeaking: boolean;
  processing: boolean;

  // Question lock
  activeQuestion: string | null;
  activeIntent: UtteranceIntent | null;
  activeQuestionResolved: boolean;

  // Policy
  bookingAllowed: boolean;
  handoffAllowed: boolean;

  // Facts collected
  userFacts: Record<string, string | number | boolean | null>;
  answeredQuestions: string[];
  unresolvedQuestions: string[];

  // Quality metrics
  fallbackCount: number;
  interruptCount: number;
  callerSentiment: "positive" | "neutral" | "frustrated" | "confused";

  // History (last 6 turns max)
  recentTurns: Array<{ role: "user" | "assistant"; content: string }>;
  lastUserUtterance: string | null;
  lastAssistantUtterance: string | null;

  createdAt: number;
  updatedAt: number;
}

/** @see domainPacks.ts — single canonical shape */
export type { DomainPack as IndustryPack } from "./domainPacks";

export interface ClientConfig {
  clientId: string;
  businessName: string;
  industry: string;
  serviceAreas: string[];
  discounts: string[];
  bookingUrl?: string;
  transferNumber?: string;
  operatingHours?: string;
  agentName: string;
  brandVoice: "professional" | "friendly" | "consultative";
  customFAQ: Record<string, string>;
  /** Voice/domain: overrides curated vertical label in prompts */
  primaryIndustryLabel?: string;
  /** Tenant-authored domain context (any vertical) */
  voiceIndustryContext?: string;
  /** Comma/newline terms — brands, jargon */
  voiceKeyPhrases?: string;
  /** Extra “never say” / compliance lines */
  voiceRestrictionNotes?: string;
}

// ── In-memory store ───────────────────────────────────────────────────────────

const callStates = new Map<string, CallState>();

export {
  resolveDomainPack,
  tenantOverlayFromClientConfig,
  normalizeIndustryKey,
  CURATED_DOMAIN_PACKS as INDUSTRY_PACKS,
} from "./domainPacks";

// ── Factory ───────────────────────────────────────────────────────────────────

export function createCallState(callId: string, leadId?: number | null, industry = "solar"): CallState {
  const state: CallState = {
    callId,
    leadId: leadId ?? null,
    industry,
    stage: "greeting",
    responseMode: "answer",
    assistantSpeaking: false,
    processing: false,
    activeQuestion: null,
    activeIntent: null,
    activeQuestionResolved: true,
    bookingAllowed: false,
    handoffAllowed: true,
    userFacts: {},
    answeredQuestions: [],
    unresolvedQuestions: [],
    fallbackCount: 0,
    interruptCount: 0,
    callerSentiment: "neutral",
    recentTurns: [],
    lastUserUtterance: null,
    lastAssistantUtterance: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  callStates.set(callId, state);
  return state;
}

export function getCallState(callId: string): CallState | null {
  return callStates.get(callId) ?? null;
}

export function updateCallState(callId: string, updates: Partial<CallState>): CallState | null {
  const state = callStates.get(callId);
  if (!state) return null;
  const updated = { ...state, ...updates, updatedAt: Date.now() };
  callStates.set(callId, updated);
  return updated;
}

export function deleteCallState(callId: string): void {
  callStates.delete(callId);
}

// ── State transitions ─────────────────────────────────────────────────────────

export function setActiveQuestion(state: CallState, question: string, intent: UtteranceIntent): CallState {
  return {
    ...state,
    activeQuestion: question,
    activeIntent: intent,
    activeQuestionResolved: false,
    stage: "question_answering",
    responseMode: "answer",
    updatedAt: Date.now(),
  };
}

export function resolveActiveQuestion(state: CallState): CallState {
  return {
    ...state,
    activeQuestionResolved: true,
    answeredQuestions: state.activeQuestion
      ? [...state.answeredQuestions, state.activeQuestion]
      : state.answeredQuestions,
    updatedAt: Date.now(),
  };
}

export function canOfferBooking(state: CallState): boolean {
  return (
    state.activeQuestionResolved &&
    state.bookingAllowed &&
    state.callerSentiment !== "frustrated" &&
    state.stage !== "greeting" &&
    state.stage !== "intent_discovery"
  );
}

export function determineResponseMode(
  state: CallState,
  intent: UtteranceIntent,
  utterance: string
): ResponseMode {
  // Always answer active unresolved question first
  if (!state.activeQuestionResolved && state.activeQuestion) {
    return "answer";
  }

  // Handoff triggers
  if (
    intent === "human_handoff_request" ||
    state.fallbackCount >= 3 ||
    state.callerSentiment === "frustrated"
  ) {
    return "handoff";
  }

  // Booking — only if allowed
  if (intent === "booking_interest" && canOfferBooking(state)) {
    return "book";
  }

  // Question types
  if (
    intent === "availability_check" ||
    intent === "pricing_question" ||
    intent === "discount_question" ||
    intent === "product_question"
  ) {
    return "answer";
  }

  if (intent === "qualification_response") {
    return "qualify";
  }

  if (intent === "booking_resistance") {
    return "recommend";
  }

  if (intent === "unclear") {
    return state.fallbackCount < 2 ? "clarify" : "handoff";
  }

  return "clarify";
}

export function addTurn(
  state: CallState,
  role: "user" | "assistant",
  content: string
): CallState {
  const turns = [...state.recentTurns, { role, content }].slice(-8); // keep last 8
  return {
    ...state,
    recentTurns: turns,
    lastUserUtterance: role === "user" ? content : state.lastUserUtterance,
    lastAssistantUtterance: role === "assistant" ? content : state.lastAssistantUtterance,
    updatedAt: Date.now(),
  };
}
