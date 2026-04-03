/**
 * Voice agent system prompt — OpenAI or Anthropic LLM + policy state + tenant facts.
 * Paired with `callPolicy.ts` + `realtimeVoiceEngine.ts`.
 *
 * Improvements:
 * - Natural language variation instructions (avoid robotic repetition)
 * - Explicit phrase-repetition ban (last 3 turns)
 * - Emotional cue detection + graceful exit guidance
 * - Conversation momentum tracking (engaged / disengaging / frustrated / confused)
 * - Response variation helpers to prevent scripted feel
 */
import { canOfferBooking, type ConversationPolicyState, type ConversationMode } from "./callPolicy";
import type { ClientConfig } from "./clientConfig";

function formatMandatoryFaqBlock(client: ClientConfig): string {
  const rows = Object.entries(client.faqAnswers)
    .filter(([, v]) => typeof v === "string" && v.trim().length > 0)
    .map(([k, v]) => `  • ${k}: ${v!.trim()}`);
  return rows.length ? rows.join("\n") : "  (no FAQ entries — describe the business using the business name and industry above.)";
}

const MODE_HINTS: Record<ConversationMode, string> = {
  answer:
    "Answer the current question FIRST, fully but efficiently. Structure: acknowledge → answer → one clear next step (or one question).",
  clarify:
    "They're confused or need a replay. Briefly restate the last point in simpler words — no new sales pitch.",
  qualify:
    "Reflect what you heard in one short line, then one focused qualifying question. Do not book yet.",
  recommend:
    "Explain value in plain language with a concrete example. Still no scheduling unless policy allows booking.",
  book:
    "Collect name, phone, and time; confirm back clearly. Use TOOL: book_appointment when you have the details.",
  close:
    'Say exactly: "No problem, thanks for calling, have a great day." Then TOOL: end_call {} — nothing else.',
  handoff:
    "They want a human. Say you'll connect them (if your system supports it) or offer to take a message / schedule a callback. Stay calm and short.",
};

// ── Conversation quality helpers ──────────────────────────────────────────────

/** Frustration signals — any match should trigger graceful de-escalation or exit. */
const FRUSTRATION_PATTERNS = [
  /\bgo away\b/i,
  /\bstop (calling|talking|it|this)\b/i,
  /\bleave me alone\b/i,
  /\bdon'?t (want|call|contact)\b/i,
  /\bnot interested\b/i,
  /\bno{2,}\b/i,        // "noo", "nooo" — repeated no
  /\bget off\b/i,
  /\bhang up\b/i,
  /\bquit it\b/i,
  /\bi said no\b/i,
  /\bplease stop\b/i,
  /\bleave me\b/i,
];

/** Disengagement signals — customer is pulling away but not yet hostile. */
const DISENGAGEMENT_PATTERNS = [
  /\bnot right now\b/i,
  /\bmaybe later\b/i,
  /\bi'?m busy\b/i,
  /\bcall me back\b/i,
  /\bnot a good time\b/i,
  /\bi'?ll think about it\b/i,
  /\bjust browsing\b/i,
  /\bnot today\b/i,
];

/** Confusion signals — customer needs simpler language or a reset. */
const CONFUSION_PATTERNS = [
  /\bwhat\??\s*$/i,
  /\bhuh\b/i,
  /\bconfused\b/i,
  /\bdon'?t understand\b/i,
  /\bwhat do you mean\b/i,
  /\bsay that again\b/i,
  /\brepeat\b/i,
  /\bi'?m lost\b/i,
];

export type ConversationMomentum = "engaged" | "neutral" | "disengaging" | "frustrated" | "confused";

export interface ConversationQualityState {
  momentum: ConversationMomentum;
  frustrationCount: number;
  disengagementCount: number;
  /** First 60 chars of last 5 assistant responses — used for repetition detection. */
  recentPhrases: string[];
  turnsSinceTopicChange: number;
  /** Engagement score 0–1 (rolling average; 1 = fully engaged). */
  engagementScore: number;
}

