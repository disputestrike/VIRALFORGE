import { describe, expect, it } from "vitest";
import { createCallState } from "./callPolicy";
import {
  buildVoiceSystemPrompt,
  createConversationQualityState,
  detectCustomerMomentum,
  trackAssistantPhrase,
  computeRepetitionScore,
  isResponseRepetitive,
} from "./dynamicPrompt";
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

  it("injects momentum block when frustrated", () => {
    const s = createCallState();
    const out = buildVoiceSystemPrompt(s, "Acme Solar", "solar", baseClient, {
      momentum: "frustrated",
    });
    expect(out).toContain("FRUSTRATED");
    expect(out).toContain("end the call gracefully");
  });

  it("injects phrase-ban block when recent phrases provided", () => {
    const s = createCallState();
    const out = buildVoiceSystemPrompt(s, "Acme Solar", "solar", baseClient, {
      recentAssistantPhrases: ["i'll go ahead and check on the promotions"],
    });
    expect(out).toContain("PHRASE VARIATION");
    expect(out).toContain("i'll go ahead and check on the promotions");
  });

  it("does not inject momentum block when neutral", () => {
    const s = createCallState();
    const out = buildVoiceSystemPrompt(s, "Acme Solar", "solar", baseClient, {
      momentum: "neutral",
    });
    expect(out).not.toContain("CALLER MOMENTUM");
  });
});

describe("detectCustomerMomentum", () => {
  it("detects frustration from 'go away'", () => {
    const state = createConversationQualityState();
    const next = detectCustomerMomentum("go away", state);
    expect(next.momentum).toBe("frustrated");
    expect(next.frustrationCount).toBe(1);
  });

  it("detects frustration from repeated no", () => {
    const state = createConversationQualityState();
    const next = detectCustomerMomentum("no no no", state);
    expect(next.momentum).toBe("frustrated");
  });

  it("detects disengagement from 'not right now'", () => {
    const state = createConversationQualityState();
    const next = detectCustomerMomentum("not right now", state);
    expect(next.momentum).toBe("neutral"); // first disengagement = neutral, not yet disengaging
    expect(next.disengagementCount).toBe(1);
  });

  it("transitions to disengaging after two disengagement signals", () => {
    let state = createConversationQualityState();
    state = detectCustomerMomentum("not right now", state);
    state = detectCustomerMomentum("maybe later", state);
    expect(state.momentum).toBe("disengaging");
  });

  it("detects engagement from positive signals", () => {
    const state = createConversationQualityState();
    const next = detectCustomerMomentum("yes, sounds good, let's do it", state);
    expect(next.momentum).toBe("engaged");
  });

  it("lowers engagement score on frustration", () => {
    const state = createConversationQualityState();
    const next = detectCustomerMomentum("go away", state);
    expect(next.engagementScore).toBeLessThan(state.engagementScore);
  });
});

describe("repetition detection", () => {
  it("returns 0 for first response", () => {
    const state = createConversationQualityState();
    expect(computeRepetitionScore(state, "I'll check on the promotions for your area")).toBe(0);
  });

  it("detects high repetition for near-identical responses", () => {
    let state = createConversationQualityState();
    const phrase = "I'll go ahead and check on the promotions for your area right now";
    state = trackAssistantPhrase(state, phrase);
    const score = computeRepetitionScore(state, phrase);
    expect(score).toBeGreaterThan(0.4);
  });

  it("isResponseRepetitive returns true for repeated phrase", () => {
    let state = createConversationQualityState();
    const phrase = "I'll go ahead and check on the promotions for your area right now";
    state = trackAssistantPhrase(state, phrase);
    expect(isResponseRepetitive(state, phrase)).toBe(true);
  });

  it("isResponseRepetitive returns false for different phrase", () => {
    let state = createConversationQualityState();
    state = trackAssistantPhrase(state, "I'll go ahead and check on the promotions for your area");
    expect(isResponseRepetitive(state, "What industry are you in?")).toBe(false);
  });

  it("keeps only last 5 phrases", () => {
    let state = createConversationQualityState();
    for (let i = 0; i < 7; i++) {
      state = trackAssistantPhrase(state, `phrase number ${i}`);
    }
    expect(state.recentPhrases.length).toBe(5);
  });
});
