import { describe, expect, it } from "vitest";
import { isApexPlatformDemoLine, mergeClientConfig } from "./clientConfig";

describe("clientConfig", () => {
  it("isApexPlatformDemoLine matches only platform branding", () => {
    expect(isApexPlatformDemoLine("ApexAI")).toBe(true);
    expect(isApexPlatformDemoLine("Apex A I")).toBe(true);
    expect(isApexPlatformDemoLine("Apex AI")).toBe(true);
    expect(isApexPlatformDemoLine("Acme Solar")).toBe(false);
    expect(isApexPlatformDemoLine("Apex Roofing")).toBe(false);
  });

  it("mergeClientConfig drops default Apex FAQs for tenant business names", () => {
    const c = mergeClientConfig({ businessName: "Joe's HVAC", industry: "hvac" });
    expect(Object.keys(c.faqAnswers).length).toBe(0);
  });

  it("mergeClientConfig only keeps explicitly supplied FAQs for platform demo line", () => {
    const c = mergeClientConfig({ businessName: "ApexAI", faqAnswers: { demo: "Book a live walkthrough." } });
    expect(c.faqAnswers.demo).toContain("live walkthrough");
    expect(Object.keys(c.faqAnswers)).toHaveLength(1);
  });

  it("mergeClientConfig carries voiceAgentDisplayName for voice prompts", () => {
    const c = mergeClientConfig({
      businessName: "Joe's HVAC",
      industry: "hvac",
      voiceAgentDisplayName: "Priya",
    });
    expect(c.voiceAgentDisplayName).toBe("Priya");
  });

  it("mergeClientConfig can overlay tenant fields without dropping agent name", () => {
    const first = mergeClientConfig({
      businessName: "A",
      industry: "x",
      voiceAgentDisplayName: "Taylor",
      voiceKeyPhrases: "R-22",
    });
    const second = mergeClientConfig({
      ...first,
      voiceRestrictionNotes: "No medical claims.",
    });
    expect(second.voiceAgentDisplayName).toBe("Taylor");
    expect(second.voiceKeyPhrases).toBe("R-22");
    expect(second.voiceRestrictionNotes).toBe("No medical claims.");
  });
});
