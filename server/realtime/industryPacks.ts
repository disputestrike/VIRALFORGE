/**
 * Back-compat shim — canonical definitions live in server/_core/services/domainPacks.ts
 */

import {
  resolveDomainPack,
  normalizeIndustryKey,
  type DomainPack,
} from "../_core/services/domainPacks";

export type IndustryPack = {
  id: string;
  label: string;
  qualificationHints: string[];
  bookingTriggerFields: string[];
  prohibitedClaims: string[];
};

function toSlim(p: DomainPack): IndustryPack {
  return {
    id: p.industry,
    label: p.displayName,
    qualificationHints: p.qualificationHints,
    bookingTriggerFields: p.bookingTriggerConditions,
    prohibitedClaims: p.prohibitedClaims,
  };
}

/** @deprecated Use resolveDomainPack from domainPacks for full pack + tenant overlay */
export const INDUSTRY_PACKS: Record<string, IndustryPack> = {};

export function getIndustryPack(industryKey: string): IndustryPack {
  return toSlim(resolveDomainPack(industryKey));
}

export { normalizeIndustryKey, resolveDomainPack, type DomainPack };
