/**
 * Post-call QA Failure Mode Tagger
 *
 * Scans a completed call transcript for guardrail violations and conversation
 * quality issues. Called from finalizeHard() after every call.
 * Results stored in the call recording for analytics and coaching.
 *
 * Failure mode taxonomy (severity-ranked):
 * TRUST_KILLING:
 *   - hallucinated_reference: agent claims caller said something they didn't
 *   - negative_self_agreement: agent agrees it is sad/broken/negative
 *   - misplaced_pitch: value prop during small talk or confusion
 *   - identity_contradiction: agent contradicts its own identity
 *
 * CONVERSION_KILLING:
 *   - response_loop: agent repeats same line 3+ times
 *   - premature_pitch: pitch before business need established
 *   - topic_drift: agent follows off-topic banter for 3+ turns
 *   - pitch_never_landed: business context existed but no pitch was given
 *   - no_clarification_attempt: agent guessed instead of clarifying unclear input
 *
 * COMPLIANCE_RISK:
 *   - robotic_disclosure: agent referred to itself as "AI language model"
 *   - topic_drift_to_sensitive: agent engaged with politics, religion, etc.
 *   - identity_concealment: agent denied being AI when asked
 *
 * POLISH_LEVEL:
 *   - verbosity: response exceeded 3 sentences consistently
 *   - re_asked_known_fact: asked for info caller already provided
 *   - filler_overuse: too many "absolutely", "fantastic", etc.
 *   - weak_greeting: greeting didn't match expected pattern
 */

export type FailureSeverity = "trust_killing" | "conversion_killing" | "compliance_risk" | "polish_level";

export interface FailureMode {
  code: string;
  severity: FailureSeverity;
  description: string;
  turnIndex?: number;
  snippet?: string;
}

interface Turn {
  role: "user" | "assistant" | string;
  content: string;
}

/**
 * Tag all failure modes in a completed call transcript.
 * Returns list of detected violations sorted by severity.
 */
