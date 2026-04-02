/**
 * ApexAI marketing copy — sourced from product (Voice AI, Pricing, Industry demos, About).
 * Nav and landing sections consume this so the site stays consistent with the app.
 */

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BrainCircuit,
  Calendar,
  Headphones,
  Layers,
  Link2,
  Megaphone,
  Mic2,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Radio,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  TextQuote,
  Users,
  Zap,
} from "lucide-react";

export type NavMegaItem = {
  href: string;
  title: string;
  description: string;
  icon?: LucideIcon;
};

/** Languages available for AI conversations (same set as Settings → language). */
export const SUPPORTED_CONVERSATION_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "pt", name: "Portuguese" },
  { code: "it", name: "Italian" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "ru", name: "Russian" },
  { code: "zh", name: "Chinese (Mandarin)" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
] as const;

export const CONVERSATION_LANGUAGE_COUNT = SUPPORTED_CONVERSATION_LANGUAGES.length;

/** Readable list for hero, demos, and footers (no code names). */
export const SUPPORTED_LANGUAGES_MARKETING_LIST =
  "English, Spanish, French, German, Portuguese, Italian, Dutch, Polish, Russian, Chinese (Mandarin), Japanese, and Korean";

export const platformOverview = {
  title: "The ApexAI platform",
  subtitle:
    "Unified communications for revenue teams: inbound and outbound voice, SMS, and email — one knowledge base, one CRM, one place to measure outcomes. Built for businesses that win or lose on the phone. Run conversations in 12 languages (Spanish, French, German, and more); set your default in Settings.",
};

/** Landing: omnichannel / “one brain” narrative (no competitor names). */
export const unifiedCommunicationsSection = {
  eyebrow: "Unified communications",
  title: "Voice, SMS, and email — same context, same customer record",
  subtitle:
    "Callers do not live in a single channel. ApexAI keeps your facts, tone, and next steps aligned whether someone is on a live call, getting a text, or in a campaign sequence — so handoffs feel intentional, not fragmented.",
  pillars: [
    {
      title: "Voice as the spine",
      description:
        "Live telephony is where urgency and revenue concentrate. We optimize for natural conversation, barge-in, booking, and handoff — not a chatbot taped onto a phone line.",
      icon: Phone,
    },
    {
      title: "Consistent follow-up",
      description:
        "SMS confirmations, reminders, and outbound sequences pull from the same lead and knowledge you use on calls — fewer contradictions, faster resolution.",
      icon: Link2,
    },
    {
      title: "Proof in the data",
      description:
        "Transcripts, recordings, and dashboards show what people ask, what converts, and where to tighten scripts — so performance improves from real conversations.",
      icon: RefreshCw,
    },
  ] as { title: string; description: string; icon: LucideIcon }[],
};

/** How teams operationalize the product — mirrors “platform + practice” ideas without naming vendors. */
export const scaleWithApexSection = {
  eyebrow: "How teams scale",
  title: "From first live call to a repeatable revenue engine",
  subtitle:
    "Personalized experiences at scale only work when deployment, channels, and improvement loops stay in one system — not three tools that never agree.",
  items: [
    {
      title: "Deploy and orchestrate",
      description:
        "Spin up numbers, voice profiles, knowledge sources, and campaigns from one dashboard. Inbound and outbound share the same engine and analytics.",
      icon: Layers,
    },
    {
      title: "Guided by real conversations",
      description:
        "Every call and message feeds qualification, scoring, and summaries — so you scale what works instead of guessing from anecdotes.",
      icon: BrainCircuit,
    },
    {
      title: "Tune for your business",
      description:
        "Industry packs, escalation rules, and human transfer keep AI aligned with how you already sell — with room to tighten flows as you learn.",
      icon: Target,
    },
  ] as { title: string; description: string; icon: LucideIcon }[],
};

/** Extra trust copy — honest; do not claim specific certifications unless you hold them. */
export const trustEnterpriseBullets = [
  {
    title: "Accuracy-minded design",
    description:
      "Knowledge-grounded answers, URL stripping on voice, and reviewable transcripts help teams catch drift early and coach with evidence.",
  },
  {
    title: "Privacy-conscious defaults",
    description:
      "Tenant-scoped data, encryption in transit and at rest, and clear activity trails — structured for teams that take compliance seriously as they grow.",
  },
];

