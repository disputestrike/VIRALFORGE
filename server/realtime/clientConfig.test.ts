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

  it("mergeClientConfig keeps Apex FAQs for platform demo line", () => {
    const c = mergeClientConfig({ businessName: "ApexAI" });
    expect(c.faqAnswers.what_is).toContain("ApexAI");
  });
});
