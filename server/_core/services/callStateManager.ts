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

export interface IndustryPack {
  industry: string;
  displayName: string;
  requiredQualificationFields: string[];
  bookingTriggerConditions: string[];
  faqAnswers: Record<string, string>;
  prohibitedClaims: string[];
  handoffTriggers: string[];
  systemContext: string; // industry-specific context injected into prompt
}

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
}

// ── In-memory store ───────────────────────────────────────────────────────────

const callStates = new Map<string, CallState>();

// ── Industry Packs ────────────────────────────────────────────────────────────

export const INDUSTRY_PACKS: Record<string, IndustryPack> = {
  solar: {
    industry: "solar",
    displayName: "Solar Energy",
    requiredQualificationFields: ["zipCode", "homeowner", "monthlyElectricBill"],
    bookingTriggerConditions: ["service_area_confirmed", "interest_confirmed"],
    faqAnswers: {
      "how does solar work": "Solar panels convert sunlight into electricity, reducing your utility bill. Most homeowners save $100-200 per month.",
      "how long does installation take": "Installation typically takes 1-2 days after permits are approved, which takes 2-4 weeks.",
      "is my house eligible": "Most homes with a south-facing roof and good sun exposure qualify. We can check your specific address.",
    },
    prohibitedClaims: ["guaranteed savings without basis", "false tax credit amounts"],
    handoffTriggers: ["complex financing", "legal questions", "angry caller"],
    systemContext: "You help homeowners learn about solar energy and schedule free consultations. Key topics: service area, savings, incentives, installation, eligibility.",
  },
  general: {
    industry: "general",
    displayName: "General",
    requiredQualificationFields: ["name", "need"],
    bookingTriggerConditions: ["interest_confirmed"],
    faqAnswers: {},
    prohibitedClaims: [],
    handoffTriggers: ["complex questions", "angry caller"],
    systemContext: "You are a helpful AI assistant handling inbound calls. Answer questions and help callers with their needs.",
  },
};

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
