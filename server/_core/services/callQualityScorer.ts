/**
 * callQualityScorer.ts — Call quality analysis and scoring.
 *
 * Analyzes transcripts for:
 *   - Sentiment (positive / neutral / negative) via keyword matching
 *   - Emotion cues (frustration, confusion, excitement)
 *   - Conversion likelihood (0–100 score)
 *   - Escalation risk (0–100 score) + specific flags
 *
 * Designed to run asynchronously after a call ends — never on the hot path.
 */

export type Sentiment = "positive" | "neutral" | "negative";

export type Emotion =
  | "neutral"
  | "frustrated"
  | "confused"
  | "excited"
  | "angry"
  | "satisfied";

export interface QualityFlags {
  repeatedDontKnow: boolean;
  customerAnger: boolean;
  complexRequest: boolean;
  policyQuestion: boolean;
  optOutSignal: boolean;
  bookingSignal: boolean;
  objectionRaised: boolean;
}

export interface CallQualityScore {
  sentiment: Sentiment;
  emotion: Emotion;
  /** 0–100: likelihood the call converts to a booking/sale */
  conversionScore: number;
  /** 0–100: likelihood the call needs human escalation */
  escalationRisk: number;
  flags: QualityFlags;
  /** Raw keyword counts for debugging */
  debug: {
    positiveHits: number;
    negativeHits: number;
    frustrationHits: number;
    confusionHits: number;
    excitementHits: number;
    angerHits: number;
  };
}

export interface ScoreCallInput {
  transcript: string;
  /** Optional: call duration in seconds */
  durationSeconds?: number;
  /** Optional: number of turns in the conversation */
  turnCount?: number;
  /** Optional: whether a booking was detected by the pipeline */
  bookingDetected?: boolean;
  /** Optional: outcome from voiceSessionManager */
  outcome?: string;
}

// ── Keyword dictionaries ──────────────────────────────────────────────────────

const POSITIVE_KEYWORDS = new Set([
  "yes", "yeah", "yep", "sure", "absolutely", "definitely", "great", "perfect",
  "excellent", "wonderful", "love", "interested", "schedule", "book", "booking",
  "appointment", "sounds good", "let's do it", "sign me up", "when can",
  "how soon", "available", "works for me", "that works", "appreciate",
  "thank you", "thanks", "helpful", "exactly", "right", "correct",
]);

const NEGATIVE_KEYWORDS = new Set([
  "no", "nope", "never", "not interested", "stop", "cancel", "unsubscribe",
  "remove", "don't call", "do not call", "waste", "terrible", "awful",
  "horrible", "bad", "worst", "scam", "fraud", "lawsuit", "attorney",
  "lawyer", "complaint", "report", "ftc", "dnc",
]);

const FRUSTRATION_KEYWORDS = new Set([
  "frustrated", "frustrating", "annoying", "annoyed", "ridiculous",
  "unacceptable", "this is crazy", "i've been waiting", "keep calling",
  "stop calling", "already told", "told you", "said that", "repeat",
  "again and again", "how many times",
]);

const CONFUSION_KEYWORDS = new Set([
  "confused", "confusing", "don't understand", "what do you mean",
  "i'm not sure", "not sure what", "unclear", "what is this",
  "who are you", "what company", "how did you get", "where did you",
  "i don't know", "no idea", "lost me", "say that again",
]);

const EXCITEMENT_KEYWORDS = new Set([
  "excited", "exciting", "amazing", "awesome", "fantastic", "incredible",
  "can't wait", "looking forward", "perfect timing", "exactly what",
  "been looking for", "need this", "want this", "sign me up",
]);

const ANGER_KEYWORDS = new Set([
  "angry", "furious", "outraged", "livid", "pissed", "hate", "disgusting",
  "unbelievable", "how dare", "this is bull", "ridiculous", "absurd",
  "threatening", "sue", "legal action",
]);

