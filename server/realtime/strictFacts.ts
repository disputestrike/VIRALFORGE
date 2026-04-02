/**
 * Deterministic fact extraction from user turns — memory the model must respect.
 */

import type { StrictFacts } from "./strictTypes";

const INDUSTRIES: Array<{ key: string; patterns: RegExp[] }> = [
  { key: "solar", patterns: [/\bsolar\b/i, /\bpv\b/i, /\bpanels?\b/i] },
  { key: "roofing", patterns: [/\broofing\b/i, /\broofs?\b/i] },
  { key: "hvac", patterns: [/\bhvac\b/i, /\bheating\b/i, /\bac\b/i, /\bair conditioning\b/i] },
  { key: "insurance", patterns: [/\binsurance\b/i] },
  { key: "real estate", patterns: [/\breal estate\b/i, /\brealtor\b/i] },
  { key: "legal", patterns: [/\blaw firm\b/i, /\battorney\b/i] },
  { key: "healthcare", patterns: [/\bmedical\b/i, /\bclinic\b/i, /\bdental\b/i] },
];

const PAIN_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "missed_calls", re: /\b(miss(ing)?|not (getting|picking)|dropped|slip through|voicemail)\b.*\bcalls?\b|\bcalls?\b.*\b(miss|not answer|drop)\b/i },
  { label: "conversion", re: /\b(convert|closing|close the deal|not turning|leads? die|fall through)\b/i },
  { label: "volume", re: /\btoo many calls\b|\boverflow\b|\bcan'?t keep up\b/i },
  { label: "follow_up", re: /\bfollow[\s-]?up\b|\bno follow\b|\bslow response\b/i },
];

export function mergeStrictFactsFromTranscript(text: string, prev: StrictFacts): StrictFacts {
  const next: StrictFacts = {
    painLabels: [...prev.painLabels],
    discussedTopics: [...prev.discussedTopics],
    industry: prev.industry,
    subIndustry: prev.subIndustry,
    callVolume: prev.callVolume,
    name: prev.name,
    phoneDigits: prev.phoneDigits,
  };

  const t = text.trim();
  const lower = t.toLowerCase();

  for (const { key, patterns } of INDUSTRIES) {
    if (patterns.some((p) => p.test(t))) {
      next.industry = key;
      if (!next.discussedTopics.includes("industry")) next.discussedTopics.push("industry");
      break;
    }
  }

  for (const { label, re } of PAIN_PATTERNS) {
    if (re.test(t) && !next.painLabels.includes(label)) {
      next.painLabels.push(label);
    }
  }
  if (/\b(all of them|both|everything|every single)\b/i.test(t) && next.painLabels.length === 0) {
    next.painLabels.push("multiple_pains");
  }

  const vol = t.match(/\b(\d{1,4})\s*(calls?|per month|a month|\/mo|monthly)\b/i);
  if (vol) {
    const n = parseInt(vol[1]!, 10);
    if (n > 0 && n < 50000) next.callVolume = n;
  }
  const vol2 = t.match(/\blike,?\s*a?\s*hundred\b/i);
  if (vol2) next.callVolume = 100;

  const nameM = t.match(/\b(?:my name is|i'?m|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
  if (nameM?.[1]) next.name = nameM[1].split(/\s+/)[0]!;

  const digits = t.replace(/\D/g, "");
  if (digits.length >= 10) next.phoneDigits = digits.slice(-10);

  if (lower.includes("demo") || lower.includes("book")) {
    if (!next.discussedTopics.includes("booking_interest")) next.discussedTopics.push("booking_interest");
  }

  return next;
}
