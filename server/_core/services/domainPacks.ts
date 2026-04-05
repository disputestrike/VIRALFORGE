/**
 * Single source of truth for domain / industry packs.
 * Curated verticals + universal fallback for any industry string (not limited to website list).
 * Per-tenant overlays come from users.* columns merged in resolveDomainPack.
 */

export type TenantIndustryOverlay = {
  /** Overrides display / prompt label (e.g. "Commercial HVAC" while key is hvac) */
  primaryIndustryLabel?: string;
  /** Free-form context injected as authoritative for this tenant */
  customIndustryContext?: string;
  /** Comma- or newline-separated terms for STT/LLM (brands, SKUs, jargon) */
  voiceKeyPhrases?: string;
  /** Extra compliance / “never claim” lines */
  voiceRestrictionNotes?: string;
};

export type DomainPack = {
  industry: string;
  displayName: string;
  requiredQualificationFields: string[];
  bookingTriggerConditions: string[];
  faqAnswers: Record<string, string>;
  prohibitedClaims: string[];
  handoffTriggers: string[];
  /** Core narrative for LLM — curated or adaptive */
  systemContext: string;
  /** Short phrases for tools / hints */
  qualificationHints: string[];
  actorsNote?: string;
  keyPhrases?: string[];
  restrictionNotes?: string;
};

/** Normalize DB / lead / UI industry strings to slug keys for curated lookup. */
export function normalizeIndustryKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "general";
}

/** Map slug to curated pack key if one exists (handles "solar-energy" → solar). */
export function resolveCuratedPackKey(raw: string): string {
  const key = normalizeIndustryKey(raw);
  if (CURATED_DOMAIN_PACKS[key]) return key;
  const head = key.split("-")[0] ?? "";
  if (head && CURATED_DOMAIN_PACKS[head]) return head;
  return key;
}

const UNIVERSAL_PACK: DomainPack = {
  industry: "universal",
  displayName: "General business",
  requiredQualificationFields: ["what they need", "timeline or urgency", "best callback number if needed"],
  bookingTriggerConditions: ["interest_confirmed", "basic_need_understood"],
  faqAnswers: {},
  prohibitedClaims: [
    "specific prices or savings not provided by tenant CONFIG",
    "medical diagnosis or treatment advice",
    "legal advice or guaranteed legal outcomes",
    "licensed professional claims without human verification",
  ],
  handoffTriggers: ["regulated advice", "angry caller", "explicit human request", "topic outside tenant facts"],
  actorsNote: "Callers may be owners, staff, or customers — infer role from what they say; stay neutral until clear.",
  qualificationHints: [
    "what prompted the call",
    "what outcome they want today",
    "timing or urgency",
  ],
  systemContext: `You represent the tenant's business on the phone. The vertical may be ANY industry — adapt vocabulary, examples, and questions to INDUSTRY_LABEL using only:
- CONFIG FACTS and MANDATORY COMPANY FACTS from the prompt
- Reasonable general knowledge about how businesses in that vertical usually speak
Do NOT invent tenant-specific prices, guarantees, regulatory approvals, or licensed claims. If unknown, say you can confirm with the team or offer a callback.`,
  keyPhrases: [],
  restrictionNotes: "Never contradict tenant CONFIG; never fabricate offers.",
};

