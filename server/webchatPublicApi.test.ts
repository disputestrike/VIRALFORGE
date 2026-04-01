import { describe, it, expect } from "vitest";
import { isWebchatOriginAllowed } from "./_core/webchatPublicApi";

describe("isWebchatOriginAllowed", () => {
  it("allows any origin when list empty", () => {
    expect(isWebchatOriginAllowed(null, "https://a.com")).toBe(true);
    expect(isWebchatOriginAllowed("", "https://evil.com")).toBe(true);
  });

  it("allows exact match", () => {
    expect(isWebchatOriginAllowed("https://shop.example", "https://shop.example")).toBe(true);
  });

  it("rejects when origin not listed", () => {
    expect(isWebchatOriginAllowed("https://shop.example", "https://other.com")).toBe(false);
  });
});
