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
  industry: "AI phone agent platform for revenue-driven businesses",
  serviceAreas: [],
  faqAnswers: {
    what_is:
      "ApexAI is an AI phone agent that answers every call 24/7, qualifies leads, books appointments directly to your calendar, and runs outbound campaigns — so your business never misses a revenue opportunity.",
    who_for:
      "We work with solar, roofing, HVAC, insurance, real estate, and any business that depends on phone leads. If your revenue comes from calls, ApexAI makes sure every one of them is answered and followed up.",
    how_it_works:
      "When someone calls your number, ApexAI answers instantly — under one second. It has a real conversation, qualifies the lead, answers their questions, and books an appointment directly to your calendar. You get a full transcript and recording of every call.",
    pricing:
      "Pricing is based on call volume and features. We have plans for small businesses starting out and enterprise plans for high-volume operations. The best way to see the right fit is to book a quick demo — I can set that up for you right now.",
    vs_voicemail:
      "Unlike voicemail, ApexAI actually converses with the caller, qualifies them, answers their questions, and books the appointment — all in real time. Callers never know they are not talking to a person on your team.",
    does_it_replace_staff:
      "ApexAI handles the repetitive first-touch calls — answering, qualifying, booking — so your team focuses on high-value work. Most clients see it as adding a full-time receptionist that never sleeps, not replacing anyone.",
    outbound:
      "Yes — ApexAI also runs outbound campaigns. Upload a contact list and it calls them, qualifies the interested ones, books appointments, and sends SMS follow-ups automatically.",
    demo:
      "Absolutely. I can set up a live demo call right now so you can hear exactly how it sounds for your business. What industry are you in?",
    after_hours:
      "ApexAI runs 24 hours a day, 7 days a week — including nights, weekends, and holidays. Every call gets answered the same way regardless of when it comes in.",
    integrations:
      "ApexAI integrates with Google Calendar, major CRMs, and sends SMS confirmations automatically. If you use a specific platform, ask and we can confirm compatibility.",
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
