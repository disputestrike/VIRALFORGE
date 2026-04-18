/**
 * resetGuardrails.ts — Mid-conversation identity reset prevention.
 *
 * When hard_no_reset = true (after the caller's first real question),
 * the LLM must never fall back to its opening introduction. This module:
 *
 *   1. Detects banned reset phrases in generated output
 *   2. Strips them from streaming clauses before they reach Cartesia TTS
 *
 * Problem solved: "I'm Alex, an AI assistant on this line. How can I
 * help you today?" appearing in the middle of an active conversation —
 * which signals to the caller that the AI lost context.
 */

/** Regex patterns that constitute a mid-conversation identity reset */
export const RESET_OPENER_PATTERNS: RegExp[] = [
  // Self-introductions
  /i'?m alex[,.]?\s+an? ai (assistant|agent)/i,
  /apexai[,.]?\s+alex speaking/i,
  /apexai[,.]?\s+\w+ speaking[,.]?\s+i (can|will)/i,
  /i'?m \w+[,.]?\s+an? ai (assistant|agent)/i,
  /this is \w+[,.]?\s+(an? ai|your ai|the ai)/i,

  // Generic "how can I help" resets (only ban multi-word variants — not "help you with X")
  /what can i help you with today\??/i,
  /how can i (help|assist) you today\??/i,
  /how can i (help|assist) you now\??/i,
  /how can we help you today\??/i,
  /what (are you |would you like to )(looking for|know|discuss|need)\?/i,
  /what brings you (?:in|here|to us) today\?/i,
  /what would you like to (know|discuss) today\?/i,
  /how may i (help|assist) you today\??/i,
  /how may i (help|assist) you\??/i,
  /i am here to help[,.]?\s*what (can|would)/i,
];

/**
 * Returns true if the given text contains a banned reset opener.
 * Only enforce when hard_no_reset = true.
 */
export function containsResetOpener(text: string): boolean {
  return RESET_OPENER_PATTERNS.some((p) => p.test(text));
}

/**
 * Strip banned reset phrases from a generated LLM clause before TTS.
 *
 * @param clause      A single streaming clause from the LLM
 * @param hardNoReset Whether we are past the first caller turn
 * @returns The filtered clause. May be empty if the whole clause was a reset phrase.
 */
export function applyResetGuardrails(clause: string, hardNoReset: boolean): string {
  if (!hardNoReset) return clause;

  let filtered = clause;
  for (const pattern of RESET_OPENER_PATTERNS) {
    filtered = filtered.replace(pattern, "").trim();
  }

  // If the clause collapsed to punctuation-only or whitespace, discard it
  if (filtered.replace(/[.,!?;:\s\-–—]/g, "").length < 3) return "";

  return filtered;
}

/**
 * Post-process a full assistant response (non-streaming path) to remove resets.
 * Same logic as applyResetGuardrails but operates on the complete response text.
 */
export function applyResetGuardrailsToFullResponse(text: string, hardNoReset: boolean): string {
  if (!hardNoReset) return text;

  let filtered = text;
  for (const pattern of RESET_OPENER_PATTERNS) {
    filtered = filtered.replace(pattern, "").trim();
  }

  // Clean up double-spacing or orphaned punctuation that may result from removal
  filtered = filtered.replace(/\s{2,}/g, " ").replace(/^[,.:;!?\s]+/, "").trim();

  return filtered.length > 0 ? filtered : text; // fall back to original if nothing remains
}
