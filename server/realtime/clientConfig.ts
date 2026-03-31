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
};

export const DEFAULT_CLIENT: ClientConfig = {
  businessName: "ApexAI",
  industry: "business services",
  serviceAreas: [],
  faqAnswers: {
    what_is:
      "Apex AI is a phone and messaging platform that answers calls, qualifies leads, and helps book appointments.",
  },
};

export function mergeClientConfig(partial?: Partial<ClientConfig>): ClientConfig {
  return {
    ...DEFAULT_CLIENT,
    ...partial,
    faqAnswers: { ...DEFAULT_CLIENT.faqAnswers, ...partial?.faqAnswers },
    serviceAreas: partial?.serviceAreas?.length ? partial.serviceAreas : DEFAULT_CLIENT.serviceAreas,
  };
}
