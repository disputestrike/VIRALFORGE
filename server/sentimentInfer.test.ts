import { describe, it, expect } from "vitest";
import { inferSentimentFromTranscript } from "./_core/services/sentimentInfer";

describe("inferSentimentFromTranscript", () => {
  it("returns neutral for empty", () => {
    expect(inferSentimentFromTranscript("")).toBe("neutral");
    expect(inferSentimentFromTranscript(null)).toBe("neutral");
  });

  it("detects positive tone", () => {
    expect(
      inferSentimentFromTranscript(
        "Lead: Yes I am interested. AI: Great. Lead: Thanks schedule me for Tuesday."
      )
    ).toBe("positive");
  });

  it("detects negative tone", () => {
    expect(
      inferSentimentFromTranscript("Lead: No I'm not interested. Stop calling. Cancel everything.")
    ).toBe("negative");
  });

  it("neutral when balanced", () => {
    expect(inferSentimentFromTranscript("Lead: Hello. AI: Hello.")).toBe("neutral");
  });

  it("weights not interested toward negative", () => {
    expect(inferSentimentFromTranscript("Actually I'm not interested, thanks anyway.")).toBe("negative");
  });

  it("weights do not call toward negative", () => {
    expect(inferSentimentFromTranscript("Please don't call this number again.")).toBe("negative");
  });
});