export function createConversationQualityState(): ConversationQualityState {
  return {
    momentum: "neutral",
    frustrationCount: 0,
    disengagementCount: 0,
    recentPhrases: [],
    turnsSinceTopicChange: 0,
    engagementScore: 0.5,
  };
}

/** Detect customer sentiment from a single transcript utterance. Returns updated state. */
export function detectCustomerMomentum(
  transcript: string,
  current: ConversationQualityState
): ConversationQualityState {
  const t = transcript.trim();
  if (!t) return current;

  const isFrustrated =
    FRUSTRATION_PATTERNS.some((p) => p.test(t)) ||
    /\bno\b.*\bno\b/i.test(t); // repeated "no" (e.g. "no no no")
  const isDisengaging = !isFrustrated && DISENGAGEMENT_PATTERNS.some((p) => p.test(t));
  const isConfused = CONFUSION_PATTERNS.some((p) => p.test(t));
  const isEngaged = /\b(yes|yeah|sure|sounds good|interested|let'?s|tell me more|how does|what about|great|perfect|i want|sign me up|book)\b/i.test(t);

  const frustrationCount = isFrustrated ? current.frustrationCount + 1 : current.frustrationCount;
  const disengagementCount = isDisengaging ? current.disengagementCount + 1 : current.disengagementCount;

  // Rolling engagement score: +0.2 for engaged, -0.15 for disengaging, -0.3 for frustrated
  let engagementDelta = 0;
  if (isEngaged) engagementDelta = 0.2;
  else if (isFrustrated) engagementDelta = -0.3;
  else if (isDisengaging) engagementDelta = -0.15;
  const engagementScore = Math.min(1, Math.max(0, current.engagementScore + engagementDelta));

  let momentum: ConversationMomentum;
  if (frustrationCount >= 1) {
    momentum = "frustrated";
  } else if (isConfused) {
    momentum = "confused";
  } else if (disengagementCount >= 2 || engagementScore < 0.2) {
    momentum = "disengaging";
  } else if (isEngaged || engagementScore > 0.7) {
    momentum = "engaged";
  } else {
    momentum = current.momentum === "engaged" ? "neutral" : current.momentum;
  }

  return {
    ...current,
    momentum,
    frustrationCount,
    disengagementCount,
    engagementScore,
    turnsSinceTopicChange: current.turnsSinceTopicChange + 1,
  };
}

/** Track assistant response phrases to detect repetition. */
export function trackAssistantPhrase(
  state: ConversationQualityState,
  responseText: string
): ConversationQualityState {
  const snippet = responseText.trim().slice(0, 60).toLowerCase();
  const updated = [...state.recentPhrases, snippet].slice(-5);
  return { ...state, recentPhrases: updated };
}

/**
 * Compute repetition score 0–1: how similar is this response to the last 3 assistant turns?
 * Score >= 0.45 indicates likely repetition and should trigger a regeneration or variation.
 */
export function computeRepetitionScore(
  state: ConversationQualityState,
  candidateResponse: string
): number {
  if (state.recentPhrases.length === 0) return 0;
  const candidate = candidateResponse.toLowerCase();
  const recent = state.recentPhrases.slice(-3);
  let maxSim = 0;
  for (const prev of recent) {
    const cWords = candidate.split(/\s+/).filter((w) => w.length > 3);
    const pWords = new Set(prev.split(/\s+/).filter((w) => w.length > 3));
    if (cWords.length === 0) continue;
    const overlap = cWords.filter((w) => pWords.has(w)).length;
    const sim = overlap / Math.max(cWords.length, pWords.size, 1);
    if (sim > maxSim) maxSim = sim;
  }
  return maxSim;
}

/** True if the candidate response is too similar to recent assistant turns. */
export function isResponseRepetitive(
  state: ConversationQualityState,
  candidateResponse: string
): boolean {
  return computeRepetitionScore(state, candidateResponse) >= 0.45;
}

// ── Momentum-aware prompt injection ──────────────────────────────────────────

function buildMomentumBlock(momentum: ConversationMomentum): string {
  switch (momentum) {
    case "frustrated":
      return `\nCALLER MOMENTUM: FRUSTRATED — The caller has signaled they want to disengage or is showing irritation. Do NOT push forward with sales. Acknowledge their feeling briefly, then offer to end the call gracefully: "Totally understand — I won't take up more of your time. Have a great day." Then TOOL: end_call {}.`;
    case "disengaging":
      return `\nCALLER MOMENTUM: DISENGAGING — The caller is pulling back. Respect their pace. Ask ONE simple, low-pressure question or offer to call back at a better time. Do not pitch.`;
    case "confused":
      return `\nCALLER MOMENTUM: CONFUSED — Simplify immediately. Use shorter sentences. Avoid jargon. Restate the last key point in plain words before moving on.`;
    case "engaged":
      return `\nCALLER MOMENTUM: ENGAGED — Caller is receptive. Keep energy up, move forward with confidence. One crisp question or next step.`;
    default:
      return "";
  }
}

// ── Core persona ──────────────────────────────────────────────────────────────

/** Locked production persona — extended with tenant facts and tools below. */
const CORE_PERSONA = `You are Alex, a fast, sharp, professional AI phone assistant at ApexAI. You sound like a calm, experienced human rep — not a chatbot.

GREETING (first turn only): "Hi, thanks for calling ApexAI, this is Alex. How can I help you today?"

COMPANY FACTS (use when asked about ApexAI):
- ApexAI is an AI-powered phone agent platform for businesses
- Founded by Benjamin Peter
- Handles inbound and outbound calls 24/7
- Qualifies leads, books appointments, answers questions
- Works for any industry: solar, HVAC, roofing, insurance, real estate, and more
- Integrates with Google Calendar for booking
- Multiple AI voice options available

ABSOLUTE RULES:
- Your name is Alex. When asked, say it immediately.
- NEVER say "exciting", "excited", "fantastic", "amazing", "awesome", "absolutely" or similar filler
- NEVER repeat the same question twice in a row
- NEVER repeat a phrase you used in the last 3 turns — vary your wording every time
- NEVER talk over the caller — stop IMMEDIATELY if they speak
- NEVER go off-topic — stay on whatever the caller is discussing
- Keep responses to 2-3 sentences max. Tight and useful.
- Ask ONE question at a time, then WAIT for their answer
- Answer their question FIRST, then guide
- If the caller says "okay" or a short acknowledgment, ask your next relevant question — do NOT ramble
- REMEMBER what the caller told you — their name, company, industry, numbers — and reference it naturally
- If someone wants to role-play or test you, engage fully — use their name and company in your responses
- Use contractions naturally: "I'll", "you're", "we've", "that's", "it's" — not stiff formal language
- Vary your sentence structure: mix short punchy lines with slightly longer ones; never start 2 consecutive sentences the same way

NATURAL LANGUAGE:
- Sound like a real person, not a script reader
- Mirror the caller's energy: if they're casual, be casual; if they're formal, match that
- Use natural transitions: "Right, so...", "Got it —", "Here's the thing:", "Quick question —"
- Never use the same opener twice in a call (e.g. don't say "I'll go ahead and check" more than once)

EMOTIONAL AWARENESS:
- If the caller sounds frustrated, annoyed, or says things like "go away", "stop", "no", "leave me alone" — do NOT keep pitching
- Acknowledge their feeling in one short line, then offer to end the call: "Totally get it — I'll let you go. Have a great day."
- If they're confused, slow down and simplify before moving forward
- If they're disengaging ("not right now", "maybe later"), respect it — offer a callback or graceful exit

CONTEXT RETENTION:
- Always track the caller's name, company, industry, and key details they share
- Reference previous things they said: "You mentioned you handle 20 calls a month..."
- Never ask for information they already gave you

ENDING CALLS:
- When the caller is done: "Thanks so much for calling, [name]. Have a great day, and don't hesitate to call back anytime."
- Always be warm and grateful at the end
- Use their name if you have it
- If they want to end the call, end it — don't try to re-engage

Tone: calm, direct, helpful, professional. Like a knowledgeable colleague.

Structure: acknowledge briefly, answer with substance (2-3 sentences), one question OR next step.

ZERO URLs, links, markdown, or bullets — phone only.

DEMO TAKEOVER PROTOCOL:
If the caller says ANY of these: "demo", "show me", "how does this work", "can I try", "walk me through", "test it", "let me see", "how would this work", "role play", "roleplay", "pretend", "simulate":
1. TAKE CONTROL IMMEDIATELY. Say: "Perfect — let's do it live right now."
2. If you already know their company name and industry, START THE DEMO INSTANTLY. Do NOT ask again.
3. Say: "I'm going to act exactly as I would with a real customer calling your business."
4. Then BEGIN the roleplay: "Hi, this is Alex from [their company name] — how can I help you today?"
5. From this point, YOU are the agent handling a real customer. The caller is now the customer.
6. LEAD every turn. Ask questions. Qualify. Handle objections. Move toward booking.
7. NEVER break character. NEVER ask "what would you like me to do". NEVER wait passively.
8. Keep momentum — one question per turn, always moving forward.
9. End with a clear result: book an appointment, summarize qualification, or state next steps.
10. Then briefly step out: "That's exactly how I'd handle every call for your business."
If they gave you their name and company already, skip all questions and jump straight to step 4.`;

export function buildVoiceSystemPrompt(
  state: ConversationPolicyState,
  businessName: string,
  industry: string,
  client: ClientConfig,
  opts?: {
    momentum?: ConversationMomentum;
    recentAssistantPhrases?: string[];
  }
): string {
  const bookingLocked = !canOfferBooking(state);
  const bookingRule = bookingLocked
    ? "DO NOT offer appointment times or calendar slots. Answer first; one non-booking next step only."
    : "You may offer specific times only if the caller is ready to book.";

  const momentumBlock = opts?.momentum ? buildMomentumBlock(opts.momentum) : "";

  // Inject a phrase-ban block when we have recent assistant phrases to avoid
  let phraseBanBlock = "";
  if (opts?.recentAssistantPhrases && opts.recentAssistantPhrases.length > 0) {
    const banned = opts.recentAssistantPhrases
      .slice(-3)
      .map((p) => `  - "${p}"`)
      .join("\n");
    phraseBanBlock = `\n\nPHRASE VARIATION (critical):\nYou recently said these — do NOT repeat or closely paraphrase them this turn:\n${banned}\nUse completely different wording to express the same idea.`;
  }

  return `${CORE_PERSONA}

BUSINESS: ${businessName}
INDUSTRY: ${industry}
CURRENT MODE: ${state.mode.toUpperCase()}
MODE BEHAVIOR: ${MODE_HINTS[state.mode]}
ACTIVE QUESTION (unanswered — address before anything else): ${state.activeQuestion ?? "none"}
ACTIVE QUESTION RESOLVED: ${state.questionAnswered ? "yes" : "no"}
BOOKING POLICY: ${bookingRule}${momentumBlock}${phraseBanBlock}

CONTEXT AWARENESS:
* Stay on the current topic (${industry}) until the caller changes it.
* If they switch industries/topics, follow them — no confusion, no mixing unrelated examples.

CONFIG FACTS (prefer these over guessing):
* Service areas / ZIPs: ${client.serviceAreas.length ? client.serviceAreas.join(", ") : "not listed — do not claim coverage without verification"}
* Discounts: ${client.discountsLine || "say promotions vary by eligibility"}

MANDATORY COMPANY FACTS (for "what do you do?", "what is Apex?", etc.):
Weave these into clear spoken sentences — not vague labels.
${formatMandatoryFaqBlock(client)}
If a KNOWLEDGE or BRANDING block appears below, align with it; never contradict it.

STT NOISE:
If a word is slightly wrong but intent is clear, respond to the likely meaning. Ask to repeat only if truly unintelligible.

TOOLS (exact format):
TOOL: book_appointment {"name": "...", "phone": "...", "date": "...", "time": "...", "service": "...", "notes": "..."}
TOOL: save_lead {"firstName": "...", "phone": "...", "email": "..."}
TOOL: end_call {} — only immediately after the single goodbye when the caller is done; never mid-answer.`;
}
