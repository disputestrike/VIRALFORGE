/**
 * Lightweight call-level sentiment from transcript text (keyword density).
 * Used when no real-time API is configured — good enough for Analytics aggregates.
 */
export type CallSentiment = "positive" | "neutral" | "negative";

const POS = new Set([
  "yes",
  "yeah",
  "yep",
  "thanks",
  "thank",
  "great",
  "good",
  "interested",
  "schedule",
  "book",
  "booking",
  "perfect",
  "love",
  "sure",
  "sounds",
  "wonderful",
  "excellent",
  "appreciate",
]);

const NEG = new Set([
  "no",
  "never",
  "stop",
  "cancel",
  "unsubscribe",
  "angry",
  "complaint",
  "terrible",
  "awful",
  "waste",
  "remove",
]);

function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function inferSentimentFromTranscript(text: string | null | undefined): CallSentiment {
  if (!text?.trim()) return "neutral";
  const lower = text.toLowerCase();
  let pos = 0;
  let neg = 0;
  if (lower.includes("not interested")) neg += 2;
  if (/\b(don't|dont|do not)\s+(call|contact)\b/.test(lower)) neg += 2;

  const words = tokenizeWords(text);
  for (const w of words) {
    if (POS.has(w)) {
      if (w === "interested" && lower.includes("not interested")) continue;
      pos++;
    }
    if (NEG.has(w)) neg++;
  }
  if (pos === 0 && neg === 0) return "neutral";
  if (pos > neg) return "positive";
  if (neg > pos) return "negative";
  return "neutral";
}
