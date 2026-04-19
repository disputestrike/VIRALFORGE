import { describe, expect, it } from "vitest";
import {
  createCallState,
  updateCallState,
  markQuestionAnswered,
  detectUserQuestion,
  canOfferBooking,
  detectEndCallIntent,
  detectLiveTransferIntent,
  inferUtteranceIntent,
  blueprintPhaseToConversationMode,
} from "./callPolicy";

describe("callPolicy", () => {
  it("starts with no answered question — first turn should favor answer mode", () => {
    const s = createCallState();
    expect(s.questionAnswered).toBe(false);
  });

  it("detects end call", () => {
    expect(detectEndCallIntent("no thanks")).toBe(true);
    expect(detectEndCallIntent("No. Have a good day.")).toBe(true);
    expect(detectEndCallIntent("I want to buy")).toBe(false);
  });

  it("detects user question and blocks booking until answered", () => {
    let s = createCallState();
    s = updateCallState(s, "Do you serve zip code 20008?");
    expect(s.questionAnswered).toBe(false);
    expect(detectUserQuestion("Do you serve zip code 20008?")).toBe(true);
    expect(canOfferBooking(s)).toBe(false);
  });

  it("detects live transfer intent", () => {
    expect(detectLiveTransferIntent("can I talk to a human")).toBe(true);
    expect(detectLiveTransferIntent("what is your pricing")).toBe(false);
  });

  it("infers utterance intent", () => {
    expect(inferUtteranceIntent("I'm done")).toBe("end_call");
    expect(inferUtteranceIntent("talk to someone")).toBe("live_transfer");
    expect(inferUtteranceIntent("how much does it cost")).toBe("question");
  });

  it("allows booking only after question answered and interest confirmed", () => {
    let s = createCallState();
    s = updateCallState(s, "Tell me about pricing");
    s = markQuestionAnswered(s);
    expect(canOfferBooking(s)).toBe(false);
    s = updateCallState(s, "Yes I'm interested");
    s = markQuestionAnswered(s);
    s = { ...s, interestConfirmed: true, bookingAllowed: true, questionAnswered: true };
    expect(canOfferBooking(s)).toBe(true);
  });

  it("maps blueprint conversation phases to runtime modes", () => {
    expect(blueprintPhaseToConversationMode("discovery")).toBe("qualify");
    expect(blueprintPhaseToConversationMode("value_delivery")).toBe("recommend");
    expect(blueprintPhaseToConversationMode("escalation")).toBe("handoff");
    expect(blueprintPhaseToConversationMode("end")).toBe("close");
  });
});
