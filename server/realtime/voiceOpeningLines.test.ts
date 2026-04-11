import { describe, expect, it } from "vitest";
import { selectInboundGreeting, selectOutboundIntro } from "./voiceOpeningLines";

describe("voiceOpeningLines", () => {
  it("stable per sessionId", () => {
    const a = selectInboundGreeting({
      businessName: "Acme Solar",
      sessionId: "sess_fixed_1",
      industryLabel: "Solar Energy",
    });
    const b = selectInboundGreeting({
      businessName: "Acme Solar",
      sessionId: "sess_fixed_1",
      industryLabel: "Solar Energy",
    });
    expect(a).toBe(b);
  });

  it("rotates across sessions", () => {
    const set = new Set<string>();
    for (let i = 0; i < 40; i++) {
      set.add(
        selectInboundGreeting({
          businessName: "Acme Solar",
          sessionId: `sess_${i}`,
          industryLabel: "Solar Energy",
        })
      );
    }
    expect(set.size).toBeGreaterThan(1);
  });

  it("outbound intro rotates", () => {
    const a = selectOutboundIntro({ businessName: "Bob HVAC", sessionId: "o1" });
    const b = selectOutboundIntro({ businessName: "Bob HVAC", sessionId: "o2" });
    expect(a.length).toBeGreaterThan(10);
    expect(b.length).toBeGreaterThan(10);
  });

  it("inbound greeting uses agentDisplayName instead of default Alex", () => {
    const g = selectInboundGreeting({
      businessName: "Peak Dental",
      sessionId: "sess_agent_name_1",
      industryLabel: "Dental",
      agentDisplayName: "Marie",
    });
    expect(g).toContain("Marie");
    expect(g).not.toMatch(/\bAlex\b/);
    expect(g).toContain("Peak Dental");
  });

  it("outbound intro uses agentDisplayName", () => {
    const g = selectOutboundIntro({
      businessName: "Coastal HVAC",
      sessionId: "out_agent_1",
      agentDisplayName: "Diego",
    });
    expect(g).toContain("Diego");
    expect(g).not.toMatch(/\bAlex\b/);
    expect(g).toContain("Coastal HVAC");
  });
});
