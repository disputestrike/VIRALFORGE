/**
 * Detect assistant loops (e.g. re-asking industry when already known).
 */

import type { StrictFacts } from "./strictTypes";

const INDUSTRY_ASK =
  /\b(what industry|what kind of business|which industry|your business in|are you in solar|are you in roofing|what do you run|type of business)\b/i;

export function extractLastQuestion(assistantText: string): string | null {
  const q = assistantText.lastIndexOf("?");
  if (q === -1) return null;
  let start = assistantText.lastIndexOf(".", q);
  if (start === -1) start = assistantText.lastIndexOf("!", q);
  if (start === -1) start = Math.max(0, q - 220);
  return assistantText.slice(start + 1, q + 1).trim();
}

/** True if we should hard-ban another industry question. */
export function repeatIndustryViolation(facts: StrictFacts, lastAssistantQuestion: string | null): boolean {
  if (!facts.industry || !lastAssistantQuestion) return false;
  return INDUSTRY_ASK.test(lastAssistantQuestion);
}
