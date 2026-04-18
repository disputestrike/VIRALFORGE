import { describe, expect, it } from "vitest";
import {
  assertOutboundDialAllowed,
  getOutboundComplianceDelayMs,
  isHourInAllowWindow,
  parseAllowHoursWindow,
} from "./outboundCompliance";

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

describe("getOutboundComplianceDelayMs", () => {
  it("returns 0 when currently allowed", () => {
    const now = new Date("2026-04-18T10:15:00");
    expect(getOutboundComplianceDelayMs(now, "8-21")).toBe(0);
  });

  it("returns delay until next same-day window start", () => {
    const now = new Date("2026-04-18T07:15:00");
    expect(getOutboundComplianceDelayMs(now, "8-21")).toBe(45 * 60 * 1000);
  });

  it("returns delay until next-day window start when window closed for day", () => {
    const now = new Date("2026-04-18T21:15:00");
    expect(getOutboundComplianceDelayMs(now, "8-21")).toBe(10 * 60 * 60 * 1000 + 45 * 60 * 1000);
  });
});
