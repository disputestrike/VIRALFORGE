import { describe, expect, it } from "vitest";
import {
  createConversationState,
  isMeaningfulCanonicalQuestion,
  updateConvStateAfterAssistantTurn,
  updateConvStateAfterUserTurn,
} from "./conversationState";

describe("conversationState", () => {
  it("does not lock a vague first fragment as the canonical topic", () => {
    const state = createConversationState();
    const next = updateConvStateAfterUserTurn(
      state,
      "Can you tell me how",
      "STAY",
      "can you tell me how"
    );
    expect(next.canonical_user_question).toBeNull();
    expect(next.active_topic).toBeNull();
    expect(next.repeat_count).toBe(0);
  });

  it("locks the topic once the caller gives a real question", () => {
    let state = createConversationState();
    state = updateConvStateAfterUserTurn(
      state,
      "Can you tell me how",
      "STAY",
      "can you tell me how"
    );
    state = updateConvStateAfterUserTurn(
      state,
      "How do you help solar companies",
      "STAY",
      "how do you help solar companies"
    );
    expect(state.canonical_user_question).toBe("how do you help solar companies");
    expect(state.active_topic).toBe("solar company benefits");
    expect(state.repeat_count).toBe(0);
  });

  it("treats real vertical labels as meaningful topics", () => {
    expect(isMeaningfulCanonicalQuestion("education")).toBe(true);
    expect(isMeaningfulCanonicalQuestion("military")).toBe(true);
    expect(isMeaningfulCanonicalQuestion("much")).toBe(false);
  });

  it("marks a topic answered after a substantive direct answer with no follow-up question", () => {
    const state = updateConvStateAfterUserTurn(
      createConversationState(),
      "How can you help higher education?",
      "STAY",
      "how can you help higher education"
    );
    const next = updateConvStateAfterAssistantTurn(
      state,
      "ApexAI can handle admissions calls, financial aid questions, and student support without sounding robotic."
    );
    expect(next.topic_status).toBe("answered");
    expect(next.last_answer_summary).toContain("admissions calls");
  });
});
