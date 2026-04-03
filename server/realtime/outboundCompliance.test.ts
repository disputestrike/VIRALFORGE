import { describe, expect, it } from "vitest";
import { assertOutboundDialAllowed, isHourInAllowWindow, parseAllowHoursWindow } from "./outboundCompliance";

describe("parseAllowHoursWindow", () => {
  it("parses same-day window", () => {
    expect(parseAllowHoursWindow("8-21")).toEqual({ start: 8, end: 21 });
  });

  it("returns null for empty", () => {
    expect(parseAllowHoursWindow(undefined)).toBeNull();
  });
});

describe("isHourInAllowWindow", () => {
  it("same-day", () => {
    expect(isHourInAllowWindow(10, 8, 21)).toBe(true);
    expect(isHourInAllowWindow(7, 8, 21)).toBe(false);
    expect(isHourInAllowWindow(21, 8, 21)).toBe(false);
  });

  it("overnight", () => {
    expect(isHourInAllowWindow(23, 22, 6)).toBe(true);
    expect(isHourInAllowWindow(3, 22, 6)).toBe(true);
    expect(isHourInAllowWindow(10, 22, 6)).toBe(false);
  });
});

describe("assertOutboundDialAllowed", () => {
  it("no env does not throw", () => {
    expect(() => assertOutboundDialAllowed(undefined)).not.toThrow();
  });
});
