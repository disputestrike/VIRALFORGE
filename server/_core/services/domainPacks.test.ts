import { describe, expect, it } from "vitest";
import {
  CURATED_INDUSTRY_KEYS,
  formatDomainPackForVoicePrompt,
  normalizeIndustryKey,
  resolveDomainPack,
  tenantOverlayFromClientConfig,
} from "./domainPacks";

describe("domainPacks", () => {
  it("normalizes industry strings to slug keys", () => {
    expect(normalizeIndustryKey("  Solar Energy! ")).toBe("solar-energy");
    expect(normalizeIndustryKey("")).toBe("general");
  });

  it("maps multi-word slugs to curated head token (solar-energy → solar)", () => {
    const p = resolveDomainPack("Solar Energy");
    expect(p.industry).toBe("solar");
    expect(p.displayName).toBe("Solar Energy");
  });

  it("resolves curated solar pack", () => {
    const p = resolveDomainPack("solar");
    expect(p.industry).toBe("solar");
    expect(p.qualificationHints.length).toBeGreaterThan(0);
    expect(CURATED_INDUSTRY_KEYS.has("solar")).toBe(true);
  });

  it("adapts unknown verticals with universal base and display name", () => {
    const p = resolveDomainPack("Underwater Welding Services");
    expect(p.displayName).toBe("Underwater Welding Services");
    expect(p.systemContext.toLowerCase()).toContain("any industry");
    expect(formatDomainPackForVoicePrompt(p)).toContain("VERTICAL LABEL");
  });

  it("merges tenant overlay into pack", () => {
    const p = resolveDomainPack("retail", {
      customIndustryContext: "We only sell certified organic feed.",
      voiceKeyPhrases: "Non-GMO, NOP certified",
      voiceRestrictionNotes: "Never promise delivery dates.",
    });
    expect(p.systemContext).toContain("TENANT DOMAIN NOTES");
    expect(p.systemContext).toContain("organic feed");
    expect(p.prohibitedClaims.some((c) => c.includes("delivery dates"))).toBe(true);
  });

  it("tenantOverlayFromClientConfig maps client fields", () => {
    const o = tenantOverlayFromClientConfig({
      voiceIndustryContext: "Test",
      primaryIndustryLabel: "X",
    });
    expect(o?.customIndustryContext).toBe("Test");
    expect(o?.primaryIndustryLabel).toBe("X");
  });
});