const ESCALATION_TRIGGERS = new Set([
  "speak to a manager", "speak to someone", "real person", "human",
  "supervisor", "manager", "escalate", "complaint", "legal", "attorney",
  "lawyer", "sue", "lawsuit", "ftc", "bbb", "better business",
  "report you", "report this",
]);

const POLICY_KEYWORDS = new Set([
  "policy", "terms", "conditions", "contract", "agreement", "guarantee",
  "warranty", "refund", "cancellation", "cancel anytime", "binding",
  "commitment", "locked in", "fine print",
]);

const COMPLEX_REQUEST_KEYWORDS = new Set([
  "custom", "special", "unique", "specific", "complicated", "complex",
  "multiple locations", "enterprise", "large scale", "bulk", "wholesale",
  "integration", "api", "technical", "developer",
]);

const BOOKING_SIGNALS = new Set([
  "book", "booking", "schedule", "appointment", "set up a time",
  "when can we", "available", "calendar", "confirm", "confirmed",
  "let's meet", "set a meeting", "consultation",
]);

const OBJECTION_KEYWORDS = new Set([
  "too expensive", "can't afford", "not in budget", "budget", "cost",
  "price", "cheaper", "competitor", "already have", "not right now",
  "maybe later", "think about it", "need to talk", "spouse", "partner",
  "boss", "not sure", "hesitant",
]);

// ── Scorer ────────────────────────────────────────────────────────────────────

/**
 * Score a completed call transcript.
 * Pure function — no I/O, safe to call synchronously.
 */
