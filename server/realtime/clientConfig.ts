/**
 * clientConfig.ts — per-tenant facts the agent must prefer over improvisation
 */

import type {
  SessionConversationMode,
  TenantVoiceRuntimeProfile,
} from "./tenantVoiceRuntime";

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
  /** Spoken agent name on calls; empty/omitted defaults to "Alex" in prompts and greetings */
  voiceAgentDisplayName?: string;
  callDirection?: "inbound" | "outbound";
  outboundScript?: string;
  campaignMode?: SessionConversationMode;
  voiceRuntimeProfile?: TenantVoiceRuntimeProfile;
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
  businessName: "Your Business",
  industry: "AI phone agent platform for revenue-driven businesses",
  serviceAreas: [],
  faqAnswers: {},
};

const DEFAULT_APEX_PLATFORM_FAQS: Record<string, string> = {
  overview:
    "ApexAI gives companies a human-sounding AI phone agent for inbound calls, outbound follow-up, appointment booking, and SMS workflows.",
  deployment:
    "We set each workspace up with its own voice, number, business context, and knowledge so the agent sounds like that company, not like a shared generic bot.",
  numbers:
    "ApexAI can provision dedicated customer phone numbers during onboarding. The ApexAI public demo line stays separate from customer numbers.",
  booking:
    "Appointments can be written into the CRM, confirmed by SMS or email, and added to Google Calendar when the workspace has calendar access connected.",
  crm:
    "ApexAI supports CRM connections like HubSpot, Salesforce, and Pipedrive so qualified leads and booked calls can sync into the customer's system.",
  languages:
    "Voice sessions can be configured per workspace language, tone, and pronunciation hints so each organization can match how its team actually speaks.",
  sms:
    "Voice can go live immediately. Outbound SMS readiness depends on carrier approval for local 10DLC numbers or toll-free verification when the customer uses a toll-free line.",
};

export function mergeClientConfig(partial?: Partial<ClientConfig>): ClientConfig {
  const merged: ClientConfig = {
    ...DEFAULT_CLIENT,
    ...partial,
    serviceAreas: partial?.serviceAreas?.length ? partial.serviceAreas : DEFAULT_CLIENT.serviceAreas,
  };
  const defaultFaqs = isApexPlatformDemoLine(merged.businessName)
    ? DEFAULT_APEX_PLATFORM_FAQS
    : {};
  merged.faqAnswers = {
    ...defaultFaqs,
    ...(partial?.faqAnswers ?? {}),
  };
  return merged;
}
