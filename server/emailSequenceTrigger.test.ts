import { describe, it, expect } from "vitest";
import { applyEmailSequenceTemplate } from "./_core/services/emailSequenceTrigger";

describe("applyEmailSequenceTemplate", () => {
  it("replaces known placeholders", () => {
    expect(
      applyEmailSequenceTemplate("Hi {{firstName}} — {{company}}", {
        firstName: "A",
        company: "B",
        lastName: "",
        email: "",
        phone: "",
      })
    ).toBe("Hi A — B");
  });
});
