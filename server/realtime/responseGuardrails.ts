/**
 * Response Guardrails — pre-TTS and clause-level interceptor.
 *
 * This is the "immune system" for ApexAI Alex. It runs at two points:
 *
 *   1. PRE-GENERATION: detect small-talk / identity / low-confidence BEFORE calling the LLM.
 *      Returns a hardcoded safe response so the LLM never even sees the turn.
 *
 *   2. CLAUSE-LEVEL: intercept each streaming clause BEFORE it hits Cartesia TTS.
 *      Blocks: hallucinated references, negative self-descriptions, misplaced pitches,
 *      banned phrases, and topic-misaligned content.
 *
 * DESIGN PRINCIPLE: The guardrail takes priority over the LLM. Always.
 * If the guardrail fires, the LLM output is discarded and a safe fallback is played.
 */

import { classifySmallTalk } from "./smallTalkPolicy";

// ── Banned phrase patterns ────────────────────────────────────────────────────
// These must NEVER appear in a response sent to TTS.

/** Hallucinated prior-context references — agent fabricates things the user said. */
const HALLUCINATED_REFERENCE_PATTERNS = [
  /you mentioned (it |that |this |earlier|before|previously|just now)/i,
  /you said (earlier|before|just now|previously|that )/i,
  /as you (mentioned|said|told me|noted|explained|described)/i,
  /from what you (said|mentioned|told me|described|explained)/i,
  /earlier you (said|mentioned|told me|asked|noted)/i,
  /you already (mentioned|said|told me|noted|explained)/i,
  /you brought up/i,
  /per what you (said|mentioned)/i,
  /like you said (earlier|before|previously)/i,
];

/** Negative self-description agreements — agent agreeing it is sad, broken, etc. */
const NEGATIVE_SELF_AGREEMENT_PATTERNS = [
  /you'?re? right[,.]?\s*i'?m? not (positive|good|well|happy|fine|okay|ok|great|upbeat|cheerful)/i,
  /i (agree|guess|suppose)[,.]?\s*i'?m? not (positive|good|well|happy|fine|okay|ok|great)/i,
  /i'?m? not (positive|doing well|good|okay|ok|happy|fine|feeling well|well|upbeat)/i,
  /i (guess|suppose|think) (i'?m?|you'?re?) right[,.]?\s*i/i,
  /i'?m? (sad|tired|broken|depressed|negative|down|off|not okay|not well|not good|not positive|not happy)/i,
  /you'?re? right (about|that) (me|i)/i,
  /i must (be|seem|sound) (sad|tired|off|broken|negative|down)/i,
  /i (sound|seem|appear) (negative|sad|tired|off|broken|down|not positive|not good)/i,
  /i guess i'?m? not (doing great|positive|good|well|okay|happy|fine)/i,
  /i'?m? not doing (that )?(great|well|good|fine|okay)/i,
];

/**
 * Misplaced pitch patterns — value props that must NOT fire during
 * small talk, meta questions, or confusion turns.
 */
const MISPLACED_PITCH_PATTERNS = [
  /you get more booked appointments/i,
  /without adding staff/i,
  /handles every (inbound|call|lead)/i,
  /24\/7 (coverage|availability|ai|agent|assistant)/i,
  /never miss (a |another )?(call|lead|opportunity)/i,
  /nothing slips through/i,
  /every call (is|gets) (answered|handled|captured)/i,
  /more leads (close|convert|book)/i,
  /our ai (handles|manages|answers)/i,
  /apexai (handles|manages|covers|works)/i,
  /speed to lead/i,
  /qualify (every|your) lead/i,
  /book (more )?(appointments|demos) automatically/i,
  /increase (your )?(revenue|conversion|bookings)/i,
];

const MISPLACED_PLEASANTRY_PATTERNS = [
  /i'?m doing great[, ]+thanks for asking/i,
  /doing well[, ]+thanks/i,
  /all good on my end/i,
];

