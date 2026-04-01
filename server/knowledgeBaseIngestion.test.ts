import { describe, it, expect } from "vitest";
import { chunkText, cosineSimilarity } from "./_core/services/knowledgeBaseIngestion";

describe("knowledgeBaseIngestion", () => {
  it("chunks long text with overlap", () => {
    const t = "word ".repeat(400);
    const c = chunkText(t, 200, 40);
    expect(c.length).toBeGreaterThan(1);
    expect(c.every((x) => x.length <= 250)).toBe(true);
  });

  it("cosine similarity identical vectors", () => {
    const v = [1, 0, 0];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it("cosine similarity orthogonal", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });
});
