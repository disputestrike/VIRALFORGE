import { describe, expect, it } from "vitest";
import { createCallState } from "./callPolicy";
import { buildVoiceSystemPrompt } from "./dynamicPrompt";
import { mergeClientConfig } from "./clientConfig";

const baseClient = mergeClientConfig({
  serviceAreas: ["20008"],
  discountsLine: "10% off first visit",
});

describe("buildVoiceSystemPrompt", () => {
  it("includes business name, industry, mode, and booking policy", () => {
    const s = createCallState();
    const out = buildVoiceSystemPrompt(s, "Acme Solar", "solar", baseClient);
    expect(out).toContain("Acme Solar");
    expect(out).toContain("solar");
    expect(out).toContain("CURRENT MODE");
    expect(out).toContain("BOOKING POLICY");
    expect(out).toContain("20008");
    expect(out).toContain("MANDATORY COMPANY FACTS");
    expect(out).toContain("fast, sharp, professional AI phone assistant");
    expect(out).toContain("acknowledge");
    expect(out).toContain("answer");
    expect(out).toContain("guide");
    expect(out).not.toContain("2-3 sentences MAX");
  });
});
