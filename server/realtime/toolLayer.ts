/**
 * toolLayer.ts — deterministic lookups (agent speaks facts, does not invent)
 */

import type { ClientConfig } from "./clientConfig";
import { getIndustryPack } from "./industryPacks";

const ZIP_RE = /\b\d{5}(?:-\d{4})?\b/;

export function lookupServiceAreaSpoken(zip: string | undefined, config: ClientConfig): string {
  if (!zip) return "I did not catch a ZIP code. What ZIP should I check?";
  const areas = config.serviceAreas;
  if (!areas.length) {
    return `For ${zip}, we can confirm coverage with a quick question or book a callback. Would you like that?`;
  }
  const normalized = zip.replace(/\D/g, "").slice(0, 5);
  const served = areas.some((a) => a.replace(/\D/g, "").includes(normalized) || normalized.includes(a.replace(/\D/g, "")));
  if (served) {
    return `Yes, we serve the ${zip} area.`;
  }
  return `I do not show ${zip} in the published service list I have. I can take a message or offer a quick consult to verify.`;
}

export function lookupDiscountsSpoken(config: ClientConfig): string {
  if (config.discountsLine?.trim()) {
    return config.discountsLine.trim();
  }
  return "Promotions vary by area and eligibility. I can have someone confirm what applies to you.";
}

export function extractZipFromTranscript(text: string): string | undefined {
  const m = text.match(ZIP_RE);
  return m ? m[0] : undefined;
}

export function industryQualificationHint(industryKey: string): string {
  const pack = getIndustryPack(industryKey);
  return pack.qualificationHints.slice(0, 3).join(", ");
}
