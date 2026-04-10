/**
 * Enforces: no follow-up until the user's question is directly and sufficiently answered.
 * Heuristic, deterministic — no extra LLM call.
 */

import {
  splitIntoSentences,
  MAX_SENTENCES,
  MAX_FOLLOW_UP_QUESTIONS,
  TARGET_MAX_SPOKEN_MS,
  type BlueprintIntent,
} from "./apexStrictBlueprint";

export { MAX_SENTENCES, MAX_FOLLOW_UP_QUESTIONS, TARGET_MAX_SPOKEN_MS };

const FILLER_OPENERS =
  /^(that'?s a great question|great question|good question|sure thing|absolutely)[,.]?\s*/i;

/** Spoken meta-labels the guard must never leave in output (they sound robotic on the phone). */
const META_ANSWER_PREFIX =
  /^(here'?s|here is)\s+(the\s+)?(direct\s+|right\s+|quick\s+)?(answer|response|thing)\s*[:\u2014\-\s]+/i;

const SOFTENERS =
  /\b(typically|generally|might|could help|tends to|usually|may help|can help improve)\b/gi;

/** Outcome / concrete signals — not vague platitudes. */
export function includesConcreteOutcome(response: string): boolean {
  const s = response.toLowerCase();
  if (/\$|\d+\s*(%|k\b|\/|per|month|min|sec)|booked|calendar|appointment|missed call|inbound|voicemail|lead|revenue|instant|24\/7|nothing slips|every call/i.test(s))
    return true;
  if (/\b(capture|qualif|route|close|pipeline|speed to lead)\b/i.test(s)) return true;
  return false;
}

/** Intent-aligned: response must address what they asked. */
export function answersCoreQuestion(
  response: string,
  userQuestion: string,
  intent: BlueprintIntent
): boolean {
  const u = userQuestion.toLowerCase();
  const r = response.toLowerCase();
  if (/\b(price|pricing|cost|how much|fee|plan|per month)\b/.test(u)) {
    return /\$|\d+|\b(price|cost|plan|month|fee|per)\b/i.test(r);
  }
  if (/\b(what do you do|who are you|tell me about)\b/.test(u) || intent === "core_explain") {
    return /\b(call|lead|book|answer|handles|inbound|calendar|qualif|apex)\b/i.test(r);
  }
  if (/\b(book|demo|schedule|appointment)\b/.test(u) || intent === "booking") {
    return true;
  }
  return true;
}

export function isAnswerSufficient(
  response: string,
  userQuestion: string,
  intent: BlueprintIntent
): boolean {
  if (!looksLikeQuestion(userQuestion)) return true;
  const coreOk = answersCoreQuestion(response, userQuestion, intent);
  const direct = answeredDirectly(userQuestion, response) && coreOk;

  if (isGeneralKnowledgeStyleQuestion(userQuestion)) {
    if (direct) return true;
    // Model may paraphrase without repeating the user's keywords — don't force a one-sentence chop.
    const sents = splitIntoSentences(response);
    if (sents.length >= 2 && response.trim().length >= 80 && coreOk) return true;
    return false;
  }

  if (!direct) return false;
  return includesConcreteOutcome(response);
}

/** Extract topic tokens from user text (question or statement). */
function topicTokens(text: string): Set<string> {
  const t = text.toLowerCase();
  const stop = new Set([
    "the", "a", "an", "is", "are", "was", "were", "what", "when", "where", "why", "how", "who",
    "do", "does", "did", "can", "could", "would", "should", "you", "your", "me", "my", "i", "we",
    "it", "this", "that", "to", "for", "of", "on", "in", "and", "or", "but", "just", "tell",
  ]);
  const words = t.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !stop.has(w));
  return new Set(words);
}

function sentenceAddressesTopic(sentence: string, userTokens: Set<string>): boolean {
  const s = sentence.toLowerCase();
  let hits = 0;
  for (const w of Array.from(userTokens)) {
    if (w.length > 3 && s.includes(w)) hits++;
  }
  if (userTokens.size === 0) return true;
  return hits >= 1 || (userTokens.size <= 2 && hits >= 1);
}

/**
 * User asked something substantive if they use a question mark or common question stems.
 */
export function looksLikeQuestion(userText: string): boolean {
  const t = userText.trim();
  if (/\?/.test(t)) return true;
  return /\b(what|when|where|why|how|who|which|price|cost|much)\b/i.test(t);
}

/**
 * World-fact / general-knowledge style questions — NOT product-pricing leads.
 * These must not be forced through `includesConcreteOutcome` (dollar signs, booking verbs), or we
 * collapse good answers to one thin sentence and sound "dumb" on the phone.
 */
export function isGeneralKnowledgeStyleQuestion(userText: string): boolean {
  const u = userText.toLowerCase().trim();
  if (/\b(how much|price|cost|fee|plan|charge|per month|subscription)\b/i.test(u)) return false;
  return /\b(who is|who was|who are|what is|what was|what are|when did|when was|where is|where was|how many)\b/i.test(
    u
  );
}

/**
 * Rough check: first 1–2 sentences should overlap user topic or answer-type cues.
 */
export function answeredDirectly(userQuestion: string, draftedResponse: string): boolean {
  const u = userQuestion.trim();
  const r = draftedResponse.replace(FILLER_OPENERS, "").trim();
  if (!u || !r) return true;
  if (!looksLikeQuestion(u)) return true;

  const sentences = splitIntoSentences(r);
  if (sentences.length === 0) return false;

  const tokens = topicTokens(u);
  const firstBlock = sentences.slice(0, 2).join(" ");
  if (sentenceAddressesTopic(firstBlock, tokens)) return true;

  if (/\b(price|pricing|cost|how much|fee|plan)\b/i.test(u) && /\b(\$|dollar|month|per month|plan|price|cost)/i.test(firstBlock))
    return true;

  return false;
}

/** Remove trailing interrogative sentences (keep at most one ? in last sentence if answered). */
export function stripFollowUpQuestion(text: string): string {
  const sentences = splitIntoSentences(text);
  if (sentences.length <= 1) return text.trim();

  const last = sentences[sentences.length - 1]!;
  if (!last.includes("?")) return text.trim();

  return sentences.slice(0, -1).join(" ").trim();
}

function clampSentences(text: string, max: number): string {
  const parts = splitIntoSentences(text);
  if (parts.length <= max) return text.trim();
  return parts.slice(0, max).join(" ").trim();
}

/** Strip softening words; keep meaning tight. */
export function compressAssertive(text: string): string {
  return text.replace(SOFTENERS, "").replace(/\s+/g, " ").replace(/ ,/g, ",").trim();
}

export function rewriteToDirectAnswer(_userQuestion: string, draftedResponse: string): string {
  const stripped = draftedResponse.replace(FILLER_OPENERS, "").replace(META_ANSWER_PREFIX, "").trim();
  const core = stripFollowUpQuestion(stripped);
  // Never prepend meta like "Here's the direct answer" — speak substance only.
  return clampSentences(core, MAX_SENTENCES);
}

export type DirectGuardResult = {
  text: string;
  strippedFollowUp: boolean;
  askedFollowupBeforeAnswer: boolean;
  answerInsufficient: boolean;
};

/**
 * Apply guard + max sentences. Optional intent for sufficiency check.
 */
export function postProcessAssistantResponse(
  userQuestion: string,
  drafted: string,
  intent: BlueprintIntent = "unknown"
): DirectGuardResult {
  let text = drafted.replace(/\s+/g, " ").trim();
  let strippedFollowUp = false;
  let askedFollowupBeforeAnswer = false;
  let answerInsufficient = false;

  text = compressAssertive(text).replace(META_ANSWER_PREFIX, "").trim();

  if (looksLikeQuestion(userQuestion) && !answeredDirectly(userQuestion, text)) {
    const before = text;
    text = stripFollowUpQuestion(text);
    strippedFollowUp = text !== before;
    askedFollowupBeforeAnswer = strippedFollowUp;
    if (!answeredDirectly(userQuestion, text)) {
      text = rewriteToDirectAnswer(userQuestion, text);
    }
  }

  if (looksLikeQuestion(userQuestion) && !isAnswerSufficient(text, userQuestion, intent)) {
    answerInsufficient = true;
    text = stripFollowUpQuestion(text).replace(META_ANSWER_PREFIX, "").trim();
    if (isGeneralKnowledgeStyleQuestion(userQuestion)) {
      // Keep the model’s substance — only clamp length; do not reduce to sentence one.
      text = clampSentences(text, MAX_SENTENCES);
    } else {
      const sents = splitIntoSentences(text);
      const first = (sents[0] ?? text).replace(META_ANSWER_PREFIX, "").trim();
      text = clampSentences(first, MAX_SENTENCES);
    }
  }

  if (intent === "core_explain") {
    text = clampSentences(text, 2);
  }

  text = clampSentences(text, MAX_SENTENCES);
  return { text, strippedFollowUp, askedFollowupBeforeAnswer, answerInsufficient };
}
