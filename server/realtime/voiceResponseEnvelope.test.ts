import { describe, expect, it } from "vitest";
import { tryExtractJsonSpokenText } from "./voiceResponseEnvelope";

describe("tryExtractJsonSpokenText", () => {
  it("extracts spoken_text from JSON object", () => {
    const r = tryExtractJsonSpokenText(`{"spoken_text":"Hello there."}`);
    expect(r).toBe("Hello there.");
  });

  it("handles fenced markdown", () => {
    const r = tryExtractJsonSpokenText("```json\n{\"spoken_text\":\"OK\"}\n```");
    expect(r).toBe("OK");
  });

  it("returns null for prose", () => {
    expect(tryExtractJsonSpokenText("Just say this plainly.")).toBeNull();
  });
});