/** What the product is — maps to landing anchors */
export const platformPillars: NavMegaItem[] = [
  {
    href: "#platform-inbound",
    title: "Inbound AI",
    description:
      "24/7 answering in under a second. Qualifies callers, books appointments, sends SMS confirmations, full recording and transcript.",
    icon: PhoneIncoming,
  },
  {
    href: "#platform-outbound",
    title: "Outbound AI",
    description:
      "Upload your list; ApexAI dials at scale, handles objections, books qualified leads, and runs SMS + email follow-up automatically.",
    icon: PhoneOutgoing,
  },
  {
    href: "#platform-booking",
    title: "Booking & calendar",
    description:
      "Collects name, phone, preferred time, confirms verbally, reminders and calendar sync — reduces no-shows and updates your CRM.",
    icon: Calendar,
  },
  {
    href: "#platform-analytics",
    title: "Analytics & ops",
    description:
      "Per-campaign conversion, recordings, searchable transcripts, lead scoring, and dashboards — export-friendly for your stack.",
    icon: BarChart3,
  },
];

export const platformSecondary: NavMegaItem[] = [
  {
    href: "#how-it-works",
    title: "How live calls work",
    description:
      "Streaming voice end to end: speech detection, intelligent reply, natural TTS, barge-in, and optional tools — not a web chatbot bolted onto a phone.",
    icon: Radio,
  },
  {
    href: "#different",
    title: "Versus legacy IVR",
    description:
      "Why teams replace phone trees and voicemail with a single AI line that actually converses and closes.",
    icon: Layers,
  },
  {
    href: "#trust",
    title: "Security & compliance",
    description:
      "Enterprise-minded controls, TCPA-aware outbound patterns, encryption, human transfer anytime — aligned with how you already sell.",
    icon: Shield,
  },
];

/** Industry packs — copy aligned with IndustryDemos.tsx */
export const solutionsByIndustry: NavMegaItem[] = [
  {
    href: "#solution-solar",
    title: "Solar",
    description: "Qualifies homeowners, roof ownership, bill range, books site surveys.",
    icon: Zap,
  },
  {
    href: "#solution-hvac",
    title: "HVAC",
    description: "Emergency vs maintenance triage, books tech visits, warranty-aware scripts.",
    icon: Sparkles,
  },
  {
    href: "#solution-roofing",
    title: "Roofing",
    description: "Storm and insurance flows, free inspections, estimate booking.",
    icon: Phone,
  },
  {
    href: "#solution-realestate",
    title: "Real estate",
    description: "Buyer/seller qualification, showings, financing pre-check.",
    icon: Users,
  },
  {
    href: "#solution-insurance",
    title: "Insurance",
    description: "Quote requests, coverage questions, agent consultation booking.",
    icon: Shield,
  },
  {
    href: "#solution-spanish",
    title: "Spanish",
    description: "Full sales conversations en Español across verticals you run today.",
    icon: TextQuote,
  },
];

export const solutionsByMotion: NavMegaItem[] = [
  {
    href: "#solutions",
    title: "Industry packs hub",
    description: "Hear sample calls and scripts per vertical — same engine as production.",
    icon: Headphones,
  },
  {
    href: "#demo",
    title: "Live demo call",
    description: "We call your phone so you hear exactly what your leads hear.",
    icon: Mic2,
  },
  {
    href: "#calculator",
    title: "Revenue calculator",
    description: "Model missed inbound and outbound lift with your funnel numbers.",
    icon: Target,
  },
];

/** Voice AI product capabilities — from VoiceAI.tsx */
export const productFeatures: NavMegaItem[] = [
  {
    href: "#features-voice",
    title: "Human-sounding voice",
    description: "Natural turn-taking and pacing on real phone lines — tuned for sales and support.",
    icon: Mic2,
  },
  {
    href: "#features-scripts",
    title: "Personalized scripts",
    description: "Uses your company name, caller context, and location — not generic placeholders.",
    icon: TextQuote,
  },
  {
    href: "#features-objections",
    title: "Objection handling",
    description: "Trained patterns for common industry pushback so calls keep moving.",
    icon: Megaphone,
  },
  {
    href: "#features-booking",
    title: "Appointment setting",
    description: "Schedules on the call and triggers confirmations automatically.",
    icon: Calendar,
  },
  {
    href: "#features-sentiment",
    title: "Sentiment & scoring",
    description: "Interest and engagement signals to prioritize follow-up and coaching.",
    icon: Sparkles,
  },
  {
    href: "#features-recordings",
    title: "Recording & transcripts",
    description: "Searchable transcripts and recordings for every conversation.",
    icon: Layers,
  },
];

