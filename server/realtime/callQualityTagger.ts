/**
 * Post-call QA Failure Mode Tagger
 *
 * Scans a completed call transcript for guardrail violations and conversation
 * quality issues. Called from finalizeHard() after every call.
 * Results stored in the call recording for analytics and coaching.
 */

export type FailureSeverity =
  | "trust_killing"
  | "conversion_killing"
  | "compliance_risk"
  | "polish_level";

export interface FailureMode {
  code: string;
  severity: FailureSeverity;
  description: string;
  turnIndex?: number;
  snippet?: string;
}

export interface Turn {
  role: "user" | "assistant" | string;
  content: string;
}

export interface VoiceQaMetrics {
  assistantTurns: number;
  userTurns: number;
  averageAssistantSentences: number;
  maxAssistantSentences: number;
  stackedQuestionTurns: number;
  harshTurns: number;
  fillerHits: number;
  exclamationCount: number;
}

export interface VoiceQaScorecard {
  score: number;
  grade: "elite" | "strong" | "conditional" | "weak";
  summary: string;
  healthy: boolean;
  failures: FailureMode[];
  metrics: VoiceQaMetrics;
  recommendations: string[];
}

const HALL_REF_PATTERNS = [
  /you mentioned (it|that|this|earlier|before)/i,
  /you said (earlier|before|previously)/i,
  /as you (mentioned|said|told me)/i,
  /from what you (said|mentioned)/i,
  /earlier you (said|mentioned)/i,
];

const NEG_SELF_PATTERNS = [
  /you'?re? right[,.]?\s*i'?m? not (positive|good|well|happy|fine|okay|ok|great)/i,
  /i'?m? not (positive|doing well|okay|good|happy|fine)/i,
  /i (agree|guess)[,.]?\s*i'?m? not/i,
  /i'?m? (sad|tired|broken|depressed|negative|down)/i,
];

const PITCH_PATTERNS = [
  /you get more booked appointments/i,
  /without adding staff/i,
  /handles every (inbound|call|lead)/i,
  /24\/7 (coverage|availability|ai)/i,
  /never miss (a|another) (call|lead)/i,
  /speed to lead/i,
  /qualify (every|your) lead/i,
  /increase (your )?(revenue|conversion|bookings)/i,
];

const SMALL_TALK_PATTERNS = [
  /how are you/i,
  /how'?s? (it going|your day)/i,
  /are you (okay|good|sad|tired)/i,
  /you'?re? not (positive|good)/i,
  /you don'?t have|what does that mean|so what does/i,
];

const FILLER_PATTERN =
  /\b(absolutely|fantastic|amazing|wonderful|excellent|great question|sure thing|of course)\b/gi;

const HARSH_PHRASES = [
  /what do you want/i,
  /let'?s keep things professional/i,
  /i'?m all business/i,
  /we'?ve been chatting for a bit/i,
  /i'?m here for quick answers/i,
  /you need to calm down/i,
  /watch your language/i,
];

const FACT_PATTERNS = [
  { regex: /what industry (are you in|do you work in|is your business)/i, factName: "industry" },
  { regex: /what'?s? (your|the) company (name|called)/i, factName: "company" },
  { regex: /how many calls (do you|does your business) (get|handle|receive)/i, factName: "call_volume" },
  { regex: /what'?s? your (name|full name)/i, factName: "name" },
] as const;

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function countSentences(text: string): number {
  return (text.match(/[.!?]+/g) || []).length;
}

function countQuestions(text: string): number {
  const explicit = (text.match(/\?/g) || []).length;
  if (explicit > 0) return explicit;
  const clauses = text
    .split(/[.!]/)
    .map((part) => part.trim())
    .filter(Boolean);
  return clauses.filter((part) =>
    /^(what|when|where|why|how|who|would|could|should|can|do|does|did|are|is|will|ready|want)\b/i.test(part)
  ).length;
}

function severityPenalty(severity: FailureSeverity): number {
  switch (severity) {
    case "trust_killing":
      return 18;
    case "compliance_risk":
      return 16;
    case "conversion_killing":
      return 10;
    case "polish_level":
      return 6;
  }
}

function uniqueRecommendations(items: string[]): string[] {
  return Array.from(new Set(items)).slice(0, 6);
}

export function parseTranscriptToTurns(transcript: string): Turn[] {
  return transcript
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(Caller|User|Customer|AI|Assistant|Agent)\s*:\s*(.+)$/i);
      if (!match) return null;
      const speaker = match[1]!.toLowerCase();
      const content = match[2]!.trim();
      const role = speaker === "ai" || speaker === "assistant" || speaker === "agent" ? "assistant" : "user";
      return { role, content };
    })
    .filter((turn): turn is Turn => Boolean(turn));
}

