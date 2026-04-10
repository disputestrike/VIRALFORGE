import { describe, expect, it } from "vitest";
import { classifyTurn } from "./classifyTurn";

describe("classifyTurn", () => {
  it("classifies demo requests separately from booking interest", () => {
    const result = classifyTurn("Can you show me a quick demo of how this works?");
    expect(result.intent).toBe("demo_request");
    expect(result.asksForBooking).toBe(false);
  });

  it("classifies support-style problem statements as support requests", () => {
    const result = classifyTurn("I need help, the system isn't working and keeps throwing an error");
    expect(result.intent).toBe("support_request");
    expect(result.containsConfusion).toBe(false);
  });

  it("still recognizes explicit booking language", () => {
    const result = classifyTurn("Let's schedule a call for tomorrow afternoon");
    expect(result.intent).toBe("booking_interest");
    expect(result.asksForBooking).toBe(true);
  });
});