/** Channel features — from Pricing inbound/outbound lists */
export const channelFeatures: NavMegaItem[] = [
  {
    href: "#features-channels",
    title: "SMS, email, campaigns",
    description: "Follow-up sequences, templates, campaign analytics, and list outreach alongside voice.",
    icon: Zap,
  },
];

export const resourcesNav: NavMegaItem[] = [
  { href: "#results", title: "Customer stories", description: "Results across roofing, solar, HVAC, and more." },
  { href: "#unified-comms", title: "Unified communications", description: "Voice, SMS, and email with one context and customer record." },
  { href: "#capabilities", title: "Platform stack", description: "Phones, CRM, Zapier, workflows, webchat, analytics — what ships in-app." },
  { href: "#faq", title: "FAQ", description: "Setup, compliance, and how billing maps to usage." },
  { href: "/pricing", title: "Pricing", description: "Inbound minutes and outbound lead tiers." },
  { href: "/about", title: "About ApexAI", description: "Why we built inbound + outbound in one product." },
];

/** In-product capabilities surfaced in Settings and core flows (marketing grid). */
export const platformCapabilities: { title: string; blurb: string }[] = [
  { title: "Dedicated phone numbers", blurb: "Provision and activate lines per tenant; inbound SMS routes to your account." },
  { title: "Knowledge base", blurb: "Upload and crawl sources so voice answers from your facts." },
  { title: "CRM & lead capture", blurb: "Leads, scoring hooks, and pipelines inside the app." },
  { title: "AI call summaries", blurb: "Post-call summaries on recordings for coaching and CRM." },
  { title: "Lead scoring", blurb: "Configurable rules that run when leads are created." },
  { title: "Voice profiles", blurb: "Multiple unique voice profiles; per-user selection in Settings." },
  { title: "Spam & blocklist", blurb: "Inbound rejection patterns to protect your lines." },
  { title: "Escalation rules", blurb: "Keyword routing to human transfer when needed." },
  { title: "Zapier", blurb: "Outbound webhooks for lead created and call completed." },
  { title: "CRM connections", blurb: "Salesforce / HubSpot / Pipedrive OAuth stubs and sync path." },
  { title: "Workflow builder", blurb: "Draft automation graphs for future campaign logic." },
  { title: "Customer memory", blurb: "Persistent memory store keyed to leads for richer calls." },
  { title: "Sentiment", blurb: "Transcript-level signals for analytics and QA." },
  { title: "Support tickets", blurb: "Internal ticketing for handoffs and follow-ups." },
  { title: "Mobile devices", blurb: "Device registry for app push and account linkage." },
  { title: "Social connections", blurb: "OAuth surface for future social posting." },
  { title: "Email sequences", blurb: "Triggered email automation on lead and lifecycle events." },
  { title: "RCS readiness", blurb: "Carrier registration data model for rich messaging." },
  { title: "Webchat widgets", blurb: "Embeddable chat that captures leads into the same CRM." },
  { title: "Analytics dashboard", blurb: "Dashboard breakdowns, snapshots, and funnel metrics." },
  {
    title: "Multilingual conversations",
    blurb: `Default call language in Settings — ${CONVERSATION_LANGUAGE_COUNT} options including Spanish, French, German, Portuguese, and more.`,
  },
];

/** Exact bullets from Pricing.tsx — inbound / outbound plans */
export const pricingInboundBullets = [
  "24/7 AI phone answering",
  "Natural conversation (not a robot)",
  "Lead qualification & scoring",
  "Appointment booking",
  "Call recordings & transcripts",
  "SMS follow-up automation",
  "Real-time dashboard",
  "Your own phone number included",
];

export const pricingOutboundBullets = [
  "AI voice outbound calls",
  "SMS + Email outreach",
  "Lead qualification engine",
  "Appointment scheduling",
  "Real-time analytics",
  "Campaign management",
  "Custom templates",
  "30-day dedicated support",
];
