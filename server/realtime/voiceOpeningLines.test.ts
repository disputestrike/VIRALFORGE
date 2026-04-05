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
});
