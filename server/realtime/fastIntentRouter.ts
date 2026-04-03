/**
 * Heuristic intent signals on partial/interim STT — fast path (<1ms) for semantic barge-in.
 * Does not replace classifyTurn / blueprint on finals.
 */

export type FastInterimResult = {
  semanticInterrupt: boolean;
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
