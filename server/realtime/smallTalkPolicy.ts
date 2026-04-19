/**
 * Small-talk micro-policy for ApexAI voice agent "Alex".
 *
 * WHY THIS EXISTS:
 * The LLM must never freestyle responses to small-talk questions.
 * If it does, it will eventually:
 *   - agree with negative labels ("you're right, I'm not positive")
 *   - hallucinate context ("you mentioned it earlier")
 *   - fire random sales pitches ("you get more booked appointments")
 *
 * POLICY:
 *   1. Detect small-talk intent BEFORE the LLM is called.
 *   2. Return a hardcoded canonical response — LLM never sees it.
 *   3. Track consecutive small-talk turns; after MAX_SMALL_TALK_TURNS, force a pivot.
 *   4. Never let the agent agree with negative emotional labels.
 */

/** Maximum number of pure small-talk turns before forcing a business pivot. */
export const MAX_SMALL_TALK_TURNS = 2;

export type SmallTalkClass =
  | "hello_check"         // "hello?", repeated hello when caller thinks line is dead
  | "how_are_you"         // "how are you?", "you okay?", "how's it going?"
  | "negative_label"      // "you're not positive", "you sound tired", "are you sad?"
  | "are_you_ai"          // "are you a robot?", "are you real?", "is this AI?"
  | "meta_capability"     // "why are you so smart", "how do you know all this" — warm, brief, pivot (no lecture)
  | "where_from"          // "where are you from?", "what country?"
  | "your_name"           // "what's your name?", "who am I speaking to?"
  | "light_tease"         // "you're funny", "you sound weird", "interesting..."
  | "weather_day"         // "how's your day?", "nice weather?"
  | "none";               // not small talk

