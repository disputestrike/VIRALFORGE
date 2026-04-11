/**
 * clientConfig.ts — per-tenant facts the agent must prefer over improvisation
 */

export type ClientConfig = {
  businessName: string;
  industry: string;
  serviceAreas: string[];
  faqAnswers: Record<string, string>;
  discountsLine?: string;
  bookingUrl?: string;
  transferNumber?: string;
  voiceProfileId?: string;
  /** Display label for vertical (e.g. custom niche not in curated list) */
  primaryIndustryLabel?: string;
  /** Free-form tenant domain notes — authoritative in voice prompts */
  voiceIndustryContext?: string;
  voiceKeyPhrases?: string;
  voiceRestrictionNotes?: string;
};

/** True only for ApexAI's own demo/sales line — not "Apex Roofing" etc. */
export function isApexPlatformDemoLine(businessName: string): boolean {
  const compact = businessName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (compact === "apexai") return true;
  const t = businessName.trim().toLowerCase();
  if (t === "apex ai" || t === "apex a i") return true;
  return /^apex\s+a\s+i$/i.test(businessName.trim());
}

export const DEFAULT_CLIENT: ClientConfig = {
  businessName: "Apex A I",
  industry: "AI phone agent platform for revenue-driven businesses",
  serviceAreas: [],
  faqAnswers: {},
};

export function mergeClientConfig(partial?: Partial<ClientConfig>): ClientConfig {
  const merged: ClientConfig = {
    ...DEFAULT_CLIENT,
    ...partial,
    serviceAreas: partial?.serviceAreas?.length ? partial.serviceAreas : DEFAULT_CLIENT.serviceAreas,
  };
  merged.faqAnswers = { ...(partial?.faqAnswers ?? {}) };
  return merged;
}
