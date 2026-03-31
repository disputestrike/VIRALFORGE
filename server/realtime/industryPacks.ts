/**
 * industryPacks.ts — universal engine + per-vertical facts (no solar hardcoded in engine)
 */

export type IndustryPack = {
  id: string;
  label: string;
  qualificationHints: string[];
  bookingTriggerFields: string[];
  prohibitedClaims: string[];
};

export const INDUSTRY_PACKS: Record<string, IndustryPack> = {
  solar: {
    id: "solar",
    label: "Solar",
    qualificationHints: ["monthly electric bill", "homeowner", "roof condition", "utility"],
    bookingTriggerFields: ["zipCode", "interest"],
    prohibitedClaims: ["guaranteed savings amount without audit"],
  },
  roofing: {
    id: "roofing",
    label: "Roofing",
    qualificationHints: ["storm damage", "roof age", "insurance"],
    bookingTriggerFields: ["zipCode", "issueType"],
    prohibitedClaims: ["insurance guarantee"],
  },
  hvac: {
    id: "hvac",
    label: "HVAC",
    qualificationHints: ["system age", "urgency", "repair vs replace"],
    bookingTriggerFields: ["zipCode", "urgency"],
    prohibitedClaims: [],
  },
  insurance: {
    id: "insurance",
    label: "Insurance",
    qualificationHints: ["state", "coverage type", "renewal"],
    bookingTriggerFields: ["state", "productLine"],
    prohibitedClaims: ["binding quote without license"],
  },
  "real-estate": {
    id: "real-estate",
    label: "Real Estate",
    qualificationHints: ["buy vs sell", "timeline", "area"],
    bookingTriggerFields: ["intent", "area"],
    prohibitedClaims: [],
  },
  smb: {
    id: "smb",
    label: "General SMB",
    qualificationHints: ["business type", "call volume", "goal"],
    bookingTriggerFields: ["interest"],
    prohibitedClaims: [],
  },
};

export function getIndustryPack(industryKey: string): IndustryPack {
  const k = industryKey.toLowerCase().replace(/\s+/g, "-");
  return INDUSTRY_PACKS[k] ?? INDUSTRY_PACKS.smb;
}
