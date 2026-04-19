import { describe, expect, it } from "vitest";
import { createConversationState } from "./conversationState";
import { canonicalizeUtterance, detectFrustration } from "./stayPivotController";

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
});
