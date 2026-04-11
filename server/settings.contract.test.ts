/**
 * Contract tests: settings BYOC + voice agent name (in-memory DB mock from vitest.setup).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("./_core/services/voiceProfiles", async (importOriginal) => {
  const mod = await importOriginal<typeof import("./_core/services/voiceProfiles")>();
  return {
    ...mod,
    /** Global db mock has no Drizzle `select`; settings.get still merges voice defaults. */
    getUserVoiceSettings: vi.fn().mockResolvedValue({ voiceProfileId: "cartesia-sarah-sales" }),
  };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function makeCtx(overrides: Partial<TrpcContext["user"]> = {}): TrpcContext {
  const clearedCookies: unknown[] = [];
  return {
    user: {
      id: 1,
      openId: "test-user-open-id",
      email: "test@apexai.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...overrides,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (_name: string, _opts: unknown) => clearedCookies.push({ _name, _opts }),
    } as TrpcContext["res"],
  };
}

/** Deterministic NANP-style DID for this suite (mock store resets each test). */
const BYOC_TEST_PHONE = "+16282249901";

describe("CONTRACT: settings BYOC + voice agent name", () => {
  const caller = appRouter.createCaller(makeCtx());

  it("registerOwnPhoneNumber inserts BYOC row, normalizes E.164, second call is alreadyLinked", async () => {
    const r = await caller.settings.registerOwnPhoneNumber({
      phone: "6282249901",
      friendlyName: "contract-test-byoc",
    });
    expect(r.phoneNumber).toBe(BYOC_TEST_PHONE);
    expect(r.insertId).toBeGreaterThan(0);
    expect(r.alreadyLinked).toBe(false);

    const list = await caller.settings.listPhoneNumbers();
    const row = list.find((p) => p.phoneNumber === r.phoneNumber);
    expect(row).toBeDefined();
    expect(String(row?.friendlyName ?? "")).toContain("contract-test");

    const r2 = await caller.settings.registerOwnPhoneNumber({
      phone: BYOC_TEST_PHONE,
      friendlyName: "second-call",
    });
    expect(r2.alreadyLinked).toBe(true);
    expect(r2.phoneNumber).toBe(BYOC_TEST_PHONE);
  });

  it("settings.update persists voiceAgentDisplayName for settings.get", async () => {
    const tag = `Contract${Date.now().toString(36)}`;
    await caller.settings.update({ voiceAgentDisplayName: tag });
    const row = await caller.settings.get();
    expect((row as { voiceAgentDisplayName?: string | null }).voiceAgentDisplayName).toBe(tag);
    await caller.settings.update({ voiceAgentDisplayName: null });
    const cleared = await caller.settings.get();
    expect((cleared as { voiceAgentDisplayName?: string | null }).voiceAgentDisplayName).toBeNull();
  });
});

describe("CONTRACT: settings BYOC validation", () => {
  it("rejects phone that is too short (input schema)", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.settings.registerOwnPhoneNumber({ phone: "1234567" })).rejects.toThrow();
  });
});
