/**
 * UNIVERSAL CONVERSATION ENGINE
 * State-driven, industry-agnostic voice agent
 * Uses CallState + IndustryPack + ClientConfig for all decisions
 */

import { invokeLLM } from "../llm";
import {
  CallState,
  IndustryPack,
  ClientConfig,
  ResponseMode,
  UtteranceIntent,
  INDUSTRY_PACKS,
  determineResponseMode,
  setActiveQuestion,
  resolveActiveQuestion,
  canOfferBooking,
  addTurn,
} from "./callStateManager";

export type ConversationAction =
  | "transfer"
  | "follow_up"
  | "book_appointment"
  | "end_call"
  | "propose_times"
  | undefined;

export interface ConversationResult {
  response: string;
  action: ConversationAction;
  confidence: number;
  updatedState: CallState;
}

// ── Intent classifier ─────────────────────────────────────────────────────────

async function classifyIntent(utterance: string, industry: string): Promise<{
  intent: UtteranceIntent;
  isQuestion: boolean;
  sentiment: "positive" | "neutral" | "frustrated" | "confused";
}> {
  // Fast local classification — no API call needed for common patterns
  const u = utterance.toLowerCase();

  if (u.match(/transfer|human|person|agent|representative|speak.*(someone|one)/)) {
    return { intent: "human_handoff_request", isQuestion: false, sentiment: "neutral" };
  }
  if (u.match(/not interested|no thanks|stop|remove|don't call|busy/)) {
    return { intent: "booking_resistance", isQuestion: false, sentiment: "neutral" };
  }
  if (u.match(/zip|area|city|state|serve|cover|available|location/)) {
    return { intent: "availability_check", isQuestion: true, sentiment: "neutral" };
  }
  if (u.match(/cost|price|how much|afford|expensive|cheap/)) {
    return { intent: "pricing_question", isQuestion: true, sentiment: "neutral" };
  }
  if (u.match(/discount|deal|promo|incentive|rebate|credit|save|offer/)) {
    return { intent: "discount_question", isQuestion: true, sentiment: "neutral" };
  }
  if (u.match(/how does|what is|tell me|explain|work|learn|info|more about/)) {
    return { intent: "product_question", isQuestion: true, sentiment: "neutral" };
  }
  if (u.match(/yes|sure|ok|interested|sounds good|book|schedule|appointment|meet/)) {
    return { intent: "booking_interest", isQuestion: false, sentiment: "positive" };
  }
  if (u.match(/frustrated|terrible|awful|horrible|useless|stop/)) {
    return { intent: "unclear", isQuestion: false, sentiment: "frustrated" };
  }

  return { intent: "unclear", isQuestion: false, sentiment: "neutral" };
}

// ── Main response generator ───────────────────────────────────────────────────

export async function generateResponse(
  userText: string,
  state: CallState,
  clientConfig?: Partial<ClientConfig>
): Promise<ConversationResult> {

  const pack = INDUSTRY_PACKS[state.industry] || INDUSTRY_PACKS.general;
  const businessName = clientConfig?.businessName || "ApexAI";
  const agentName = clientConfig?.agentName || "Aria";

  // 1. Classify intent
  const classification = await classifyIntent(userText, state.industry);

  // 2. Update state with user turn
  let updatedState = addTurn(state, "user", userText);
  updatedState = {
    ...updatedState,
    callerSentiment: classification.sentiment,
  };

  // 3. Set active question if new question detected
  if (classification.isQuestion && updatedState.activeQuestionResolved) {
    updatedState = setActiveQuestion(updatedState, userText, classification.intent);
  }

  // 4. Determine response mode — UNIVERSAL POLICY
  const responseMode = determineResponseMode(updatedState, classification.intent, userText);
  updatedState = { ...updatedState, responseMode };

  // 5. Build structured prompt
  const forbiddenActions: string[] = [];
  if (!canOfferBooking(updatedState)) {
    forbiddenActions.push("offer_booking_times", "propose_appointment_slots");
  }
  if (updatedState.stage === "greeting") {
    forbiddenActions.push("ask_for_qualification_info");
  }

  const language = (updatedState as any).language || "en";
  const systemPrompt = buildSystemPrompt(pack, clientConfig, responseMode, updatedState, forbiddenActions, agentName, businessName, language);

  // 6. Build minimal context (last 4 turns only — keep LLM fast)
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...updatedState.recentTurns.slice(-4).map(t => ({
      role: t.role as "user" | "assistant",
      content: t.content,
    })),
  ];

  // 7. Generate response
  let response = "Let me connect you with a team member who can help.";
  let action: ConversationAction = "follow_up";

  try {
    const result = await invokeLLM({ messages });
    const content = result.choices[0]?.message?.content || "";
    const clean = content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(clean);
    response = parsed.response || response;
    action = parsed.action || action;

    // 8. Resolve active question if we gave an answer
    if (responseMode === "answer" && !updatedState.activeQuestionResolved) {
      updatedState = resolveActiveQuestion(updatedState);
    }

    // 9. Allow booking after first successful answer + interest
    if (action === "book_appointment" || action === "propose_times") {
      updatedState = { ...updatedState, bookingAllowed: true };
    }

    // 10. Advance stage
    if (updatedState.stage === "greeting") {
      updatedState = { ...updatedState, stage: "intent_discovery" };
    } else if (updatedState.stage === "question_answering" && updatedState.activeQuestionResolved) {
      updatedState = { ...updatedState, stage: "qualification" };
    }

  } catch (err) {
    console.error("[ConversationEngine] LLM error:", err);
    updatedState = { ...updatedState, fallbackCount: updatedState.fallbackCount + 1 };
    response = "I apologize, could you repeat that?";
    action = "follow_up";
  }

  // 11. Add assistant turn to history
  updatedState = addTurn(updatedState, "assistant", response);

  return { response, action, confidence: 0.85, updatedState };
}

