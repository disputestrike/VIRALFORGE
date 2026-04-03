import { describe, expect, it } from "vitest";
import { stashOutboundCallContext, takeOutboundCallContext } from "./outboundCallContext";

describe("outboundCallContext", () => {
  it("stash then take consumes once", () => {
    const sid = "test_sess_" + Date.now();
    stashOutboundCallContext(sid, { script: "Hi from campaign", campaignId: 1 });
    const a = takeOutboundCallContext(sid);
    expect(a?.script).toBe("Hi from campaign");
    expect(a?.campaignId).toBe(1);
    expect(takeOutboundCallContext(sid)).toBeUndefined();
  });
});
