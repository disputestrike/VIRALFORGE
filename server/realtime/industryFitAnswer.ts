type IndustryFitInput = {
  transcript: string;
  recentAssistantTexts: string[];
  strictIndustry?: string | null;
  primaryIndustryLabel?: string | null;
  configuredIndustry?: string | null;
};

const GENERIC_FALLBACK_PATTERNS = [
  /ai phone agent platform/i,
  /inbound.*outbound.*booking.*sms/i,
  /revenue[-\s]?driven/i,
  /^business services$/i,
];

const IGNORED_SECTOR_VALUES = new Set([
  "me",
  "us",
  "you",
  "that",
  "this",
  "it",
  "there",
  "here",
]);

function normalizeIndustryLabel(label: string | null | undefined): string {
  const raw = (label ?? "").trim();
  if (!raw) return "";
  return raw
    .replace(/\b(companies|company|businesses|business|industry|sector)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanSectorCandidate(raw: string | null | undefined): string {
  const cleaned = normalizeIndustryLabel(
    (raw ?? "")
      .replace(
        /\b(company|companies|business|businesses|industry|sector|field|organization|organizations|institution|institutions)\b/gi,
        ""
      )
      .replace(/^(the|a|an)\s+/i, "")
      .replace(/\b(exactly|specifically|please)\b/gi, "")
      .trim()
  );
  if (!cleaned) return "";
  if (IGNORED_SECTOR_VALUES.has(cleaned.toLowerCase())) return "";
  return cleaned;
}

function isGenericIndustryLabel(label: string | null | undefined): boolean {
  const normalized = normalizeIndustryLabel(label).toLowerCase();
  if (!normalized) return false;
  if (normalized.split(/\s+/).length > 8) return true;
  return GENERIC_FALLBACK_PATTERNS.some((pattern) => pattern.test(normalized));
}

function extractRequestedSector(transcript: string): string {
  const t = transcript.toLowerCase();
  const patterns = [
    /\b(?:how can you help|how do you help|can you help|do you help|help)\s+(?:the\s+)?([a-z][a-z\s&/-]{1,60}?)(?:\?|$|[.,])/i,
    /\b(?:can you help|do you help|help)\s+([a-z][a-z\s&/-]{1,50}?)\s+(?:company|companies|business|businesses|industry|sector)\b/i,
    /\b(?:for|with)\s+([a-z][a-z\s&/-]{1,50}?)\s+(?:company|companies|business|businesses|industry|sector)\b/i,
    /\b(?:in|for)\s+the\s+([a-z][a-z\s&/-]{1,50}?)\s+(?:industry|sector)\b/i,
  ];
  for (const pattern of patterns) {
    const match = t.match(pattern);
    if (match?.[1]) {
      const sector = cleanSectorCandidate(match[1]);
      if (sector) return sector;
    }
  }
  return "";
}

function asksForCapability(transcript: string): boolean {
  const t = transcript.toLowerCase();
  return (
    /\b(how can you help|how do you help|can you help|do you help|help)\b/.test(t) ||
    (/\b(tell me|show me|walk me through|explain)\b/.test(t) &&
      /\b(what you can do|what do you do|what you do)\b/.test(t)) ||
    /\bwhat can you do\b/.test(t)
  );
}

function answerSignatureRegex(): RegExp {
  return /\b(inbound calls|outbound follow-?up|follow up|appointment|book(?:ed|ing)?|sms|lead capture|qualif(?:y|ies|ying)|reminders?)\b/i;
}

export function buildIndustryFitAnswer(input: IndustryFitInput): string | null {
  if (!asksForCapability(input.transcript)) return null;

  const explicit = extractRequestedSector(input.transcript);
  const fallback =
    cleanSectorCandidate(input.strictIndustry) ||
    cleanSectorCandidate(input.primaryIndustryLabel) ||
    (isGenericIndustryLabel(input.configuredIndustry) ? "" : cleanSectorCandidate(input.configuredIndustry));
  const sector = explicit || fallback;

  const repeated = input.recentAssistantTexts.some((recent) => {
    if (!answerSignatureRegex().test(recent)) return false;
    if (!sector) return true;
    return new RegExp(`\\b${escapeRegex(sector)}\\b`, "i").test(recent);
  });

  if (!sector) return null;

  if (repeated) return null;

  return `For ${sector}, ApexAI can answer inbound calls, follow up with leads quickly, book appointments, and keep SMS workflows moving in the business's own voice.`;
}
