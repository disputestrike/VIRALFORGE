import { describe, expect, it } from "vitest";
import { buildVoiceQaScorecard, parseTranscriptToTurns } from "./callQualityTagger";

describe("voice QA scorecard", () => {
  it("parses plain transcript text into turns", () => {
    const turns = parseTranscriptToTurns(
      "Caller: Hi there\nAI: Thanks for calling. How can I help?\nCustomer: We keep missing calls.\nAssistant: Got it. About how many per day?"
    );
    expect(turns).toHaveLength(4);
    expect(turns[0]).toEqual({ role: "user", content: "Hi there" });
    expect(turns[1]).toEqual({ role: "assistant", content: "Thanks for calling. How can I help?" });
  });

  it("scores a clean sales call as strong or elite with no failures", () => {
    const qa = buildVoiceQaScorecard([
      { role: "user", content: "We keep missing calls and losing leads." },
      { role: "assistant", content: "Got it. That can hurt conversion fast. About how many calls are slipping through each day?" },
      { role: "user", content: "Maybe ten a day." },
      { role: "assistant", content: "That is meaningful volume. We can answer those calls, qualify them, and book the right next step. Want a quick demo or pricing first?" },
    ]);

    expect(qa.failures).toHaveLength(0);
    expect(qa.score).toBeGreaterThanOrEqual(88);
    expect(["strong", "elite"]).toContain(qa.grade);
  });

  it("flags harsh tone and stacked questions in weak transcripts", () => {
    const qa = buildVoiceQaScorecard([
      { role: "user", content: "Are you even real?" },
      { role: "assistant", content: "I'm an AI line - here for quick answers. What do you want? What are you trying to do?" },
      { role: "user", content: "You sound rude." },
      { role: "assistant", content: "Let's keep things professional! What industry are you in? What size team? What are you selling?" },
    ]);

    const codes = qa.failures.map((failure) => failure.code);
    expect(codes).toContain("harsh_tone");
    expect(codes).toContain("stacked_questions");
    expect(qa.score).toBeLessThan(75);
    expect(qa.grade).toBe("weak");
  });

  it("downgrades duplicate lines and stall acknowledgments", () => {
    const qa = buildVoiceQaScorecard([
      { role: "user", content: "Tell me about ApexAI." },
      { role: "assistant", content: "One moment." },
      { role: "assistant", content: "One moment." },
      { role: "user", content: "Hello? Hello?" },
      { role: "assistant", content: "I'm here." },
      { role: "assistant", content: "I'm here." },
    ]);

    const codes = qa.failures.map((failure) => failure.code);
    expect(codes).toContain("duplicate_assistant_line");
    expect(codes).toContain("stall_ack_overuse");
    expect(qa.grade).toBe("weak");
  });
});
