/**
 * Heuristic intent signals on partial/interim STT — fast path (<1ms) for semantic barge-in.
 * Does not replace classifyTurn / blueprint on finals.
 */

export type FastInterimResult = {
  semanticInterrupt: boolean;
  hints: string[];
};

export type PredictiveInterimResult = {
  commitEarly: boolean;
  hints: string[];
  delayMs: number;
  reason?: string;
};

/** Final transcript: user wants no further contact (compliance / WS8). */
export function optOutFromFinal(text: string): boolean {
  const t = text.toLowerCase();
  return /\b(take me off|remove me from your|stop calling|do not call|don't call me|unsubscribe|opt\s*out|put me on your do not call|dnc list)\b/i.test(
    t
  );
}

export function fastIntentFromInterim(text: string): FastInterimResult {
  const t = text.toLowerCase().trim();
  if (t.length < 4) return { semanticInterrupt: false, hints: [] };

  if (/\b(wait|stop|hold on|no no|actually|hang on|one sec|one second)\b/.test(t)) {
    return { semanticInterrupt: true, hints: ["semantic_interrupt"] };
  }
  if (/\b(agent|human|person|representative|real person)\b/.test(t)) {
    return { semanticInterrupt: false, hints: ["human_request"] };
  }
  if (/\b(book|schedule|appointment|calendar)\b/.test(t)) {
    return { semanticInterrupt: false, hints: ["booking"] };
  }
  return { semanticInterrupt: false, hints: [] };
}

export function predictiveTurnFromInterim(text: string, confidence = 0): PredictiveInterimResult {
  const t = text.toLowerCase().trim();
  if (t.length < 10) return { commitEarly: false, hints: [], delayMs: 0 };
  if (confidence > 0 && confidence < 0.9) return { commitEarly: false, hints: [], delayMs: 0 };
  if (/^(uh+|um+|hm+|hmm+|mm+|ah+|oh+|well)\b/.test(t) && t.length < 20) {
    return { commitEarly: false, hints: [], delayMs: 0 };
  }
  if (/^(hello|hi|hey)([?.!,\s]|$)/.test(t) || /\b(can you hear me|are you there|you there)\b/.test(t)) {
    return { commitEarly: false, hints: [], delayMs: 0 };
  }

  const hints: string[] = [];
  if (/\b(what|how|why|when|where|who|can|do|does|is|are)\b/.test(t)) {
    hints.push("question_shape");
  }
  if (/\b(price|pricing|cost|how much|plan|book|schedule|appointment|calendar|demo|crm|sms|text|inbound|outbound|number|website|integrat|solar|hvac|roofing|insurance|real estate|plumbing|dental|medical|legal)\b/.test(t)) {
    hints.push("product_or_action");
  }
  if (/\b(i need|i want|i'm calling|im calling|looking for|trying to|tell me|walk me through|show me|let me know|explain)\b/.test(t)) {
    hints.push("explicit_request");
  }
  if (/\b(real person|human|representative|agent)\b/.test(t)) {
    hints.push("human_request");
  }
  if (/[?]$/.test(t)) {
    hints.push("terminal_question_mark");
  }

  const wordCount = t.split(/\s+/).filter(Boolean).length;
  const directCapabilityAsk =
    /\b(what can you do|what do you do|tell me what you can do|tell me more about what you do)\b/.test(t);
  const directIndustryFitAsk =
    /\b(can you help|do you help|help)\b/.test(t) &&
    /\b(companies|businesses|solar|hvac|roofing|insurance|plumbing|dental|medical|legal)\b/.test(t);
  const commitEarly =
    wordCount >= 3 &&
    (directCapabilityAsk ||
      directIndustryFitAsk ||
      hints.includes("human_request") ||
      hints.includes("explicit_request") ||
      (hints.includes("question_shape") && hints.includes("product_or_action")));

  const reason = directCapabilityAsk
    ? "capability_question"
    : directIndustryFitAsk
      ? "industry_fit_question"
      : hints.includes("human_request")
        ? "human_request"
        : hints.includes("explicit_request")
          ? "explicit_request"
          : hints.includes("question_shape") && hints.includes("product_or_action")
            ? "product_question"
            : undefined;

  const delayMs =
    confidence >= 0.97 && (directCapabilityAsk || directIndustryFitAsk) ? 25 :
    confidence >= 0.95 ? 45 :
    confidence >= 0.92 ? 70 :
    95;

  return { commitEarly, hints, delayMs: commitEarly ? delayMs : 0, reason };
}
