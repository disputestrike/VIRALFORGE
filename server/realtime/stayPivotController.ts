/**
 * stayPivotController.ts — Conversation routing decision engine.
 *
 * Runs BEFORE every LLM call to decide whether to:
 *   STAY   — user is repeating/clarifying the same question
 *   PIVOT  — user has asked a genuinely new question
 *   REPAIR — user is frustrated ("I said…", "hello?", etc.)
 *   CLOSE  — user confirmed/acknowledged and the topic is resolved
 *
 * This eliminates: false pivots, mid-conversation resets, generic fallbacks,
 * and infinite repetition loops.
 */

import type { ConversationState } from "./conversationState";

export type StayPivotDecision = "STAY" | "PIVOT" | "REPAIR" | "CLOSE";

// ── Frustration signals ───────────────────────────────────────────────────────

const FRUSTRATION_TRIGGERS = [
  "i said",
  "hello?",
  "are you there",
  "can you hear me",
  "you're not listening",
  "youre not listening",
  "not listening",
  "let me finish",
  "slow down",
  "be patient",
  "too much",
  "too much stuff",
  "giving me so much",
  "go one at a time",
  "one at a time",
  "patient with me",
  "hold on",
  "wait wait",
  "stop repeating yourself",
  "that's not what i",
  "thats not what i",
];

// ── Explicit new-topic signals ────────────────────────────────────────────────

const NEW_TOPIC_KEYWORDS = [
  "pricing",
  "cost",
  "how much does",
  "inbound calls",
  "outbound campaign",
  "sms feature",
  "text message feature",
  "setup process",
  "onboarding",
  "deployment",
  "hospitality",
  "healthcare",
  "competitor",
  "compare to",
  "integration with",
  "crm integration",
  "trial",
  "cancel",
  "refund",
];

const EXPLICIT_TOPIC_PIVOT_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "military", pattern: /\bmilitary\b/i },
  { label: "higher education", pattern: /\bhigher educat(?:ion|e)?\b/i },
  { label: "education", pattern: /\beducation\b/i },
  { label: "university", pattern: /\buniversity|college|school|admissions|financial aid\b/i },
  { label: "solar", pattern: /\bsolar\b/i },
  { label: "hvac", pattern: /\bhvac\b/i },
  { label: "roofing", pattern: /\broofing\b/i },
  { label: "insurance", pattern: /\binsurance\b/i },
  { label: "real estate", pattern: /\breal estate\b/i },
  { label: "plumbing", pattern: /\bplumbing\b/i },
  { label: "dental", pattern: /\bdental\b/i },
  { label: "medical", pattern: /\bmedical|healthcare|hospital\b/i },
  { label: "legal", pattern: /\blegal|law firm|attorney\b/i },
  { label: "government", pattern: /\bgovernment|public sector|defense\b/i },
  { label: "hospitality", pattern: /\bhospitality|hotel|restaurant\b/i },
  { label: "pricing", pattern: /\bpricing|cost|price\b/i },
  { label: "crm integration", pattern: /\bcrm|hubspot|salesforce|integration\b/i },
];

// ── Acknowledgment/confirmation words ────────────────────────────────────────

const CONFIRMATIONS = new Set([
  "yes", "yeah", "yep", "yup", "ok", "okay", "got it",
  "right", "correct", "true", "sure", "alright", "understood",
]);

// ── Stop words for Jaccard similarity ────────────────────────────────────────

const STOP_WORDS = new Set([
  "a", "an", "the", "i", "you", "my", "your", "is", "are", "was",
  "were", "be", "to", "of", "and", "or", "in", "for", "with",
  "that", "this", "it", "can", "will", "would", "could", "how",
  "what", "when", "who", "why", "do", "did", "does", "at", "on",
  "they", "them", "their", "we", "us", "our",
]);

// ── Public helpers ────────────────────────────────────────────────────────────

/**
 * Normalize broken/fragmented speech into a canonical question string.
 * Handles partial utterances, filler words, and common transcription artifacts.
 */
