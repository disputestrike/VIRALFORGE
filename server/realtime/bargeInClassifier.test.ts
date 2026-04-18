import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BargeInClassifier } from "./bargeInClassifier";
import { ENV } from "../_core/env";

vi.mock("onnxruntime-node", () => {
  class Tensor {
    type: string;
    data: BigInt64Array;
    dims: number[];
    constructor(type: string, data: BigInt64Array, dims: number[]) {
      this.type = type;
      this.data = data;
      this.dims = dims;
    }
  }

  return {
    InferenceSession: {
      create: vi.fn(async () => ({
        run: vi.fn(async () => ({
          logits: { data: new Float32Array([0.1, 0.9]) },
        })),
      })),
    },
    Tensor,
  };
});

const ORIGINAL_ENV = {
  voiceBargeInClassifierEnabled: ENV.voiceBargeInClassifierEnabled,
  voiceBargeInClassifierRequireModel: ENV.voiceBargeInClassifierRequireModel,
  voiceBargeInClassifierModelPath: ENV.voiceBargeInClassifierModelPath,
  voiceBargeInClassifierTokenizerPath: ENV.voiceBargeInClassifierTokenizerPath,
};

afterEach(async () => {
  ENV.voiceBargeInClassifierEnabled = ORIGINAL_ENV.voiceBargeInClassifierEnabled;
  ENV.voiceBargeInClassifierRequireModel = ORIGINAL_ENV.voiceBargeInClassifierRequireModel;
  ENV.voiceBargeInClassifierModelPath = ORIGINAL_ENV.voiceBargeInClassifierModelPath;
  ENV.voiceBargeInClassifierTokenizerPath = ORIGINAL_ENV.voiceBargeInClassifierTokenizerPath;

  const testModelPath = path.resolve(process.cwd(), "server/models/test-bargein-classifier.onnx");
  try {
    await fs.unlink(testModelPath);
  } catch {
    // ignore cleanup errors
  }
});

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
    ENV.voiceBargeInClassifierEnabled = true;
    ENV.voiceBargeInClassifierRequireModel = false;
    ENV.voiceBargeInClassifierModelPath = "server/models/does-not-exist.onnx";
    const classifier = new BargeInClassifier();
    const result = await classifier.predict(
      "ApexAI can follow up with leads quickly.",
      "yes go on"
    );
    expect(result.provider).toBe("rules");
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it("uses ONNX provider when model path is available", async () => {
    const testModelPath = path.resolve(process.cwd(), "server/models/test-bargein-classifier.onnx");
    await fs.writeFile(testModelPath, "fake-model", "utf8");

    ENV.voiceBargeInClassifierEnabled = true;
    ENV.voiceBargeInClassifierRequireModel = false;
    ENV.voiceBargeInClassifierModelPath = "server/models/test-bargein-classifier.onnx";

    const classifier = new BargeInClassifier();
    const result = await classifier.predict(
      "We can handle inbound calls and book appointments for your team.",
      "go on"
    );
    expect(result.provider).toBe("onnx");
    expect(result.decision).toBe("PIVOT");
  });

  it("logs strict warning when ONNX strict mode is enabled but model is missing", async () => {
    ENV.voiceBargeInClassifierEnabled = true;
    ENV.voiceBargeInClassifierRequireModel = true;
    ENV.voiceBargeInClassifierModelPath = "server/models/missing-required-model.onnx";
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const classifier = new BargeInClassifier();
    await classifier.predict(
      "ApexAI can follow up with leads quickly.",
      "yes go on"
    );

    expect(errSpy).toHaveBeenCalledOnce();
    errSpy.mockRestore();
  });
});
