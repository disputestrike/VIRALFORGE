import { describe, expect, it } from "vitest";
import { speakableLine, rewriteForSpeech } from "./speakability";

describe("speakableLine", () => {
  it("expands abbreviations", () => {
    expect(speakableLine("ETA is 5 PM")).toMatch(/E\.T\.A\./i);
    expect(speakableLine("ASAP please")).toMatch(/as soon as possible/i);
  });

  it("normalizes dollars", () => {
    expect(speakableLine("Cost is $50")).toContain("dollars");
  });

  it("rewriteForSpeech aliases speakableLine", () => {
    expect(rewriteForSpeech("ASAP")).toContain("soon");
  });
});
