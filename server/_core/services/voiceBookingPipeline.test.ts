import { describe, expect, it } from "vitest";
import { parseVoiceAppointmentDateTime } from "./voiceBookingPipeline";

describe("parseVoiceAppointmentDateTime", () => {
  it("parses ISO-like date+time", () => {
    const d = parseVoiceAppointmentDateTime("2026-04-15", "2:30 pm");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(15);
  });

  it("handles tomorrow + time", () => {
    const d = parseVoiceAppointmentDateTime("tomorrow", "3pm");
    expect(d.getTime()).toBeGreaterThan(Date.now());
  });
});
