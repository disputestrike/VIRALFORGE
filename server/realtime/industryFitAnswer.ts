type IndustryFitInput = {
  transcript: string;
  recentAssistantTexts: string[];
  strictIndustry?: string | null;
  primaryIndustryLabel?: string | null;
  configuredIndustry?: string | null;
};

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

function extractRequestedSector(transcript: string): string {
  const t = transcript.toLowerCase();
  const patterns = [
    /\b(?:can you help|do you help|help)\s+([a-z][a-z\s&/-]{1,50}?)\s+(?:company|companies|business|businesses|industry|sector)\b/i,
    /\b(?:for|with)\s+([a-z][a-z\s&/-]{1,50}?)\s+(?:company|companies|business|businesses|industry|sector)\b/i,
    /\b(?:in|for)\s+the\s+([a-z][a-z\s&/-]{1,50}?)\s+(?:industry|sector)\b/i,
  ];
  for (const pattern of patterns) {
    const match = t.match(pattern);
    if (match?.[1]) {
      const sector = normalizeIndustryLabel(match[1]);
      if (sector) return sector;
    }
  }
  return "";
}

function asksForCapability(transcript: string): boolean {
  const t = transcript.toLowerCase();
  return (
    /\b(can you help|do you help|help)\b/.test(t) ||
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
    normalizeIndustryLabel(input.strictIndustry) ||
    normalizeIndustryLabel(input.primaryIndustryLabel) ||
    normalizeIndustryLabel(input.configuredIndustry);
  const sector = explicit || fallback;

  const repeated = input.recentAssistantTexts.some((recent) => {
    if (!answerSignatureRegex().test(recent)) return false;
    if (!sector) return true;
    return new RegExp(`\\b${escapeRegex(sector)}\\b`, "i").test(recent);
  });

  if (!sector) {
    if (repeated) {
      return "Yes. We can handle inbound calls, fast lead follow-up, appointment booking, and SMS reminders. What type of business should I tailor this to?";
    }
    return "Yes. ApexAI handles inbound calls, fast lead follow-up, appointment booking, and SMS reminders in a voice that sounds human. What industry should I tailor it to?";
  }

  if (repeated) {
    return `Yes - for ${sector}, the core value is inbound call handling, rapid follow-up, and booked next steps without sounding robotic. Which one do you want first?`;
  }

  return `Yes. ApexAI can support ${sector} businesses with inbound calls, outbound follow-up, appointment setting, and SMS workflows. We tailor the number, voice, and business knowledge so it sounds like your team.`;
}
