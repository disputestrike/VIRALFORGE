import { describe, it, expect, vi, beforeEach } from "vitest";

const isPhoneBlocked = vi.fn();

vi.mock("../db", () => ({
  isPhoneBlocked,
}));

import { assertOutboundNotOnTenantBlocklist } from "./outboundBlocklist";

describe("assertOutboundNotOnTenantBlocklist", () => {
  beforeEach(() => {
    isPhoneBlocked.mockReset();
  });

  it("skips when userId missing", async () => {
    await assertOutboundNotOnTenantBlocklist(undefined, "+15551234567", true);
    expect(isPhoneBlocked).not.toHaveBeenCalled();
  });

  it("skips when check disabled", async () => {
    await assertOutboundNotOnTenantBlocklist(1, "+15551234567", false);
    expect(isPhoneBlocked).not.toHaveBeenCalled();
  });

  it("throws when number is blocked", async () => {
    isPhoneBlocked.mockResolvedValue(true);
    await expect(assertOutboundNotOnTenantBlocklist(1, "+15551234567", true)).rejects.toThrow(/blocklist/);
    expect(isPhoneBlocked).toHaveBeenCalled();
  });

  it("resolves when not blocked", async () => {
    isPhoneBlocked.mockResolvedValue(false);
    await expect(assertOutboundNotOnTenantBlocklist(1, "+15551234567", true)).resolves.toBeUndefined();
  });
});
