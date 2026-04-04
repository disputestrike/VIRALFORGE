import { describe, expect, it } from "vitest";
import {
  answeredDirectly,
  includesConcreteOutcome,
  isAnswerSufficient,
  isGeneralKnowledgeStyleQuestion,
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

  it("does not require sales-style concrete outcome for general-knowledge questions", () => {
    const answer =
      "The president is the elected head of state, serving a four-year term. I don't have live election results on this phone line, but I can explain how the office works.";
    expect(includesConcreteOutcome(answer)).toBe(false);
    expect(
      isAnswerSufficient(answer, "Who is the president of the United States?", "unknown")
    ).toBe(true);
  });

  it("accepts paraphrased general-knowledge answers without keyword overlap", () => {
    const answer =
      "The office is held by the person elected in the most recent national election. I can go deeper on policy or history if you want.";
    expect(includesConcreteOutcome(answer)).toBe(false);
    expect(
      isAnswerSufficient(answer, "Who is the president of the United States?", "unknown")
    ).toBe(true);
  });
});

describe("isGeneralKnowledgeStyleQuestion", () => {
  it("classifies world-fact questions", () => {
    expect(isGeneralKnowledgeStyleQuestion("Who is the president?")).toBe(true);
    expect(isGeneralKnowledgeStyleQuestion("What is the capital of Texas?")).toBe(true);
  });
  it("does not classify pricing as general knowledge", () => {
    expect(isGeneralKnowledgeStyleQuestion("How much does it cost per month?")).toBe(false);
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

  it("strips spoken meta-labels like Here's the direct answer", () => {
    const r = postProcessAssistantResponse(
      "What do you do?",
      "Here's the direct answer: Apex answers every inbound call and books qualified leads on your calendar.",
      "core_explain"
    );
    expect(r.text.toLowerCase()).not.toMatch(/^here'?s (the )?(direct )?answer/);
    expect(r.text).toMatch(/apex|inbound|calendar/i);
  });
});
