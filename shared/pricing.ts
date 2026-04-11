export type CheckoutTier = "starter" | "growth" | "enterprise";
export type PublicPlanId = "starter" | "growth" | "scale" | "enterprise";

export type SelfServePlan = {
  id: Exclude<PublicPlanId, "enterprise">;
  checkoutTier: CheckoutTier;
  name: string;
  price: number;
  minutes: number;
  numbers: number;
  industriesIncluded: string;
  summary: string;
  bestFor: string;
  popular?: boolean;
  accentColor: string;
};

export type EnterprisePlan = {
  id: "enterprise";
  name: string;
  priceLabel: string;
  minutes: string;
  numbers: string;
  industriesIncluded: string;
  summary: string;
  bestFor: string;
  accentColor: string;
};

export const SELF_SERVE_PLANS: SelfServePlan[] = [
  {
    id: "starter",
    checkoutTier: "starter",
    name: "Starter",
    price: 149,
    minutes: 500,
    numbers: 1,
    industriesIncluded: "1 included",
    summary: "Turn missed calls into booked revenue without adding headcount.",
    bestFor: "Owner-led teams that need a real front desk on the phone.",
    accentColor: "#60a5fa",
  },
  {
    id: "growth",
    checkoutTier: "growth",
    name: "Growth",
    price: 299,
    minutes: 1500,
    numbers: 1,
    industriesIncluded: "1 included",
    summary: "The core ApexAI plan for active SMB teams that live on the phone.",
    bestFor: "Growing teams that need inbound coverage plus outbound follow-up.",
    popular: true,
    accentColor: "#22c55e",
  },
  {
    id: "scale",
    checkoutTier: "enterprise",
    name: "Scale",
    price: 599,
    minutes: 4000,
    numbers: 3,
    industriesIncluded: "All packs",
    summary: "More capacity, more numbers, and broader deployment without complexity.",
    bestFor: "Mid-market operators running multiple lines, campaigns, or locations.",
    accentColor: "#f59e0b",
  },
];

export const ENTERPRISE_PLAN: EnterprisePlan = {
  id: "enterprise",
  name: "Enterprise",
  priceLabel: "Custom",
  minutes: "Custom",
  numbers: "Custom",
  industriesIncluded: "Custom",
  summary: "Dedicated rollout, custom integrations, compliance needs, and higher-volume deployment.",
  bestFor: "Teams with multi-location, regulated, or high-volume voice operations.",
  accentColor: "#c084fc",
};

export const PLATFORM_INCLUDED_FEATURES = [
  "24/7 AI phone answering",
  "Human-sounding live conversations",
  "Lead qualification and call summaries",
  "Appointment booking and confirmations",
  "Built-in CRM, recordings, and transcripts",
  "SMS follow-up and email automation",
  "Knowledge-base grounded answers",
  "Real-time analytics and dashboards",
] as const;

export const PLATFORM_SCALE_FEATURES = [
  "Dedicated phone numbers and routing",
  "Industry packs and voice profiles",
  "Outbound campaigns on Growth and Scale",
  "Escalation rules and human handoff",
  "Zapier, CRM, and calendar integrations",
  "Webchat and multi-channel follow-up",
] as const;

export const PLATFORM_ADD_ONS = [
  { name: "Additional industry pack", priceLabel: "$49/mo", description: "Train one workspace for another vertical without opening a second account." },
  { name: "Extra phone numbers", priceLabel: "Custom", description: "Add more coverage lines as your locations, campaigns, or teams expand." },
  { name: "Outbound campaign volume", priceLabel: "Custom", description: "Scale AI outbound calling and follow-up beyond the default Growth/Scale usage." },
  { name: "Enterprise onboarding", priceLabel: "Custom", description: "White-glove rollout, custom integrations, and higher-compliance requirements." },
] as const;

export const DEFAULT_ROI_PLAN_TIER: CheckoutTier = "growth";

export function getSelfServePlanByCheckoutTier(tier: CheckoutTier): SelfServePlan {
  return SELF_SERVE_PLANS.find((plan) => plan.checkoutTier === tier) ?? SELF_SERVE_PLANS[1]!;
}

export function formatPlanLabel(plan: string | null | undefined): string {
  const normalized = (plan ?? "").toLowerCase().trim();
  if (!normalized || normalized === "trial" || normalized === "free trial") return "Free Trial";
  if (normalized === "starter") return "Starter";
  if (normalized === "growth") return "Growth";
  if (normalized === "enterprise" || normalized === "scale" || normalized === "pro") return "Scale";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