// ── Backward compat wrapper ───────────────────────────────────────────────────

export interface LegacyConversationContext {
  history: Array<{ role: "user" | "assistant"; content: string }>;
  text: string;
  leadName?: string;
  industry?: string;
  campaignGoal?: string;
}

export async function generateConversationResponse(
  context: LegacyConversationContext
): Promise<{ response: string; action: ConversationAction; confidence: number }> {
  // Create a temporary state for backward compat callers
  const tempState: CallState = {
    callId: `temp_${Date.now()}`,
    leadId: null,
    industry: context.industry || "solar",
    stage: context.history.length === 0 ? "greeting" : "question_answering",
    responseMode: "answer",
    assistantSpeaking: false,
    processing: false,
    activeQuestion: null,
    activeIntent: null,
    activeQuestionResolved: true,
    bookingAllowed: context.history.length > 2,
    handoffAllowed: true,
    userFacts: {},
    answeredQuestions: [],
    unresolvedQuestions: [],
    fallbackCount: 0,
    interruptCount: 0,
    callerSentiment: "neutral",
    recentTurns: context.history.slice(-6),
    lastUserUtterance: context.text,
    lastAssistantUtterance: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const result = await generateResponse(context.text, tempState);
  return { response: result.response, action: result.action, confidence: result.confidence };
}

export async function proposeAppointmentTimes(leadId: number): Promise<{
  times: Array<{ time: Date; label: string }>;
}> {
  const now = new Date();
  const times = [0, 2, 5].map(daysAhead => {
    const d = new Date(now);
    d.setDate(d.getDate() + daysAhead + 1);
    d.setHours(9, 0, 0, 0);
    return {
      time: d,
      label: d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    };
  });
  return { times };
}

// ── Prompt builder ────────────────────────────────────────────────────────────

// 12 supported languages
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German",
  pt: "Portuguese", it: "Italian", nl: "Dutch", pl: "Polish",
  ru: "Russian", zh: "Chinese (Mandarin)", ja: "Japanese", ko: "Korean",
};

function buildSystemPrompt(
  pack: IndustryPack,
  clientConfig: Partial<ClientConfig> | undefined,
  responseMode: ResponseMode,
  state: CallState,
  forbiddenActions: string[],
  agentName: string,
  businessName: string,
  language = "en"
): string {
  // SHORT prompt = low latency. Only inject what matters this turn.
  const noBook = !state.bookingAllowed ? " Do NOT offer appointments yet." : "";
  const activeQ = state.activeQuestion && !state.activeQuestionResolved
    ? ` Answer this question directly: "${state.activeQuestion}"` : "";
  const areas = clientConfig?.serviceAreas?.length
    ? `Service areas: ${clientConfig.serviceAreas.slice(0, 5).join(", ")}.` : "";
  const offers = clientConfig?.discounts?.length
    ? `Offers: ${clientConfig.discounts.join(", ")}.` : "";
  const langName = LANGUAGE_NAMES[language] || "English";
  const langInstruction = language !== "en"
    ? `IMPORTANT: Respond ONLY in ${langName}. The caller speaks ${langName}.` : "";

  return `You are ${agentName} for ${businessName}. ${pack.systemContext}
Mode: ${responseMode}. Stage: ${state.stage}.${activeQ}${noBook}
${areas} ${offers}
${langInstruction}
Rules: Max 2 short sentences. Answer what caller just said. Natural speech. No lists.
Reply ONLY with JSON: {"response":"...","action":"follow_up|book_appointment|propose_times|transfer|end_call","confidence":0.9}`;
}

export default { generateConversationResponse, generateResponse, proposeAppointmentTimes };
