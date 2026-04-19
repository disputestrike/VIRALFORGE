import { describe, expect, it } from "vitest";
import { buildIndustryFitAnswer } from "./industryFitAnswer";

describe("buildIndustryFitAnswer", () => {
  it("returns null when capability is not requested", () => {
    const result = buildIndustryFitAnswer({
      transcript: "what time is it",
      recentAssistantTexts: [],
    });
    expect(result).toBeNull();
  });

  it("generates a global non-solar answer for explicit industry requests", () => {
    const result = buildIndustryFitAnswer({
      transcript: "can you help hvac companies?",
      recentAssistantTexts: [],
    });
    expect(result).toContain("hvac");
    expect(result?.toLowerCase()).not.toContain("solar companies");
  });

  it("supports how-do-you-help phrasing", () => {
    const result = buildIndustryFitAnswer({
      transcript: "how do you help solar companies?",
      recentAssistantTexts: [],
    });
    expect(result?.toLowerCase()).toContain("solar");
  });

  it("uses fallback configured industry when transcript does not include one", () => {
    const result = buildIndustryFitAnswer({
      transcript: "what can you do",
      recentAssistantTexts: [],
      configuredIndustry: "plumbing",
    });
    expect(result?.toLowerCase()).toContain("plumbing");
  });

  it("returns null on repeat so the live controller can restate precisely", () => {
    const result = buildIndustryFitAnswer({
      transcript: "help legal businesses",
      recentAssistantTexts: [
        "ApexAI can support legal businesses with inbound calls, outbound follow-up, appointment setting, and SMS workflows.",
      ],
    });
    expect(result).toBeNull();
  });

  it("supports singular phrasing", () => {
    const result = buildIndustryFitAnswer({
      transcript: "can you help roofing business",
      recentAssistantTexts: [],
    });
    expect(result?.toLowerCase()).toContain("roofing");
  });

  it("ignores generic product-copy fallback labels", () => {
    const result = buildIndustryFitAnswer({
      transcript: "what can you do",
      recentAssistantTexts: [],
      configuredIndustry: "AI phone agent platform for inbound, outbound, booking, and SMS automation",
    });
    expect(result).toBeNull();
  });
});
