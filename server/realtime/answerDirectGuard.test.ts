import { describe, expect, it } from "vitest";
import {
  answeredDirectly,
  includesConcreteOutcome,
  isAnswerSufficient,
  postProcessAssistantResponse,
} from "./answerDirectGuard";

describe("includesConcreteOutcome", () => {
  it("detects concrete signals", () => {
    expect(includesConcreteOutcome("Plans start at $99 per month.")).toBe(true);
    expect(includesConcreteOutcome("We are here to help you succeed.")).toBe(false);
  });
});

describe("answeredDirectly", () => {
  it("detects price alignment", () => {
    expect(
      answeredDirectly("What's the price?", "Our plans start at ninety-nine a month for most teams.")
    ).toBe(true);
  });

  it("flags missing topic overlap", () => {
    expect(
      answeredDirectly("What's the price?", "Great question. What industry are you in?")
    ).toBe(false);
  });
});

describe("isAnswerSufficient", () => {
  it("requires concrete outcome for questions", () => {
    const ok = isAnswerSufficient(
      "Apex answers every inbound call instantly and books qualified leads on your calendar.",
      "What do you do?",
      "core_explain"
    );
    expect(ok).toBe(true);
  });
});

describe("postProcessAssistantResponse", () => {
  it("strips follow-up when not answered", () => {
    const r = postProcessAssistantResponse(
      "What's the price?",
      "We help with calls. Would you like to book a demo?",
      "pricing"
    );
    expect(r.askedFollowupBeforeAnswer || r.strippedFollowUp).toBe(true);
    expect(r.text.toLowerCase()).not.toMatch(/would you like/);
  });
});