/** Curated packs — extend here for first-class verticals. Unknown slugs use UNIVERSAL_PACK + displayName from raw label. */
export const CURATED_DOMAIN_PACKS: Record<string, DomainPack> = {
  solar: {
    industry: "solar",
    displayName: "Solar Energy",
    requiredQualificationFields: ["zipCode", "homeowner", "monthlyElectricBill"],
    bookingTriggerConditions: ["service_area_confirmed", "interest_confirmed"],
    faqAnswers: {
      "how does solar work":
        "Solar panels convert sunlight into electricity, reducing your utility bill. Most homeowners save money over time; exact savings depend on usage and site.",
      "how long does installation take":
        "Installation often takes a day or two on site; permits and utility paperwork can add a few weeks depending on location.",
      "is my house eligible":
        "Many homes qualify; roof condition, shading, and local rules matter. A site assessment confirms what's possible.",
    },
    prohibitedClaims: ["guaranteed savings without basis", "false tax credit amounts", "specific dollar savings not from tenant"],
    handoffTriggers: ["complex financing", "legal questions", "angry caller"],
    qualificationHints: ["monthly electric bill", "homeowner vs renter", "roof condition", "utility"],
    systemContext:
      "You help property owners explore solar: service area, savings concepts (no invented dollars), incentives at a high level, installation flow, eligibility. Prefer booking a consult when interest is real.",
    keyPhrases: ["net metering", "kilowatt", "inverter", "PPA", "lease"],
  },
  general: {
    industry: "general",
    displayName: "General",
    requiredQualificationFields: ["name", "need"],
    bookingTriggerConditions: ["interest_confirmed"],
    faqAnswers: {},
    prohibitedClaims: [],
    handoffTriggers: ["complex questions", "angry caller"],
    qualificationHints: ["reason for the call", "what would a good outcome look like"],
    systemContext:
      "You handle inbound calls professionally: clarify needs, answer from tenant facts, move toward booking or callback when appropriate.",
  },
  smb: {
    industry: "smb",
    displayName: "General SMB",
    requiredQualificationFields: ["business type", "goal", "call volume or pain"],
    bookingTriggerConditions: ["interest_confirmed"],
    faqAnswers: {},
    prohibitedClaims: [],
    handoffTriggers: ["billing disputes you cannot verify", "legal threats"],
    qualificationHints: ["business type", "call volume", "goal"],
    systemContext:
      "You support small and mid-size businesses: missed calls, lead qualification, scheduling — stay practical and book demos when fit is clear.",
  },
  roofing: {
    industry: "roofing",
    displayName: "Roofing",
    requiredQualificationFields: ["zipCode", "issueType", "urgency"],
    bookingTriggerConditions: ["interest_confirmed", "service_area_confirmed"],
    faqAnswers: {},
    prohibitedClaims: ["insurance guarantee", "storm damage liability without inspection"],
    handoffTriggers: ["insurance fraud", "angry caller"],
    qualificationHints: ["storm damage", "roof age", "insurance claim status"],
    systemContext:
      "You help with roofing inquiries: leaks, replacement, storm damage — qualify safely and book inspections without promising insurance outcomes.",
    keyPhrases: ["shingles", "flashing", "decking", "estimate"],
  },
  hvac: {
    industry: "hvac",
    displayName: "HVAC",
    requiredQualificationFields: ["zipCode", "urgency", "system type"],
    bookingTriggerConditions: ["interest_confirmed"],
    faqAnswers: {},
    prohibitedClaims: [],
    handoffTriggers: ["gas leak emergency — direct to 911 if life safety"],
    qualificationHints: ["system age", "urgency", "repair vs replace"],
    systemContext:
      "You help with heating and cooling: comfort issues, maintenance, replacement — triage urgency; for emergencies, safety first.",
    keyPhrases: ["heat pump", "furnace", "AC", "refrigerant"],
  },
  insurance: {
    industry: "insurance",
    displayName: "Insurance",
    requiredQualificationFields: ["state", "coverage type", "renewal or new policy"],
    bookingTriggerConditions: ["interest_confirmed"],
    faqAnswers: {},
    prohibitedClaims: ["binding quote without license", "guaranteed claim payout"],
    handoffTriggers: ["licensed agent required", "claim dispute"],
    qualificationHints: ["state", "coverage type", "renewal"],
    systemContext:
      "You discuss insurance in general terms; licensed agents finalize coverage. No binding quotes unless tenant facts explicitly provide them.",
    keyPhrases: ["deductible", "premium", "policy", "rider"],
  },
  "real-estate": {
    industry: "real-estate",
    displayName: "Real Estate",
    requiredQualificationFields: ["intent", "area", "timeline"],
    bookingTriggerConditions: ["interest_confirmed"],
    faqAnswers: {},
    prohibitedClaims: ["guaranteed sale price", "undisclosed dual agency"],
    handoffTriggers: ["fair housing sensitive — careful neutrality", "request for licensed agent"],
    qualificationHints: ["buy vs sell", "timeline", "area"],
    systemContext:
      "You support real estate inquiries: buying, selling, tours — stay factual; escalate to a human agent for contracts and MLS specifics per tenant policy.",
    keyPhrases: ["listing", "showing", "closing", "MLS"],
  },
};

