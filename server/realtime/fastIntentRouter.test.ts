import { describe, expect, it } from "vitest";
import { fastIntentFromInterim, optOutFromFinal, predictiveTurnFromInterim } from "./fastIntentRouter";

describe("fastIntentFromInterim", () => {
  it("detects semantic interrupt phrases", () => {
    const r = fastIntentFromInterim("wait wait I need to say something");
    expect(r.semanticInterrupt).toBe(true);
    expect(r.hints).toContain("semantic_interrupt");
  });

  it("ignores very short noise", () => {
    const r = fastIntentFromInterim("ok");
    expect(r.semanticInterrupt).toBe(false);
  });

  it("tags human request without semantic interrupt", () => {
    const r = fastIntentFromInterim("can I speak to a real person please");
    expect(r.semanticInterrupt).toBe(false);
    expect(r.hints).toContain("human_request");
  });
});

describe("optOutFromFinal", () => {
  it("detects do-not-call style phrases", () => {
    expect(optOutFromFinal("Please take me off your list")).toBe(true);
    expect(optOutFromFinal("stop calling this number")).toBe(true);
  });

  it("returns false for normal questions", () => {
    expect(optOutFromFinal("What hours are you open?")).toBe(false);
  });
});

describe("predictiveTurnFromInterim", () => {
  it("commits early for clear product questions", () => {
    const r = predictiveTurnFromInterim("what do you do for inbound and outbound calls", 0.97);
    expect(r.commitEarly).toBe(true);
    expect(r.hints).toContain("question_shape");
    expect(r.delayMs).toBeLessThanOrEqual(45);
  });

  it("does not commit early for short filler", () => {
    const r = predictiveTurnFromInterim("um okay", 0.99);
    expect(r.commitEarly).toBe(false);
  });

  it("does not commit early for generic half-finished questions", () => {
    const r = predictiveTurnFromInterim("can you help solar companies", 0.98);
    expect(r.commitEarly).toBe(true);
    expect(r.reason).toBe("industry_fit_question");
  });

  it("does not commit early for dead-air checks", () => {
    const r = predictiveTurnFromInterim("hello can you hear me", 0.99);
    expect(r.commitEarly).toBe(false);
  });

  it("does not commit early below confidence floor", () => {
    const r = predictiveTurnFromInterim("tell me what you can do for solar", 0.84);
    expect(r.commitEarly).toBe(false);
  });
});
