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
  "I'm doing great, thanks for asking! What can I help you with today?",
  "Doing well and ready to help. What's on your mind?",
  "All good on my end — what can I do for you today?",
];

const NEGATIVE_LABEL_RESPONSES = [
  "Ha — I promise I'm doing just fine. Ready to help. What can I do for you?",
  "I'm actually doing great! What can I help you with today?",
  "All good here — fully focused on you. What's going on?",
];

const ARE_YOU_AI_RESPONSES = [
  "Yes — I'm Alex, an AI assistant. I'm here to help with your calls and business. What can I do for you?",
  "I am — I'm Alex, an AI. Happy to help. What are you looking for today?",
  "Yes, I'm an AI assistant named Alex. What can I help you with?",
];

const NAME_RESPONSES = [
  "I'm Alex — an AI assistant here to help. What can I do for you today?",
  "My name is Alex. How can I help you?",
];

const WHERE_FROM_RESPONSES = [
  "I'm based wherever you need me to be — I'm an AI. What can I help you with today?",
  "I'm an AI, so I'm everywhere and nowhere. What can I do for you?",
];

const LIGHT_TEASE_RESPONSES = [
  "Ha, thank you! Let me put that energy to work — what can I help you with?",
  "Appreciate it! Now, what can I help you with today?",
  "You're too kind. What can I do for you?",
];

const META_CAPABILITY_RESPONSES = [
  "Fair question — I'm built to handle typical customer questions clearly and stay on track, kind of like a well-trained rep. What would you like to dig into next?",
  "I appreciate that — I'm an AI assistant tuned for phone conversations, so I can walk through options and answer common questions smoothly. What's on your mind right now?",
  "Thanks for asking — I'm here to sound natural and be useful on calls like this, not to show off. What can I help you with next?",
];

const WEATHER_RESPONSES = [
  "Doing great, thanks! What can I help you with today?",
  "All good! What's on your mind?",
];

const PIVOT_RESPONSES = [
  "I think we've been chatting for a bit — let me make sure I'm actually helpful here. What's going on with your business or your calls?",
  "Let me bring us back to what I can actually help with. What's the main thing you're dealing with right now?",
  "I'm here to help you with something real — what can I do for your business today?",
];

/** Get a canonical response for a small-talk class, rotating through the pool. */
export function getSmallTalkResponse(
  stClass: SmallTalkClass,
  consecutiveTurns: number,
  businessName?: string
): string {
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
    case "how_are_you":    return pick(HOW_ARE_YOU_RESPONSES);
    case "negative_label": return pick(NEGATIVE_LABEL_RESPONSES);
    case "are_you_ai":     return pick(ARE_YOU_AI_RESPONSES);
    case "your_name":      return pick(NAME_RESPONSES);
    case "where_from":     return pick(WHERE_FROM_RESPONSES);
    case "light_tease":    return pick(LIGHT_TEASE_RESPONSES);
    case "meta_capability": return pick(META_CAPABILITY_RESPONSES);
    case "weather_day":    return pick(WEATHER_RESPONSES);
    default:               return pick(HOW_ARE_YOU_RESPONSES);
  }
}