/**
 * Tag all failure modes in a completed call transcript.
 * Returns list of detected violations sorted by severity.
 */
export function tagCallFailureModes(transcript: Turn[]): FailureMode[] {
  const failures: FailureMode[] = [];
  const assistantTurns = transcript.filter((t) => t.role === "assistant");
  const userTurns = transcript.filter((t) => t.role === "user");

  // 1. Hallucinated references
  assistantTurns.forEach((t, i) => {
    for (const pat of HALL_REF_PATTERNS) {
      if (pat.test(t.content)) {
        const turnIndex = transcript.findIndex((tt) => tt === t);
        const priorUserContent = transcript
          .slice(0, turnIndex)
          .filter((tt) => tt.role === "user")
          .map((tt) => tt.content.toLowerCase())
          .join(" ");
        const extractedRef = t.content.match(pat)?.[0] ?? "";
        if (!extractedRef || priorUserContent.length < 20) {
          failures.push({
            code: "hallucinated_reference",
            severity: "trust_killing",
            description: "Agent claimed caller said something not found in prior conversation",
            turnIndex: i,
            snippet: t.content.slice(0, 100),
          });
          break;
        }
      }
    }
  });

  // 2. Negative self-agreement
  assistantTurns.forEach((t, i) => {
    for (const pat of NEG_SELF_PATTERNS) {
      if (pat.test(t.content)) {
        failures.push({
          code: "negative_self_agreement",
          severity: "trust_killing",
          description: "Agent agreed with a negative emotional label about itself",
          turnIndex: i,
          snippet: t.content.slice(0, 100),
        });
        break;
      }
    }
  });

  // 3. Misplaced pitch
  let lastUserContent = "";
  transcript.forEach((t, tIdx) => {
    if (t.role === "user") {
      lastUserContent = t.content;
      return;
    }
    const hasPitch = PITCH_PATTERNS.some((p) => p.test(t.content));
    const priorIsSmallTalk = SMALL_TALK_PATTERNS.some((p) => p.test(lastUserContent));
    if (hasPitch && priorIsSmallTalk) {
      failures.push({
        code: "misplaced_pitch",
        severity: "trust_killing",
        description: "Agent fired a sales pitch in response to small talk or off-topic input",
        turnIndex: tIdx,
        snippet: t.content.slice(0, 100),
      });
    }
  });

  // 4. Response loop detection
  const recentNormalized: string[] = [];
  let consecutiveDupes = 0;
  assistantTurns.forEach((t, i) => {
    const norm = normalizeText(t.content);
    if (recentNormalized.slice(-3).includes(norm)) {
      consecutiveDupes++;
      if (consecutiveDupes >= 2) {
        failures.push({
          code: "response_loop",
          severity: "conversion_killing",
          description: "Agent repeated the same response 3+ times (stuck in a loop)",
          turnIndex: i,
          snippet: t.content.slice(0, 80),
        });
        consecutiveDupes = 0;
      }
    } else {
      consecutiveDupes = 0;
    }
    recentNormalized.push(norm);
    if (recentNormalized.length > 5) recentNormalized.shift();
  });

  // 5. Re-asked known fact
  const knownFacts = new Set<string>();
  transcript.forEach((t, i) => {
    if (t.role === "user") {
      if (/\b(solar|hvac|roofing|insurance|real estate|plumbing|dental|medical|legal|construction)\b/i.test(t.content)) {
        knownFacts.add("industry");
      }
      if (/my (company|business|firm) (is|called|named)/i.test(t.content)) knownFacts.add("company");
      if (/my name is|i'?m? [A-Z][a-z]+/i.test(t.content)) knownFacts.add("name");
      if (/\d+ calls? (a|per) (day|week|month)/i.test(t.content)) knownFacts.add("call_volume");
      return;
    }

    for (const fp of FACT_PATTERNS) {
      if (fp.regex.test(t.content) && knownFacts.has(fp.factName)) {
        failures.push({
          code: "re_asked_known_fact",
          severity: "conversion_killing",
          description: `Agent asked for ${fp.factName} that caller already provided`,
          turnIndex: i,
          snippet: t.content.slice(0, 80),
        });
      }
    }
  });

  // 6. Identity concealment
  userTurns.forEach((t, i) => {
    if (/\b(are you (a )?(robot|ai|bot|machine|computer|human)|is this (a )?(robot|ai|bot))\b/i.test(t.content)) {
      const turnIdx = transcript.findIndex((tt) => tt === t);
      const nextAssistantTurn = transcript.slice(turnIdx + 1).find((tt) => tt.role === "assistant");
      if (
        nextAssistantTurn &&
        !/\b(yes|i am|i'?m? an ai|i'?m? alex|ai assistant|virtual assistant)\b/i.test(nextAssistantTurn.content)
      ) {
        failures.push({
          code: "identity_concealment",
          severity: "compliance_risk",
          description: "Agent may not have clearly disclosed AI nature when directly asked",
          turnIndex: i,
          snippet: nextAssistantTurn.content.slice(0, 80),
        });
      }
    }
  });

  // 7. Robotic disclosure
  assistantTurns.forEach((t, i) => {
    if (/as an ai (language )?model|my training|i'?m? programmed to|i don'?t have feelings/i.test(t.content)) {
      failures.push({
        code: "robotic_disclosure",
        severity: "compliance_risk",
        description: "Agent used robotic/model-speak that breaks the human-like persona",
        turnIndex: i,
        snippet: t.content.slice(0, 80),
      });
    }
  });

  // 8. Verbosity
  let verboseCount = 0;
  assistantTurns.forEach((t, i) => {
    if (countSentences(t.content) > 4) {
      verboseCount++;
      if (verboseCount === 3) {
        failures.push({
          code: "verbosity",
          severity: "polish_level",
          description: "Agent consistently responded with 4+ sentences (too long for voice)",
          turnIndex: i,
          snippet: `${countSentences(t.content)} sentences in turn ${i}`,
        });
      }
    }
  });

  // 9. Filler overuse
  let fillerCount = 0;
  assistantTurns.forEach((t) => {
    const matches = t.content.match(FILLER_PATTERN);
    if (matches) fillerCount += matches.length;
  });
  if (fillerCount >= 3) {
    failures.push({
      code: "filler_overuse",
      severity: "polish_level",
      description: `Agent used filler words (absolutely, fantastic, etc.) ${fillerCount} times`,
      snippet: `${fillerCount} occurrences across call`,
    });
  }

  // 10. Harsh / corrective tone
  assistantTurns.forEach((t, i) => {
    if (HARSH_PHRASES.some((pat) => pat.test(t.content))) {
      failures.push({
        code: "harsh_tone",
        severity: "polish_level",
        description: "Agent used phrasing that sounds corrective, sharp, or less professional than a top operator",
        turnIndex: i,
        snippet: t.content.slice(0, 100),
      });
    }
  });

  // 11. Stacked questions
  assistantTurns.forEach((t, i) => {
    if (countQuestions(t.content) >= 2) {
      failures.push({
        code: "stacked_questions",
        severity: "polish_level",
        description: "Agent asked multiple questions in one turn instead of moving one step at a time",
        turnIndex: i,
        snippet: t.content.slice(0, 100),
      });
    }
  });

  const severityOrder: Record<FailureSeverity, number> = {
    trust_killing: 0,
    conversion_killing: 1,
    compliance_risk: 2,
    polish_level: 3,
  };
  failures.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return failures;
}

export function computeVoiceQaMetrics(transcript: Turn[]): VoiceQaMetrics {
  const assistantTurns = transcript.filter((t) => t.role === "assistant");
  const userTurns = transcript.filter((t) => t.role === "user");
  const sentenceCounts = assistantTurns.map((t) => countSentences(t.content));
  const questionTurns = assistantTurns.filter((t) => countQuestions(t.content) >= 2).length;
  const harshTurns = assistantTurns.filter((t) => HARSH_PHRASES.some((pat) => pat.test(t.content))).length;
  const fillerHits = assistantTurns.reduce((sum, t) => sum + (t.content.match(FILLER_PATTERN)?.length ?? 0), 0);
  const exclamationCount = assistantTurns.reduce((sum, t) => sum + (t.content.match(/!/g) || []).length, 0);

  return {
    assistantTurns: assistantTurns.length,
    userTurns: userTurns.length,
    averageAssistantSentences:
      sentenceCounts.length > 0
        ? Number((sentenceCounts.reduce((sum, count) => sum + count, 0) / sentenceCounts.length).toFixed(2))
        : 0,
    maxAssistantSentences: sentenceCounts.length > 0 ? Math.max(...sentenceCounts) : 0,
    stackedQuestionTurns: questionTurns,
    harshTurns,
    fillerHits,
    exclamationCount,
  };
}

export function buildVoiceQaScorecard(transcript: Turn[]): VoiceQaScorecard {
  const failures = tagCallFailureModes(transcript);
  const healthy = isCallHealthy(failures);
  const metrics = computeVoiceQaMetrics(transcript);

  let score = 100;
  failures.forEach((failure) => {
    score -= severityPenalty(failure.severity);
  });
  if (metrics.averageAssistantSentences > 3) score -= 6;
  if (metrics.maxAssistantSentences > 4) score -= 4;
  if (metrics.stackedQuestionTurns > 0) score -= metrics.stackedQuestionTurns * 3;
  if (metrics.harshTurns > 0) score -= metrics.harshTurns * 5;
  if (metrics.fillerHits >= 3) score -= 4;
  if (metrics.exclamationCount >= 4) score -= 2;
  score = Math.max(0, Math.min(100, score));

  const grade: VoiceQaScorecard["grade"] =
    score >= 95 ? "elite" : score >= 88 ? "strong" : score >= 75 ? "conditional" : "weak";

  const recommendations: string[] = [];
  const failureCodes = new Set(failures.map((f) => f.code));
  if (failureCodes.has("negative_self_agreement") || failureCodes.has("harsh_tone")) {
    recommendations.push("Tighten the personality rails so the agent never sounds defensive, sharp, or corrected by the caller.");
  }
  if (failureCodes.has("misplaced_pitch")) {
    recommendations.push("Delay value props until a real business problem or explicit product question is on the table.");
  }
  if (failureCodes.has("hallucinated_reference") || failureCodes.has("re_asked_known_fact")) {
    recommendations.push("Strengthen short-term memory so the agent does not invent prior context or re-ask captured facts.");
  }
  if (failureCodes.has("robotic_disclosure") || failureCodes.has("identity_concealment")) {
    recommendations.push("Keep AI disclosure clean and short: clear when asked, never robotic, never evasive.");
  }
  if (failureCodes.has("stacked_questions") || metrics.stackedQuestionTurns > 0) {
    recommendations.push("Keep the voice rhythm to one clear question per turn so callers never feel interrogated.");
  }
  if (failureCodes.has("verbosity") || metrics.averageAssistantSentences > 3 || metrics.maxAssistantSentences > 4) {
    recommendations.push("Shorten spoken turns so each answer lands in a few crisp sentences before the next move.");
  }
  if (failureCodes.has("filler_overuse") || metrics.fillerHits >= 3 || metrics.exclamationCount >= 4) {
    recommendations.push("Reduce filler and over-bright phrasing so the tone stays polished instead of salesy.");
  }
  if (!healthy) {
    recommendations.unshift("Fix trust and compliance failures first before tuning polish or conversion behavior.");
  }

  const summary =
    grade === "elite"
      ? "Elite voice call quality: strong professional tone, healthy guardrails, and no material coaching flags."
      : grade === "strong"
        ? "Strong voice call quality with a few fixable polish gaps before true top-tier performance."
        : grade === "conditional"
          ? "Usable but not elite: the call has noticeable issues in tone, pacing, or flow that should be corrected before scale."
          : "Below production bar: the call has major issues that will damage trust or conversion.";

  return {
    score,
    grade,
    summary,
    healthy,
    failures,
    metrics,
    recommendations: uniqueRecommendations(recommendations),
  };
}

/**
 * Format failure modes as a compact string for logging/storage.
 */
export function formatFailureModes(failures: FailureMode[]): string {
  if (failures.length === 0) return "PASS";
  return failures.map((f) => `[${f.severity.toUpperCase()}] ${f.code}`).join(", ");
}

/**
 * Quick pass/fail signal for automated monitoring.
 * Returns true if any trust-killing or compliance-risk failures were found.
 */
export function isCallHealthy(failures: FailureMode[]): boolean {
  return !failures.some((f) => f.severity === "trust_killing" || f.severity === "compliance_risk");
}