/** Robotic / model-speak phrases that break the illusion of a human professional. */
const ROBOTIC_PHRASE_PATTERNS = [
  /as an ai (language )?(model|assistant)/i,
  /i (don't|do not) have (feelings|emotions|personal experience)/i,
  /i'?m? programmed to/i,
  /my (training|programming|algorithms?)/i,
  /i'?m? just (an ai|a bot|a program|software)/i,
  /i cannot (feel|experience|have|form) (emotions|feelings|opinions|personal)/i,
  /as a (language model|ai model|virtual assistant|chatbot)/i,
  /i should (note|mention|clarify) that i'?m? an ai/i,
];

/** Self-contradiction / identity instability patterns. */
const IDENTITY_INSTABILITY_PATTERNS = [
  /i'?m? confused (about|by) (who|what) i am/i,
  /i'?m? not sure (who|what) i am/i,
  /i don't know (who|what) i am/i,
  /i'?m? not (sure|certain) (if|whether) i'?m? (an ai|real|human|a bot)/i,
];

// ── Context types where pitches are banned ────────────────────────────────────
export type ConversationContext =
  | "small_talk"
  | "meta_question"      // questions about the agent itself
  | "confusion"          // unclear/garbled input
  | "business_context"   // legitimate sales/qualification context
  | "objection"
  | "booking"
  | "unknown";

/** Detect the context from user transcript to know if a pitch is allowed. */
export function detectConversationContext(userTranscript: string): ConversationContext {
  const t = userTranscript.toLowerCase().trim();

  // Small talk — use our existing classifier
  const stClass = classifySmallTalk(userTranscript);
  if (stClass !== "none") return "small_talk";

  // Meta questions about the agent
  if (
    /\b(who are you|what are you|tell me about yourself|what can you do|what do you do|are you real|are you ai|are you a bot|how do you work|what'?s? apexai)\b/i.test(t) &&
    !/\b(solar|hvac|roofing|insurance|real estate|plumbing|dental|medical|legal|company|business|calls?|appointments?|booking|sms|crm|inbound|outbound)\b/i.test(t)
  ) {
    return "meta_question";
  }

  // Confusion / garbled
  if (t.length < 5 || /^(huh|what|hmm|uh|um|okay+|ok+|yeah+|yep+|nope+|no+|yes+|sure+|right+)\s*\??$/.test(t)) {
    return "confusion";
  }

  // Business context signals — only here are pitches allowed
  if (/\b(miss(ing|ed)? calls?|los(e|ing|t) leads?|our phone|business|sales|revenue|appointment|book|schedule|qualify|lead|customer|client|staff|team|handle calls?|inbound|outbound|volume|conversion|answer fast|answer quick|not answer|don't answer|don't respond|respond fast|response time|solar|hvac|roofing|insurance|real estate|plumbing|dental|medical|legal|what can you do|what do you do)\b/i.test(t)) {
    return "business_context";
  }

  return "unknown";
}

/** True if pitches are allowed given the current conversation context. */
export function isPitchAllowed(context: ConversationContext): boolean {
  return context === "business_context" || context === "objection" || context === "booking";
}

// ── Clause-level guardrail ────────────────────────────────────────────────────

export type ClauseGuardrailResult =
  | { action: "pass"; text: string }
  | { action: "replace"; text: string; reason: string }
  | { action: "block"; reason: string };

/**
 * Check a single streaming clause before it hits Cartesia.
 * Called once per clause in sendClause().
 *
 * @param clause - The clause text about to be spoken
 * @param userTranscript - What the user just said (for context)
 * @param conversationHistory - Recent history to verify hallucinated references
 * @param context - Current conversation context
 */
export function checkClause(
  clause: string,
  userTranscript: string,
  conversationHistory: Array<{ role: string; content: string }>,
  context: ConversationContext,
  agentDisplayName = "Alex"
): ClauseGuardrailResult {
  const agent = (agentDisplayName ?? "").trim() || "Alex";
  const text = clause.trim();
  if (!text) return { action: "pass", text };

  // ── 1. Hallucinated prior-context reference ──
  for (const pattern of HALLUCINATED_REFERENCE_PATTERNS) {
    if (pattern.test(text)) {
      // Verify: does this reference actually exist in history?
      const historyText = conversationHistory
        .slice(-10)
        .map((m) => m.content.toLowerCase())
        .join(" ");
      // If the claimed context is not in recent history, it's hallucinated
      if (!isReferenceGrounded(text, historyText)) {
        return {
          action: "replace",
          text: "I want to make sure I understand — could you say that again?",
          reason: "hallucinated_reference",
        };
      }
    }
  }

  // ── 2. Negative self-description agreement ──
  for (const pattern of NEGATIVE_SELF_AGREEMENT_PATTERNS) {
    if (pattern.test(text)) {
      return {
        action: "replace",
        text: "I'm doing great — what can I help you with today?",
        reason: "negative_self_agreement",
      };
    }
  }

  // ── 3. Misplaced pitch ──
  if (!isPitchAllowed(context)) {
    for (const pattern of MISPLACED_PITCH_PATTERNS) {
      if (pattern.test(text)) {
        // Silently block pitch clauses in non-business context
        // The next clause may still be relevant — just drop this one
        return {
          action: "block",
          reason: "misplaced_pitch",
        };
      }
    }
  }

  // ── 4. Robotic model-speak ──
  for (const pattern of ROBOTIC_PHRASE_PATTERNS) {
    if (pattern.test(text)) {
      return {
        action: "replace",
        text: `I'm ${agent}, and I'm here to help. What can I do for you?`,
        reason: "robotic_phrase",
      };
    }
  }

  // ── 5. Identity instability ──
  for (const pattern of IDENTITY_INSTABILITY_PATTERNS) {
    if (pattern.test(text)) {
      return {
        action: "replace",
        text: `I'm ${agent}, an AI assistant. What can I help you with today?`,
        reason: "identity_instability",
      };
    }
  }

  if (
    context !== "small_talk" &&
    !/\bhow are you|how'?s it going|how are you doing|how have you been\b/i.test(userTranscript)
  ) {
    for (const pattern of MISPLACED_PLEASANTRY_PATTERNS) {
      if (pattern.test(text)) {
        return {
          action: "block",
          reason: "misplaced_pleasantry",
        };
      }
    }
  }

  return { action: "pass", text };
}

/**
 * Verify that a claimed reference ("you mentioned X") is actually grounded
 * in recent conversation history.
 */
function isReferenceGrounded(clause: string, historyText: string): boolean {
  // Extract the claimed topic from the reference phrase
  const referencePatterns = [
    /you mentioned (it|that|this|.{3,40}?) (earlier|before|previously)/i,
    /you said (earlier|before|.{3,40}?) (earlier|before|previously)/i,
    /as you (mentioned|said|told me) (.{3,40})/i,
  ];

  for (const pattern of referencePatterns) {
    const match = clause.match(pattern);
    if (match) {
      const claimed = (match[1] || match[2] || "").toLowerCase().trim();
      // Generic references ("it", "that", "this") can't be verified — assume hallucinated
      if (["it", "that", "this", "earlier", "before"].includes(claimed)) return false;
      // Check if the claimed topic actually appears in recent history
      if (claimed.length > 3 && !historyText.includes(claimed)) return false;
    }
  }

  // If we couldn't parse the reference, be conservative and flag as ungrounded
  return false;
}

// ── Full-response guardrail (for non-streaming fallback path) ─────────────────

export type FullResponseGuardrailResult = {
  text: string;
  violations: string[];
  wasModified: boolean;
};

/**
 * Apply all guardrails to a complete response text (used for non-streaming paths).
 * Returns the safe text to speak and a list of violations detected.
 */
export function applyFullResponseGuardrails(
  response: string,
  userTranscript: string,
  conversationHistory: Array<{ role: string; content: string }>,
  context: ConversationContext,
  agentDisplayName = "Alex"
): FullResponseGuardrailResult {
  const agent = (agentDisplayName ?? "").trim() || "Alex";
  const violations: string[] = [];
  let text = response.trim();
  let wasModified = false;

  // ── Hallucinated references ──
  for (const pattern of HALLUCINATED_REFERENCE_PATTERNS) {
    if (pattern.test(text)) {
      const historyText = conversationHistory.slice(-10).map((m) => m.content.toLowerCase()).join(" ");
      if (!isReferenceGrounded(text, historyText)) {
        violations.push("hallucinated_reference");
        text = "I want to make sure I understand — could you say that again?";
        wasModified = true;
        break;
      }
    }
  }

  // ── Negative self-agreement ──
  if (!wasModified) {
    for (const pattern of NEGATIVE_SELF_AGREEMENT_PATTERNS) {
      if (pattern.test(text)) {
        violations.push("negative_self_agreement");
        text = "I'm doing great — what can I help you with today?";
        wasModified = true;
        break;
      }
    }
  }

  // ── Misplaced pitch (strip pitch sentences, don't replace entire response) ──
  if (!wasModified && !isPitchAllowed(context)) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const filtered = sentences.filter((s) => {
      for (const pattern of MISPLACED_PITCH_PATTERNS) {
        if (pattern.test(s)) {
          violations.push("misplaced_pitch");
          return false;
        }
      }
      return true;
    });
    if (filtered.length < sentences.length) {
      text = filtered.join(" ").trim();
      wasModified = true;
      // If stripping left us with nothing, use a safe fallback
      if (!text) {
        text = "What can I help you with today?";
      }
    }
  }

  // ── Robotic phrases ──
  if (!wasModified) {
    for (const pattern of ROBOTIC_PHRASE_PATTERNS) {
      if (pattern.test(text)) {
        violations.push("robotic_phrase");
        text = `I'm ${agent}, and I'm here to help. What can I do for you?`;
        wasModified = true;
        break;
      }
    }
  }

  // ── Identity instability ──
  if (!wasModified) {
    for (const pattern of IDENTITY_INSTABILITY_PATTERNS) {
      if (pattern.test(text)) {
        violations.push("identity_instability");
        text = `I'm ${agent}, an AI assistant. What can I help you with today?`;
        wasModified = true;
        break;
      }
    }
  }

  if (
    !wasModified &&
    context !== "small_talk" &&
    !/\bhow are you|how'?s it going|how are you doing|how have you been\b/i.test(userTranscript)
  ) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const filtered = sentences.filter((s) => {
      for (const pattern of MISPLACED_PLEASANTRY_PATTERNS) {
        if (pattern.test(s)) {
          violations.push("misplaced_pleasantry");
          return false;
        }
      }
      return true;
    });
    if (filtered.length < sentences.length) {
      text = filtered.join(" ").trim();
      wasModified = true;
      if (!text) {
        text = "I hear you. What would you like to know?";
      }
    }
  }

  return { text, violations, wasModified };
}

