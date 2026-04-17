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

export function predictiveTurnFromInterim(text: string): PredictiveInterimResult {
  const t = text.toLowerCase().trim();
  if (t.length < 12) return { commitEarly: false, hints: [] };
  if (/^(uh+|um+|hm+|hmm+|mm+|ah+|oh+|well)\b/.test(t) && t.length < 20) {
    return { commitEarly: false, hints: [] };
  }
  if (/\b(hello|hi|can you hear me|are you there|you there)\b/.test(t)) {
    return { commitEarly: false, hints: [] };
  }

  const hints: string[] = [];
  if (/\b(what|how|why|when|where|who|can|do|does|is|are)\b/.test(t)) {
    hints.push("question_shape");
  }
  if (/\b(price|pricing|cost|how much|plan|book|schedule|appointment|calendar|demo|crm|sms|text|inbound|outbound|number|website|integrat)\b/.test(t)) {
    hints.push("product_or_action");
  }
  if (/\b(i need|i want|i'm calling|im calling|looking for|trying to|tell me|walk me through|show me)\b/.test(t)) {
    hints.push("explicit_request");
  }
  if (/\b(real person|human|representative|agent)\b/.test(t)) {
    hints.push("human_request");
  }

  const wordCount = t.split(/\s+/).filter(Boolean).length;
  const commitEarly =
    wordCount >= 3 &&
    (hints.includes("explicit_request") ||
      (hints.includes("question_shape") && hints.includes("product_or_action")));

  return { commitEarly, hints };
}
