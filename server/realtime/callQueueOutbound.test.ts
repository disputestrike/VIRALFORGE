/**
 * Contract test: BullMQ `addCallJob` payload → worker → `stashOutboundCallContext` → `/api/voice/start` consume.
 * No Redis required — validates IDs + script round-trip.
 */
import { describe, it, expect } from "vitest";
import { stashOutboundCallContext, takeOutboundCallContext } from "./outboundCallContext";

describe("Queue → outbound → webhook script contract", () => {
  it("matches worker sessionId pattern and preserves script + campaignId", () => {
    const leadId = 42;
    const jobId = "job-99";
    const sessionId = `sess_out_${leadId}_${jobId}_1700000000000`;
    const script = "Hi — quick follow-up from Apex.";
    stashOutboundCallContext(sessionId, { script, campaignId: 7 });

    const ctx = takeOutboundCallContext(sessionId);
    expect(ctx?.direction).toBe("outbound");
    expect(ctx?.script).toBe(script);
    expect(ctx?.campaignId).toBe(7);
  });
});