export function scoreCall(input: ScoreCallInput): CallQualityScore {
  const { transcript, durationSeconds = 0, turnCount = 0, bookingDetected = false, outcome } = input;

  if (!transcript?.trim()) {
    return _emptyScore();
  }

  const lower = transcript.toLowerCase();
  const words = _tokenize(lower);

  // ── Count keyword hits ──────────────────────────────────────────────────
  let positiveHits = 0;
  let negativeHits = 0;
  let frustrationHits = 0;
  let confusionHits = 0;
  let excitementHits = 0;
  let angerHits = 0;

  for (const w of words) {
    if (POSITIVE_KEYWORDS.has(w)) positiveHits++;
    if (NEGATIVE_KEYWORDS.has(w)) negativeHits++;
    if (FRUSTRATION_KEYWORDS.has(w)) frustrationHits++;
    if (CONFUSION_KEYWORDS.has(w)) confusionHits++;
    if (EXCITEMENT_KEYWORDS.has(w)) excitementHits++;
    if (ANGER_KEYWORDS.has(w)) angerHits++;
  }

  // Multi-word phrase matching
  if (lower.includes("not interested")) negativeHits += 2;
  if (lower.includes("don't call")) negativeHits += 2;
  if (lower.includes("do not call")) negativeHits += 2;
  if (lower.includes("sounds good")) positiveHits += 2;
  if (lower.includes("let's do it")) positiveHits += 3;
  if (lower.includes("sign me up")) positiveHits += 3;
  if (lower.includes("i don't know")) confusionHits++;
  if (lower.includes("speak to a manager")) frustrationHits += 2;
  if (lower.includes("real person")) frustrationHits++;

  // ── Sentiment ──────────────────────────────────────────────────────────
  let sentiment: Sentiment = "neutral";
  if (positiveHits > negativeHits && positiveHits > 0) sentiment = "positive";
  else if (negativeHits > positiveHits && negativeHits > 0) sentiment = "negative";

  // ── Emotion ────────────────────────────────────────────────────────────
  let emotion: Emotion = "neutral";
  const emotionScores: [Emotion, number][] = [
    ["angry", angerHits * 3],
    ["frustrated", frustrationHits * 2],
    ["confused", confusionHits * 2],
    ["excited", excitementHits * 2],
    ["satisfied", positiveHits],
  ];
  emotionScores.sort((a, b) => b[1] - a[1]);
  const topEmotion = emotionScores[0];
  if (topEmotion && topEmotion[1] > 0) emotion = topEmotion[0];

  // ── Flags ──────────────────────────────────────────────────────────────
  const repeatedDontKnow = (lower.match(/i don'?t know/g) ?? []).length >= 2;
  const customerAnger = angerHits >= 2 || lower.includes("legal action") || lower.includes("sue you");
  const complexRequest = _hasAnyKeyword(lower, COMPLEX_REQUEST_KEYWORDS);
  const policyQuestion = _hasAnyKeyword(lower, POLICY_KEYWORDS);
  const optOutSignal = lower.includes("not interested") || lower.includes("don't call") || lower.includes("do not call") || lower.includes("remove me");
  const bookingSignal = bookingDetected || _hasAnyKeyword(lower, BOOKING_SIGNALS);
  const objectionRaised = _hasAnyKeyword(lower, OBJECTION_KEYWORDS);

  const flags: QualityFlags = {
    repeatedDontKnow,
    customerAnger,
    complexRequest,
    policyQuestion,
    optOutSignal,
    bookingSignal,
    objectionRaised,
  };

  // ── Conversion score (0–100) ───────────────────────────────────────────
  let conversionScore = 30; // baseline

  // Positive signals
  if (bookingSignal) conversionScore += 35;
  if (sentiment === "positive") conversionScore += 15;
  if (emotion === "excited" || emotion === "satisfied") conversionScore += 10;
  if (positiveHits >= 3) conversionScore += 10;
  if (durationSeconds >= 120) conversionScore += 5; // engaged caller
  if (turnCount >= 6) conversionScore += 5; // multi-turn engagement
  if (outcome === "scheduled" || outcome === "converted") conversionScore += 20;

  // Negative signals
  if (optOutSignal) conversionScore -= 40;
  if (sentiment === "negative") conversionScore -= 20;
  if (customerAnger) conversionScore -= 25;
  if (negativeHits >= 3) conversionScore -= 15;
  if (outcome === "not_interested" || outcome === "no_answer") conversionScore -= 20;

  conversionScore = Math.max(0, Math.min(100, conversionScore));

  // ── Escalation risk (0–100) ────────────────────────────────────────────
  let escalationRisk = 0;

  if (customerAnger) escalationRisk += 40;
  if (repeatedDontKnow) escalationRisk += 20;
  if (complexRequest) escalationRisk += 15;
  if (policyQuestion) escalationRisk += 15;
  if (_hasAnyKeyword(lower, ESCALATION_TRIGGERS)) escalationRisk += 30;
  if (emotion === "frustrated") escalationRisk += 20;
  if (emotion === "angry") escalationRisk += 35;
  if (frustrationHits >= 2) escalationRisk += 15;

  escalationRisk = Math.max(0, Math.min(100, escalationRisk));

  return {
    sentiment,
    emotion,
    conversionScore,
    escalationRisk,
    flags,
    debug: {
      positiveHits,
      negativeHits,
      frustrationHits,
      confusionHits,
      excitementHits,
      angerHits,
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _tokenize(text: string): string[] {
  return text
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function _hasAnyKeyword(lower: string, keywords: Set<string>): boolean {
  for (const kw of keywords) {
    if (lower.includes(kw)) return true;
  }
  return false;
}

function _emptyScore(): CallQualityScore {
  return {
    sentiment: "neutral",
    emotion: "neutral",
    conversionScore: 0,
    escalationRisk: 0,
    flags: {
      repeatedDontKnow: false,
      customerAnger: false,
      complexRequest: false,
      policyQuestion: false,
      optOutSignal: false,
      bookingSignal: false,
      objectionRaised: false,
    },
    debug: {
      positiveHits: 0,
      negativeHits: 0,
      frustrationHits: 0,
      confusionHits: 0,
      excitementHits: 0,
      angerHits: 0,
    },
  };
}
