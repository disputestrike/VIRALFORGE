import { describe, expect, it } from "vitest";
import { BargeInClassifier } from "./bargeInClassifier";

describe("BargeInClassifier", () => {
  it("continues on explicit continue keywords", async () => {
    const classifier = new BargeInClassifier();
    const result = await classifier.predict(
      "We can handle inbound calls and book appointments for your team.",
      "go on"
    );
    expect(result.decision).toBe("CONTINUE");
  });

  it("pivots on fresh questions", async () => {
    const classifier = new BargeInClassifier();
    const result = await classifier.predict(
      "We can handle inbound calls and book appointments for your team.",
      "what about pricing?"
    );
    expect(result.decision).toBe("PIVOT");
  });

  it("falls back safely when no onnx model is present", async () => {
    const classifier = new BargeInClassifier();
    const result = await classifier.predict(
      "ApexAI can follow up with leads quickly.",
      "yes go on"
    );
    expect(["rules", "onnx"]).toContain(result.provider);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
  });
});