/** Keys we ship first-class — anything else resolves to adaptive universal. */
export const CURATED_INDUSTRY_KEYS = new Set(Object.keys(CURATED_DOMAIN_PACKS));

export function resolveDomainPack(rawIndustry: string, tenant?: TenantIndustryOverlay): DomainPack {
  const label = rawIndustry?.trim() || "general";
  const curatedKey = resolveCuratedPackKey(label);
  const curated = CURATED_DOMAIN_PACKS[curatedKey];
  let pack: DomainPack;
  if (curated) {
    pack = { ...curated, faqAnswers: { ...curated.faqAnswers } };
  } else {
    pack = {
      ...UNIVERSAL_PACK,
      industry: normalizeIndustryKey(label) || "universal",
      displayName: label,
      faqAnswers: {},
    };
  }

  if (tenant?.primaryIndustryLabel?.trim()) {
    pack = { ...pack, displayName: tenant.primaryIndustryLabel.trim() };
  }
  if (tenant?.customIndustryContext?.trim()) {
    const extra = tenant.customIndustryContext.trim();
    pack = {
      ...pack,
      systemContext: `${pack.systemContext}\n\nTENANT DOMAIN NOTES (authoritative — follow these over generic vertical guesses):\n${extra}`,
    };
  }
  if (tenant?.voiceKeyPhrases?.trim()) {
    const parts = tenant.voiceKeyPhrases
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    pack = {
      ...pack,
      keyPhrases: [...(pack.keyPhrases || []), ...parts],
      systemContext: `${pack.systemContext}\n\nTERMS / PHRASES TO FAVOR IN SPEECH AND RECOGNITION:\n${parts.join(", ")}`,
    };
  }
  if (tenant?.voiceRestrictionNotes?.trim()) {
    const r = tenant.voiceRestrictionNotes.trim();
    pack = {
      ...pack,
      restrictionNotes: [pack.restrictionNotes, r].filter(Boolean).join(" "),
      prohibitedClaims: [...pack.prohibitedClaims, `Tenant restriction: ${r}`],
    };
  }
  return pack;
}

/** Map ClientConfig / user row fields to overlay (voice + settings UI). */
export function tenantOverlayFromClientConfig(
  c?: Partial<{
    primaryIndustryLabel?: string;
    voiceIndustryContext?: string;
    voiceKeyPhrases?: string;
    voiceRestrictionNotes?: string;
  }>
): TenantIndustryOverlay | undefined {
  if (!c) return undefined;
  const o: TenantIndustryOverlay = {};
  if (c.primaryIndustryLabel?.trim()) o.primaryIndustryLabel = c.primaryIndustryLabel.trim();
  if (c.voiceIndustryContext?.trim()) o.customIndustryContext = c.voiceIndustryContext.trim();
  if (c.voiceKeyPhrases?.trim()) o.voiceKeyPhrases = c.voiceKeyPhrases.trim();
  if (c.voiceRestrictionNotes?.trim()) o.voiceRestrictionNotes = c.voiceRestrictionNotes.trim();
  return Object.keys(o).length ? o : undefined;
}

/** Compact block appended to voice system prompt. */
export function formatDomainPackForVoicePrompt(pack: DomainPack): string {
  const claims = pack.prohibitedClaims.length ? pack.prohibitedClaims.slice(0, 6).join("; ") : "none listed";
  const hints = pack.qualificationHints.slice(0, 5).join(", ");
  return `=== DOMAIN PACK (resolved) ===
VERTICAL LABEL: ${pack.displayName} (slug: ${pack.industry})
ROLE HINT: ${pack.actorsNote || "Infer caller role from conversation."}
QUALIFICATION HINTS: ${hints}
NEVER CLAIM / AVOID: ${claims}
DOMAIN GUIDANCE: ${pack.systemContext.slice(0, 1200)}${pack.systemContext.length > 1200 ? "…" : ""}`;
}
