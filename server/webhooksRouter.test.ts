import { afterEach, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function makePublicCtx(headers: Record<string, string> = {}): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers, ip: "127.0.0.1" } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("webhooks.omniAiLead", () => {
  const prevSecret = process.env.WEBHOOK_SECRET;

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.WEBHOOK_SECRET;
    else process.env.WEBHOOK_SECRET = prevSecret;
  });

  it("creates a lead when WEBHOOK_SECRET is unset", async () => {
    delete process.env.WEBHOOK_SECRET;
    const caller = appRouter.createCaller(makePublicCtx());
    const r = await caller.webhooks.omniAiLead({
      firstName: "Omni",
      lastName: "Test",
      leadId: "ext-webhook-1",
      email: "omni@test.com",
    });
    expect(r).toMatchObject({ success: true, leadId: expect.any(Number) });
  });

  it("returns unauthorized when secret is required but wrong", async () => {
    process.env.WEBHOOK_SECRET = "expected-secret";
    const caller = appRouter.createCaller(makePublicCtx({}));
    const r = await caller.webhooks.omniAiLead({
      firstName: "Omni",
      lastName: "Test",
      leadId: "ext-webhook-2",
    });
    expect(r).toEqual({ success: false, error: "Unauthorized" });
  });

  it("accepts x-webhook-secret when WEBHOOK_SECRET is set", async () => {
    process.env.WEBHOOK_SECRET = "expected-secret";
    const caller = appRouter.createCaller(
      makePublicCtx({ "x-webhook-secret": "expected-secret" })
    );
    const r = await caller.webhooks.omniAiLead({
      firstName: "Omni",
      lastName: "Ok",
      leadId: "ext-webhook-3",
    });
    expect(r).toMatchObject({ success: true, leadId: expect.any(Number) });
  });
});