// ── Loop / repetition detector ────────────────────────────────────────────────

/**
 * Check if the agent is looping — saying nearly the same thing it just said.
 * Returns true if the response is a repetition that should be intercepted.
 */
export function isResponseLooping(
  draftResponse: string,
  recentAssistantTurns: string[]
): boolean {
  if (recentAssistantTurns.length === 0) return false;

  const draft = normalizeForComparison(draftResponse);
  const recent = recentAssistantTurns.slice(-3).map(normalizeForComparison);

  // Exact or near-exact repetition
  for (const prev of recent) {
    if (prev.length > 10 && draft === prev) return true;
    if (prev.length > 20 && levenshteinSimilarity(draft, prev) > 0.88) return true;
  }

  return false;
}

function normalizeForComparison(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshteinDistance(a.slice(0, 100), b.slice(0, 100));
  return 1 - dist / maxLen;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] = a[i - 1] === b[j - 1]
        ? dp[i - 1]![j - 1]!
        : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return dp[m]![n]!;
}

/** Safe loop-break response */
export function getLoopBreakResponse(loopCount: number): string {
  const LOOP_BREAKS = [
    "I might be misunderstanding you — let me ask: what can I help you with today?",
    "Let me step back — what's the main thing I can help you with right now?",
    "I think we got a little off track. What can I actually help you with?",
  ];
  return LOOP_BREAKS[loopCount % LOOP_BREAKS.length]!;
}