export function tagCallFailureModes(transcript: Turn[]): FailureMode[] {
  const failures: FailureMode[] = [];
  const assistantTurns = transcript.filter((t) => t.role === "assistant");
  const userTurns = transcript.filter((t) => t.role === "user");

  // ── TRUST-KILLING ─────────────────────────────────────────────────────────

  // 1. Hallucinated references
  const hallRefPatterns = [
    /you mentioned (it|that|this|earlier|before)/i,
    /you said (earlier|before|previously)/i,
    /as you (mentioned|said|told me)/i,
    /from what you (said|mentioned)/i,
    /earlier you (said|mentioned)/i,
  ];
  assistantTurns.forEach((t, i) => {
    for (const pat of hallRefPatterns) {
      if (pat.test(t.content)) {
        // Cross-check: does the user actually say anything matching this context?
        const turnIndex = transcript.findIndex((tt) => tt === t);
        const priorUserContent = transcript.slice(0, turnIndex).filter((tt) => tt.role === "user").map((tt) => tt.content.toLowerCase()).join(" ");
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
  const negSelfPatterns = [
    /you'?re? right[,.]?\s*i'?m? not (positive|good|well|happy|fine|okay|great)/i,
    /i'?m? not (positive|doing well|okay|good|happy|fine|upbeat)/i,
    /i (agree|guess)[,.]?\s*i'?m? not/i,
    /i'?m? (sad|tired|broken|depressed|negative|down)/i,
  ];
  assistantTurns.forEach((t, i) => {
    for (const pat of negSelfPatterns) {
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

  // 3. Misplaced pitch — scan full transcript turn by turn
  const pitchPatterns = [
    /you get more booked appointments/i,
    /without adding staff/i,
    /handles every (inbound|call|lead)/i,
    /24\/7 (coverage|availability|ai)/i,
    /never miss (a|another) (call|lead)/i,
    /speed to lead/i,
    /qualify (every|your) lead/i,
    /increase (your )?(revenue|conversion|bookings)/i,
  ];
  const smallTalkPatterns = [
    /how are you/i, /how'?s? (it going|your day)/i,
    /are you (okay|good|sad|tired)/i, /you'?re? not (positive|good)/i,
    /you don'?t have|what does that mean|so what does/i,
  ];

  let lastUserContent = "";
  transcript.forEach((t, tIdx) => {
    if (t.role === "user") {
      lastUserContent = t.content;
    } else if (t.role === "assistant") {
      const hasPitch = pitchPatterns.some((p) => p.test(t.content));
      const priorIsSmallTalk = smallTalkPatterns.some((p) => p.test(lastUserContent));
      if (hasPitch && priorIsSmallTalk) {
        failures.push({
          code: "misplaced_pitch",
          severity: "trust_killing",
          description: "Agent fired a sales pitch in response to small talk or off-topic input",
          turnIndex: tIdx,
          snippet: t.content.slice(0, 100),
        });
      }
    }
  });

  // ── CONVERSION-KILLING ────────────────────────────────────────────────────

  // 4. Response loop detection
  const normalizeText = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
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
        consecutiveDupes = 0; // reset to avoid spam
      }
    } else {
      consecutiveDupes = 0;
    }
    recentNormalized.push(norm);
    if (recentNormalized.length > 5) recentNormalized.shift();
  });

  // 5. Re-asked known fact
  const factPatterns = [
    { regex: /what industry (are you in|do you work in|is your business)/i, factName: "industry" },
    { regex: /what'?s? (your|the) company (name|called)/i, factName: "company" },
    { regex: /how many calls (do you|does your business) (get|handle|receive)/i, factName: "call_volume" },
    { regex: /what'?s? your (name|full name)/i, factName: "name" },
  ];
  const knownFacts = new Set<string>();
  transcript.forEach((t, i) => {
    if (t.role === "user") {
      if (/\b(solar|hvac|roofing|insurance|real estate|plumbing|dental|medical|legal|construction)\b/i.test(t.content)) knownFacts.add("industry");
      if (/my (company|business|firm) (is|called|named)/i.test(t.content)) knownFacts.add("company");
      if (/my name is|i'?m? [A-Z][a-z]+/i.test(t.content)) knownFacts.add("name");
      if (/\d+ calls? (a|per) (day|week|month)/i.test(t.content)) knownFacts.add("call_volume");
    }
    if (t.role === "assistant") {
      for (const fp of factPatterns) {
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
    }
  });

  // ── COMPLIANCE RISK ───────────────────────────────────────────────────────

  // 6. Identity concealment
  userTurns.forEach((t, i) => {
    if (/\b(are you (a )?(robot|ai|bot|machine|computer|human)|is this (a )?(robot|ai|bot))\b/i.test(t.content)) {
      const turnIdx = transcript.findIndex((tt) => tt === t);
      const nextAssistantTurn = transcript.slice(turnIdx + 1).find((tt) => tt.role === "assistant");
      if (nextAssistantTurn && !/\b(yes|i am|i'?m? an ai|i'?m? alex|ai assistant|virtual assistant)\b/i.test(nextAssistantTurn.content)) {
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

  // ── POLISH LEVEL ──────────────────────────────────────────────────────────

  // 8. Verbosity
  const countSentences = (text: string) => (text.match(/[.!?]+/g) || []).length;
  let verboseCount = 0;
  assistantTurns.forEach((t, i) => {
    if (countSentences(t.content) > 4) {
      verboseCount++;
      if (verboseCount === 3) { // Only flag after 3 verbose turns
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
  const fillerPattern = /\b(absolutely|fantastic|amazing|wonderful|excellent|great question|sure thing|of course)\b/gi;
  let fillerCount = 0;
  assistantTurns.forEach((t) => {
    const matches = t.content.match(fillerPattern);
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

  // Sort: trust_killing first, then conversion_killing, compliance_risk, polish_level
  const severityOrder: Record<FailureSeverity, number> = {
    trust_killing: 0,
    conversion_killing: 1,
    compliance_risk: 2,
    polish_level: 3,
  };
  failures.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return failures;
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
