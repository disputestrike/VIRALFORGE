import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  detectMessagingPhoneKind,
  resolveTenantMessagingStatus,
} from "./tenantMessagingStatus";

describe("tenantMessagingStatus", () => {
  const original10Dlc = process.env.SIGNALWIRE_10DLC_READY;
  const originalTollFree = process.env.SIGNALWIRE_TOLL_FREE_VERIFIED;

  beforeEach(() => {
    delete process.env.SIGNALWIRE_10DLC_READY;
    delete process.env.SIGNALWIRE_TOLL_FREE_VERIFIED;
  });

  afterEach(() => {
    if (original10Dlc === undefined) delete process.env.SIGNALWIRE_10DLC_READY;
    else process.env.SIGNALWIRE_10DLC_READY = original10Dlc;
    if (originalTollFree === undefined) delete process.env.SIGNALWIRE_TOLL_FREE_VERIFIED;
    else process.env.SIGNALWIRE_TOLL_FREE_VERIFIED = originalTollFree;
  });

  it("detects toll-free and local phone types", () => {
    expect(detectMessagingPhoneKind("+18336596005")).toBe("toll_free");
    expect(detectMessagingPhoneKind("+13055551212")).toBe("local");
    expect(detectMessagingPhoneKind("")).toBe("unknown");
  });

  it("surfaces toll-free verification guidance by default", () => {
    const status = resolveTenantMessagingStatus("+18336596005");
    expect(status.phoneKind).toBe("toll_free");
    expect(status.outboundSmsStatus).toBe("pending_toll_free_verification");
    expect(status.carrierApprovalRequired).toBe(true);
  });

  it("surfaces 10DLC guidance for local numbers by default", () => {
    const status = resolveTenantMessagingStatus("+13055551212");
    expect(status.phoneKind).toBe("local");
    expect(status.outboundSmsStatus).toBe("pending_10dlc");
    expect(status.inboundSmsReady).toBe(true);
  });
});
