import { describe, it, expect } from "vitest";
import {
  chunkText,
  cosineSimilarity,
  extractBrandingFromHtml,
} from "./_core/services/knowledgeBaseIngestion";

describe("knowledgeBaseIngestion", () => {
  it("extracts og branding from HTML", () => {
    const html = `<!DOCTYPE html><html><head>
      <title>Acme Corp</title>
      <meta property="og:title" content="Acme — Best Solar" />
      <meta property="og:description" content="We install panels." />
      <meta name="theme-color" content="#10b981" />
      <meta property="og:image" content="/logo.png" />
    </head><body><p>Hi</p></body></html>`;
    const b = extractBrandingFromHtml(html, "https://acme.com/page");
    expect(b.title).toContain("Acme");
    expect(b.description).toContain("panels");
    expect(b.primaryColor).toBe("#10b981");
    expect(b.logoUrl).toContain("logo.png");
  });

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
