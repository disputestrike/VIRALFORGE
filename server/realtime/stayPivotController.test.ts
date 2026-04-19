import { describe, expect, it } from "vitest";
import { createConversationState } from "./conversationState";
import {
  canonicalizeUtterance,
  decideStayOrPivot,
  detectFrustration,
} from "./stayPivotController";

describe("stayPivotController", () => {
  it("treats repetition complaints as frustration", () => {
    expect(detectFrustration("Stop repeating yourself")).toBe(true);
    expect(detectFrustration("Can you go one at a time")).toBe(true);
  });

  it("does not append the active topic onto short fragments", () => {
    const state = {
      ...createConversationState(),
      active_topic: "solar company benefits",
    };
    expect(canonicalizeUtterance("much", state)).toBe("much");
  });

  it("pivots on a short explicit domain change instead of forcing STAY", () => {
    const state = {
      ...createConversationState(),
      hard_no_reset: true,
      active_topic: "higher education fit",
      canonical_user_question: "how can you help higher education",
      topic_status: "answered" as const,
    };

    expect(decideStayOrPivot("the military?", state, false)).toBe("PIVOT");
    expect(decideStayOrPivot("solar?", state, false)).toBe("PIVOT");
  });
});