export function canonicalizeUtterance(text: string, _state: ConversationState): string {
  let c = text.toLowerCase().trim();

  // Repair common broken-speech patterns from the transcript
  c = c
    .replace(/\bmuch revenues?\b/g, "how much revenue")
    .replace(/\bhow much how\b/g, "how much")
    .replace(/\bcan it\b/g, "can solar companies")
    .replace(/\bwhen they (?:use|switch to|speak to)\b/g, "when solar companies use")
    .replace(/\bthey speak to\b/g, "they use")
    .replace(/^i said /g, "")
    .replace(/\byou know\b/g, "")
    .replace(/\blike[,]? \b/g, "")
    .replace(/\bum+\b|\buh+\b|\bmm+\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return c;
}

/**
 * Returns true if the user's text contains frustration signals that warrant REPAIR mode.
 */
export function detectFrustration(text: string): boolean {
  const t = text.toLowerCase();
  return FRUSTRATION_TRIGGERS.some((trigger) => t.includes(trigger));
}

function detectExplicitTopicPivot(
  canonical: string,
  state: ConversationState
): boolean {
  const current = `${state.active_topic ?? ""} ${state.canonical_user_question ?? ""}`.toLowerCase();
  const matches = EXPLICIT_TOPIC_PIVOT_PATTERNS.filter(({ pattern }) =>
    pattern.test(canonical)
  );
  if (matches.length === 0) return false;
  if (!current.trim()) return true;
  return matches.some(({ label }) => !current.includes(label));
}

/**
 * Jaccard similarity between two strings after stop-word removal.
 * Returns 0–1 where 1 = identical content words.
 */
export function jaccardSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;

  const tokenize = (s: string): Set<string> =>
    new Set(s.split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w)));

  const aWords = tokenize(a);
  const bWords = tokenize(b);

  // Fall back to raw Jaccard for very short inputs
  if (aWords.size === 0 || bWords.size === 0) {
    const aRaw = new Set(a.split(/\s+/));
    const bRaw = new Set(b.split(/\s+/));
    const rawIntersect = Array.from(aRaw).filter((w) => bRaw.has(w)).length;
    const rawUnion = new Set([...Array.from(aRaw), ...Array.from(bRaw)]).size;
    return rawUnion > 0 ? rawIntersect / rawUnion : 0;
  }

  const intersection = Array.from(aWords).filter((w) => bWords.has(w)).length;
  const union = new Set([...Array.from(aWords), ...Array.from(bWords)]).size;
  return union > 0 ? intersection / union : 0;
}

// ── Core decision function ────────────────────────────────────────────────────

/**
 * Decide whether to STAY on the current topic, PIVOT to a new one,
 * REPAIR after frustration, or CLOSE after confirmation.
 *
 * Run this BEFORE building the LLM prompt so the decision can shape the
 * strict controller block.
 *
 * @param userText    Raw transcript from Deepgram
 * @param state       Current conversation state
 * @param isFirstTurn True if the caller has not yet asked a real question
 */
export function decideStayOrPivot(
  userText: string,
  state: ConversationState,
  isFirstTurn: boolean
): StayPivotDecision {
  // 0. First turn — always establish the topic first
  if (isFirstTurn || !state.hard_no_reset) {
    return "STAY";
  }

  const canonical = canonicalizeUtterance(userText, state);

  // 1. Frustration — check BEFORE similarity (highest priority path)
  if (detectFrustration(userText)) {
    // Any frustration signal when we have an active topic → REPAIR
    if (state.active_topic || state.frustration_score + 2 >= 4) {
      return "REPAIR";
    }
  }

  // 1b. Explicit domain/topic pivot beats the short-fragment STAY bias.
  // This is what lets quick shifts like "military?" or "higher education?"
  // actually pivot instead of getting trapped under the prior topic.
  if (detectExplicitTopicPivot(canonical, state)) {
    return "PIVOT";
  }

  // 2. Acknowledgment / very short confirmation
  const cleanCanonical = canonical.trim();
  const wordCount = cleanCanonical.split(/\s+/).length;

  if (wordCount <= 2) {
    if (CONFIRMATIONS.has(cleanCanonical)) {
      // Confirmed → mark answered
      return "CLOSE";
    }
    // Other short fragment with active topic → keep STAY
    if (state.active_topic) {
      return "STAY";
    }
  }

  // 3. Same question asked again? → STAY
  if (state.canonical_user_question) {
    const sim = jaccardSimilarity(canonical, state.canonical_user_question);
    // Threshold 0.35 because stop-word removal already filters noise;
    // content-word overlap of 35%+ strongly indicates same question
    if (sim >= 0.35) {
      return "STAY";
    }
  }

  // 4. Fragment or clarification signal → STAY on active topic
  const isFragment = wordCount < 5;
  const isClarification =
    cleanCanonical.startsWith("when") ||
    cleanCanonical.startsWith("but") ||
    cleanCanonical.startsWith("what about") ||
    cleanCanonical.includes("i said") ||
    cleanCanonical.includes("no i mean") ||
    // Revenue-related fragments — these almost always continue the same question
    cleanCanonical.includes("much") ||
    cleanCanonical.includes("money") ||
    cleanCanonical.includes("revenue") ||
    cleanCanonical.includes("earn") ||
    cleanCanonical.includes("make");

  if ((isFragment || isClarification) && state.active_topic) {
    return "STAY";
  }

  // 5. Explicit new-topic signal AND current topic is answered
  const hasNewTopic = NEW_TOPIC_KEYWORDS.some((k) => canonical.includes(k));
  const isExplicitPivot =
    hasNewTopic &&
    !cleanCanonical.includes("when") &&
    !cleanCanonical.includes("how much") &&
    !cleanCanonical.includes("revenue");

  if (isExplicitPivot && state.topic_status === "answered") {
    return "PIVOT";
  }

  // 6. Topic still open → default STAY (bias toward continuity)
  if (state.active_topic && state.topic_status !== "answered") {
    return "STAY";
  }

  // 7. No active topic, or topic is answered and new content detected → PIVOT
  return "PIVOT";
}
