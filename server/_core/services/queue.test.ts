import { describe, expect, it } from "vitest";
import { addAutomationJob, getQueueHealth } from "./queue";

describe("queue health", () => {
  it("reports memory mode and pending growth when Redis is unavailable", async () => {
    const originalRedisUrl = process.env.REDIS_URL;
    delete process.env.REDIS_URL;

    const before = await getQueueHealth();
    await addAutomationJob({
      action: "lead.created",
      userId: 1,
      payload: { leadId: 999001, firstName: "Test", lastName: "Lead" },
    });
    const after = await getQueueHealth();

    if (originalRedisUrl !== undefined) {
      process.env.REDIS_URL = originalRedisUrl;
    }

    expect(before.mode).toBe("memory");
    expect(after.mode).toBe("memory");
    expect(after.pendingJobs).toBeGreaterThanOrEqual(before.pendingJobs + 1);
    expect(Number(after.byType?.automation ?? 0)).toBeGreaterThanOrEqual(1);
  });
});