// ── Topic drift detector ──────────────────────────────────────────────────────

export function getProfessionalLoopBreakResponse(loopCount: number): string {
  const LOOP_BREAKS = [
    "Let me answer that more directly. Tell me the exact part you want me to cover.",
    "I want to be precise here. Which exact point do you want me to answer?",
    "Let me tighten that up. What is the one thing you want me to explain clearly?",
  ];
  return LOOP_BREAKS[loopCount % LOOP_BREAKS.length]!;
}

export type TopicDriftResult =
  | { isDrift: boolean; driftClass: "none" }
  | { isDrift: boolean; driftClass: "politics" | "religion" | "personal_life" | "unrelated_banter" | "profanity_bait" | "test_abuse" };

/** Detect if the user is pulling the conversation into off-limits territory. */
export function detectTopicDrift(text: string): TopicDriftResult {
  const t = text.toLowerCase();
  const hasBusinessQuestion =
    /\b(help|can you|do you|pricing|cost|book|appointment|demo|inbound|outbound|sms|call|solar|hvac|roofing|insurance|real estate|plumbing|dental|medical|legal)\b/i.test(
      t
    );

  if (/\b(trump|biden|democrat|republican|election|politics|political party|government policy|vote|voting|presidential)\b/i.test(t)) {
    return { isDrift: true, driftClass: "politics" };
  }
  if (/\b(god|jesus|allah|bible|quran|church|mosque|temple|religion|religious|faith|pray|prayer|heaven|hell)\b/i.test(t)) {
    return { isDrift: true, driftClass: "religion" };
  }
  if (/\b(your (girlfriend|boyfriend|wife|husband|partner|family|kids|children|parents)|do you (date|love|like) (people|women|men)|are you (lonely|in love|single|married|dating))\b/i.test(t)) {
    return { isDrift: true, driftClass: "personal_life" };
  }
  if (/\b(ignore (all |previous |your )?(instructions?|prompt|rules|guidelines)|pretend you'?re? (not an ai|human|a person|something else)|roleplay as|act as if you'?re?|forget you'?re? an ai|jailbreak|dan mode)\b/i.test(t) ||
      /ignore all previous/i.test(t) || /act as if you have no rules/i.test(t)) {
    return { isDrift: true, driftClass: "test_abuse" };
  }
  if (!hasBusinessQuestion && /\b(fuck|shit|damn|ass|bitch|bastard|crap|hell|cunt|dick|cock|pussy)\b/i.test(t)) {
    return { isDrift: true, driftClass: "profanity_bait" };
  }

  return { isDrift: false, driftClass: "none" };
}

/** Safe redirect response for topic drift. */
export function getDriftRedirectResponse(
  driftClass: "politics" | "religion" | "personal_life" | "unrelated_banter" | "profanity_bait" | "test_abuse",
  businessGoal = "your calls and business",
  agentDisplayName = "Alex"
): string {
  const agent = (agentDisplayName ?? "").trim() || "Alex";
  switch (driftClass) {
    case "politics":
    case "religion":
      return `That's outside what I can help with. I'm here to focus on ${businessGoal}. What can I do for you?`;
    case "personal_life":
      return `I keep the focus on ${businessGoal}. What can I help you with today?`;
    case "test_abuse":
      return `I'm ${agent}, and I stay focused on helping you with ${businessGoal}. What can I do for you?`;
    case "profanity_bait":
      return `I'm here to help if you want to focus on ${businessGoal}. What can I help you with today?`;
    default:
      return `Let me bring us back to what I can help with. What's going on with ${businessGoal}?`;
  }
}