/** Detect the class of small-talk in a user utterance. Returns 'none' if not small talk. */
export function classifySmallTalk(text: string): SmallTalkClass {
  const t = text.toLowerCase().trim();

  if (/^(hello[?.!,\s]*){1,6}$/.test(t) || /^(hi[?.!,\s]*){1,6}$/.test(t)) {
    return "hello_check";
  }

  // Self-identity / AI disclosure (highest priority)
  if (
    /\b(are you (a )?(robot|ai|bot|machine|computer|automated|artificial|virtual|real person|human|live person)|is this (a )?(robot|bot|ai|automated|computer)|am i (talking|speaking) to (a )?(robot|ai|bot|computer|machine)|is (this|that) a (robot|bot|ai|machine))\b/i.test(t) ||
    /\bare you real\b/i.test(t) ||
    /\bis this automated\b/i.test(t) ||
    /\bare you (artificial|virtual|an? ai|an? bot)\b/i.test(t)
  ) {
    return "are_you_ai";
  }

  // Meta curiosity about how smart / capable the agent is (before light tease)
  if (
    /\b(why (are you|do you) (so )?(smart|clever|good|fast)|how (are you|can you be) (so )?(smart|clever)|how do you know (all )?(this|that|so much)|where did you learn (all )?this|you know (a lot|everything)|that'?s? (really )?smart)\b/i.test(
      t
    )
  ) {
    return "meta_capability";
  }

  // Name questions
  if (/\b(what'?s your name|who am i (talking|speaking) to|what (do|should) i call you|your name is|what are you called)\b/i.test(t)) {
    return "your_name";
  }

  // Negative emotional labels — "you're not positive", "you sound sad", "you seem tired"
  if (/\b(you'?re? not (positive|good|well|happy|fine|okay|ok|great|upbeat|cheerful)|you (sound|seem|look|appear) (sad|tired|negative|down|off|depressed|broken|bad|not good|not positive|not well|not okay|not happy)|you'?re? (sad|depressed|tired|broken|negative|not positive|not happy|not well|not good|not okay|not fine)|are you (okay|ok|alright|good|sad|tired|down|upset|not good|not positive|not well))\b/i.test(t)) {
    return "negative_label";
  }

  // How are you variants
  if (/\b(how are you|how are you doing|how'?s? (it going|everything|things|your day|life)|you (doing|feeling) (okay|ok|good|well|alright|fine)|are you (doing|feeling) (okay|ok|good|well|alright|fine)|how do you feel|how have you been|how'?s? (it|everything) going)\b/i.test(t)) {
    return "how_are_you";
  }

  // Day / weather small talk
  if (/\b(how'?s? your day|nice (day|weather)|what a (day|weather|morning|afternoon|evening)|how'?s? the weather|good (morning|afternoon|evening|day) to you)\b/i.test(t)) {
    return "weather_day";
  }

  // Where from
  if (/\b(where are you (from|located|based|calling from)|what country|what state|what city are you (in|from)|where do you (work|live|operate))\b/i.test(t)) {
    return "where_from";
  }

  // Light teasing / general meta commentary about the agent
  if (/\b(you'?re? (funny|weird|strange|interesting|cool|nice|smart|clever|great|good|not bad)|you (sound|seem) (funny|weird|strange|interesting|cool|nice|smart)|that'?s? (funny|weird|interesting|cute|clever)|you got me|haha|lol)\b/i.test(t)) {
    return "light_tease";
  }

  return "none";
}

/** True if this utterance is PURELY small talk with no business content. */
export function isPureSmallTalk(text: string): boolean {
  return classifySmallTalk(text) !== "none";
}

// ── Canonical response pools ─────────────────────────────────────────────────
// Rotating pools avoid the robot-loop of repeating the exact same sentence.
// Never let the LLM generate these — they are hardcoded and safe.

const HOW_ARE_YOU_RESPONSES = [
  "I'm doing great, thanks for asking. Go ahead.",
  "Doing well, thanks. What would you like to know?",
  "All good on my end. Go ahead.",
];

const HELLO_CHECK_RESPONSES = [
  "I'm here with you. Go ahead.",
  "Yes, I'm with you. What would you like to know?",
  "Right here. Go ahead when you're ready.",
];

const NEGATIVE_LABEL_RESPONSES = [
  "I promise I'm doing just fine. Go ahead.",
  "I'm actually doing great. Go ahead.",
  "All good here — fully focused on you. Tell me the exact part you want covered.",
];

const WHERE_FROM_RESPONSES = [
  "I'm an AI assistant, so I support callers wherever the business needs me. Go ahead.",
  "I'm an AI assistant working on this line. Tell me what you want to know.",
];

const LIGHT_TEASE_RESPONSES = [
  "Thank you — go ahead.",
  "Appreciate that. Go ahead.",
  "Glad to hear that. Tell me what you want to know.",
];

const META_CAPABILITY_RESPONSES = [
  "Fair question — I'm tuned for real phone conversations, so I can answer clearly and keep the call moving like a well-trained rep. What would you like to dig into next?",
  "I appreciate that — I'm built to sound natural on the phone and stay useful, not scripted. What's on your mind right now?",
  "Thanks for asking — the goal is to make this feel like a sharp front-desk conversation. What can I help you with next?",
];

const WEATHER_RESPONSES = [
  "Doing great, thanks. Go ahead.",
  "All good. What's on your mind?",
];

const PIVOT_RESPONSES = [
  "Let me make sure I'm helping with the right thing. Tell me what's going on with your business or your calls.",
  "Let me bring us back to what I can actually help with. Tell me the main thing you're dealing with.",
  "I'm here to help with something real for the business. Tell me the exact issue.",
];

/** Get a canonical response for a small-talk class, rotating through the pool. */
export function getSmallTalkResponse(
  stClass: SmallTalkClass,
  consecutiveTurns: number,
  businessName?: string,
  agentDisplayName?: string
): string {
  const agent = (agentDisplayName ?? "").trim() || "Alex";
  const areYouAiResponses = [
    `Yes — I'm ${agent}, an AI assistant. I'm here to help with your calls and business. Go ahead.`,
    `I am — I'm ${agent}, an AI assistant on this line. Tell me what you want to figure out.`,
    `Yes, I'm an AI assistant named ${agent}. Go ahead.`,
  ];
  const nameResponses = [
    `I'm ${agent} — an AI assistant here to help. Go ahead.`,
    `My name is ${agent}. Tell me what you want to know.`,
  ];
  // If we've hit the small-talk limit, force a business pivot
  if (
    consecutiveTurns >= MAX_SMALL_TALK_TURNS &&
    stClass !== "are_you_ai" &&
    stClass !== "your_name" &&
    stClass !== "meta_capability"
  ) {
    const idx = consecutiveTurns % PIVOT_RESPONSES.length;
    return PIVOT_RESPONSES[idx]!;
  }

  const pick = (pool: string[]) => pool[consecutiveTurns % pool.length]!;

  switch (stClass) {
    case "hello_check":   return pick(HELLO_CHECK_RESPONSES);
    case "how_are_you":    return pick(HOW_ARE_YOU_RESPONSES);
    case "negative_label": return pick(NEGATIVE_LABEL_RESPONSES);
    case "are_you_ai":     return pick(areYouAiResponses);
    case "your_name":      return pick(nameResponses);
    case "where_from":     return pick(WHERE_FROM_RESPONSES);
    case "light_tease":    return pick(LIGHT_TEASE_RESPONSES);
    case "meta_capability": return pick(META_CAPABILITY_RESPONSES);
    case "weather_day":    return pick(WEATHER_RESPONSES);
    default:               return pick(HOW_ARE_YOU_RESPONSES);
  }
}
