import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertLeadBulkCreateAllowed,
  assertLeadCreateAllowed,
  assertQueuedCallAllowance,
} from "./billingPolicy";

vi.mock("../../db", () => ({
  getUserById: vi.fn(),
  getCurrentMonthUsage: vi.fn(),
}));

import * as db from "../../db";

const mockedDb = db as unknown as {
  getUserById: ReturnType<typeof vi.fn>;
  getCurrentMonthUsage: ReturnType<typeof vi.fn>;
};

describe("billingPolicy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows lead create when trial user is under cap", async () => {
    mockedDb.getUserById.mockResolvedValue({ id: 7, plan: "trial" });
    mockedDb.getCurrentMonthUsage.mockResolvedValue({ leadsThisMonth: 99, callsThisMonth: 0 });

    await expect(assertLeadCreateAllowed(7)).resolves.toBeUndefined();
  });

  it("blocks lead create when trial user reached cap", async () => {
    mockedDb.getUserById.mockResolvedValue({ id: 7, plan: "trial" });
    mockedDb.getCurrentMonthUsage.mockResolvedValue({ leadsThisMonth: 100, callsThisMonth: 0 });

    await expect(assertLeadCreateAllowed(7)).rejects.toThrow(/PLAN_LIMIT_LEADS/);
  });

  it("blocks bulk lead create if additional leads exceed cap", async () => {
    mockedDb.getUserById.mockResolvedValue({ id: 9, plan: "starter" });
    mockedDb.getCurrentMonthUsage.mockResolvedValue({ leadsThisMonth: 490, callsThisMonth: 0 });

    await expect(assertLeadBulkCreateAllowed(9, 11)).rejects.toThrow(/PLAN_LIMIT_LEADS/);
  });

  it("allows enterprise queued calls without cap", async () => {
    mockedDb.getUserById.mockResolvedValue({ id: 11, plan: "enterprise" });
    mockedDb.getCurrentMonthUsage.mockResolvedValue({ leadsThisMonth: 50000, callsThisMonth: 50000 });

    await expect(assertQueuedCallAllowance(11, 1000)).resolves.toBeUndefined();
  });

  it("blocks queued calls when growth cap exceeded", async () => {
    mockedDb.getUserById.mockResolvedValue({ id: 13, plan: "growth" });
    mockedDb.getCurrentMonthUsage.mockResolvedValue({ leadsThisMonth: 0, callsThisMonth: 999 });

    await expect(assertQueuedCallAllowance(13, 2)).rejects.toThrow(/PLAN_LIMIT_CALLS/);
  });
});
