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
      "Apex AI is an AI phone-agent platform: we answer inbound calls 24/7, qualify leads, book appointments, send SMS follow-ups, and plug into CRMs and calendars so businesses never miss revenue when the phone rings.",
    who_for:
      "We work with home services, solar, HVAC, med spas, and any business that lives or dies on phone leads — owners who need coverage after hours and consistent follow-up.",
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
