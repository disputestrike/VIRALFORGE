import { describe, expect, it } from "vitest";
import { fastIntentFromInterim, optOutFromFinal } from "./fastIntentRouter";

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
