import { describe, expect, it } from "vitest";
import { normalizeToE164US } from "./phoneE164";

/**
 * E.164-style normalization for US NANP numbers (BYOC / SMS / voice routing).
 * Contract: stable output for common human-entered formats.
 */
describe("normalizeToE164US", () => {
  it("normalizes 10-digit US to +1", () => {
    expect(normalizeToE164US("4155552671")).toBe("+14155552671");
    expect(normalizeToE164US("(415) 555-2671")).toBe("+14155552671");
  });

  it("preserves leading 1 for 11-digit national", () => {
    expect(normalizeToE164US("14155552671")).toBe("+14155552671");
    expect(normalizeToE164US("+1 415 555 2671")).toBe("+14155552671");
  });

  it("returns empty for blank input", () => {
    expect(normalizeToE164US("")).toBe("");
    expect(normalizeToE164US("   ")).toBe("");
  });

  it("passes through explicit + international when digits are long enough", () => {
    expect(normalizeToE164US("+44 20 7946 0958")).toMatch(/^\+/);
  });
});
