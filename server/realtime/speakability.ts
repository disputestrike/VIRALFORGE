/**
 * Normalize LLM output for telephony — speakable, compact clauses.
 * Roadmap WS6 — rewriter surface (numbers, dates, abbrev).
 */

function spokenDigits(phoneLike: string): string {
  return phoneLike.replace(/\d/g, (d) => {
    const names = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
    return names[parseInt(d, 10)] ?? d;
  });
}

/** US-style phone in text → spaced digit names for clearer TTS. */
function normalizePhoneForSpeech(s: string): string {
  return s.replace(/\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, (m) => {
    const digits = m.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) return m;
    return spokenDigits(digits.split("").join(" "));
  });
}

function normalizeDates(s: string): string {
  let out = s;
  out = out.replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/g, (_, a, b, y) => `${a} ${b} ${y}`);
  out = out.replace(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/gi,
    (m) => m.replace(/,/g, ""));
  return out;
}

export function speakableLine(text: string): string {
  let out = text.replace(/\s+/g, " ").trim();
  out = out.replace(/\bETA\b/gi, "E.T.A.");
  out = out.replace(/\bASAP\b/gi, "as soon as possible");
  out = out.replace(/\bvs\.?\b/gi, "versus");
  out = out.replace(/\$\s*([\d,]+(?:\.\d+)?)/g, (_, n) => `${String(n).replace(/,/g, "")} dollars`);
  out = normalizeDates(out);
  out = normalizePhoneForSpeech(out);
  return out;
}

/** Alias for pipelines that expect a “rewriter” name (roadmap WS6). */
export const rewriteForSpeech = speakableLine;
