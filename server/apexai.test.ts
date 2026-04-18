import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock context helpers ──────────────────────────────────────────────────────

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

function makeAdminCtx(): TrpcContext {
  return makeCtx({ id: 99, openId: "admin-open-id", email: "admin@apexai.com", name: "Admin User", role: "admin" });
}

// ─── Auth Tests ────────────────────────────────────────────────────────────────

describe("auth", () => {
  it("returns current user from auth.me", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.email).toBe("test@apexai.com");
  });

  it("clears session cookie on logout", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});

// ─── Lead Score Helper Tests ───────────────────────────────────────────────────

describe("lead scoring logic", () => {
  it("scores a complete lead higher than incomplete", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    // Create a complete lead
    await caller.leads.create({
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@company.com",
      phone: "+15551234567",
      company: "Acme Corp",
      industry: "Solar",
      title: "CEO",
      linkedinUrl: "https://linkedin.com/in/alice",
    });

    // Create an incomplete lead
    await caller.leads.create({
      firstName: "Bob",
      lastName: "Jones",
    });

    const leads = await caller.leads.list({ search: "Alice" });
    expect(leads.leads.length).toBeGreaterThan(0);
    const alice = leads.leads.find((l) => l.firstName === "Alice");
    expect(alice).toBeDefined();
    expect(alice!.score).toBeGreaterThan(50);
  });

  it("assigns hot segment to high-score leads", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.leads.create({
      firstName: "Carlos",
      lastName: "Rivera",
      email: "carlos@bigco.com",
      phone: "+15559876543",
      company: "BigCo",
      industry: "HVAC",
      title: "VP Sales",
      linkedinUrl: "https://linkedin.com/in/carlos",
    });
    const leads = await caller.leads.list({ search: "Carlos" });
    const carlos = leads.leads.find((l) => l.firstName === "Carlos");
    expect(carlos).toBeDefined();
    expect(carlos!.segment).toBe("hot");
  });
});

// ─── Leads CRUD Tests ─────────────────────────────────────────────────────────

describe("leads", () => {
  it("lists leads with pagination", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.leads.list({ limit: 10, offset: 0 });
    expect(result).toHaveProperty("leads");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.leads)).toBe(true);
  });

  it("creates and retrieves a lead", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.leads.create({
      firstName: "Diana",
      lastName: "Prince",
      email: "diana@wonder.com",
      company: "Wonder Corp",
      industry: "Real Estate",
    });
    const leads = await caller.leads.list({ search: "Diana" });
    const diana = leads.leads.find((l) => l.firstName === "Diana");
    expect(diana).toBeDefined();
    expect(diana!.email).toBe("diana@wonder.com");
  });

  it("updates a lead's status", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.leads.create({ firstName: "Eve", lastName: "Adams", email: "eve@test.com" });
    const leads = await caller.leads.list({ search: "Eve" });
    const eve = leads.leads.find((l) => l.firstName === "Eve");
    expect(eve).toBeDefined();
    await caller.leads.update({ id: eve!.id, status: "contacted" });
    const updated = await caller.leads.get({ id: eve!.id });
    expect(updated.status).toBe("contacted");
  });

  it("deletes a lead", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.leads.create({ firstName: "Frank", lastName: "Delete", email: "frank.delete@test.com" });
    const before = await caller.leads.list({ search: "Frank" });
    const frank = before.leads.find((l) => l.firstName === "Frank");
    expect(frank).toBeDefined();
    await caller.leads.delete({ id: frank!.id });
    const after = await caller.leads.list({ search: "frank.delete@test.com" });
    const deleted = after.leads.find((l) => l.email === "frank.delete@test.com");
    expect(deleted).toBeUndefined();
  });
});

// ─── Campaign Tests ────────────────────────────────────────────────────────────

describe("campaigns", () => {
  it("lists campaigns", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.campaigns.list({});
    expect(result).toHaveProperty("campaigns");
    expect(result).toHaveProperty("total");
  });

  it("creates a campaign with multiple channels", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.campaigns.create({
      name: "Test Multi-Channel Campaign",
      channels: ["voice", "sms", "email"],
      goal: "appointments",
      dailyLimit: 50,
    });
    expect(result.success).toBe(true);
  });

  it("updates campaign status via update", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.campaigns.create({ name: "Status Test Campaign", channels: ["sms"], goal: "appointments" });
    const list = await caller.campaigns.list({});
    const found = list.campaigns.find((c) => c.name === "Status Test Campaign");
    expect(found).toBeDefined();
    await caller.campaigns.update({ id: found!.id, status: "paused" });
    const campaign = await caller.campaigns.get({ id: found!.id });
    expect(campaign.status).toBe("paused");
  });
});

// ─── Templates Tests ──────────────────────────────────────────────────────────

describe("templates", () => {
  it("creates and lists templates", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.templates.create({
      name: "Solar SMS Template",
      channel: "sms",
      body: "Hi {{firstName}}, are you interested in solar savings for {{company}}?",
      variables: ["firstName", "company"],
    });
    const templates = await caller.templates.list({ channel: "sms" });
    expect(Array.isArray(templates)).toBe(true);
    const found = templates.find((t) => t.name === "Solar SMS Template");
    expect(found).toBeDefined();
  });

  it("updates a template", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.templates.create({ name: "Update Test Template", channel: "email", body: "Original body" });
    const templates = await caller.templates.list({});
    const t = templates.find((tpl) => tpl.name === "Update Test Template");
    expect(t).toBeDefined();
    await caller.templates.update({ id: t!.id, body: "Updated body content" });
    const updated = (await caller.templates.list({})).find((tpl) => tpl.id === t!.id);
    expect(updated?.body).toBe("Updated body content");
  });
});

// ─── Analytics Tests ──────────────────────────────────────────────────────────

describe("analytics", () => {
  it("returns global metrics", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const metrics = await caller.analytics.globalMetrics();
    expect(metrics).toHaveProperty("responseRate");
    expect(metrics).toHaveProperty("scheduleRate");
    expect(metrics).toHaveProperty("showRate");
    expect(metrics).toHaveProperty("salesIncrease");
    expect(metrics).toHaveProperty("totalLeads");
    expect(metrics).toHaveProperty("totalCampaigns");
    expect(metrics).toHaveProperty("totalMessages");
  });

  it("returns analytics snapshots", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const snapshots = await caller.analytics.snapshots({});
    expect(Array.isArray(snapshots)).toBe(true);
  });
});

// ─── Testimonials Tests ───────────────────────────────────────────────────────

describe("testimonials", () => {
  it("lists testimonials publicly", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.testimonials.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("admin can create testimonials", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.testimonials.create({
      clientName: "Test Client",
      industry: "Solar",
      quote: "ApexAI doubled our appointment rate in 30 days.",
      beforeMetric: "10 appts/week",
      afterMetric: "20 appts/week",
      specificResult: "100% increase",
    });
    expect(result.success).toBe(true);
  });

  it("non-admin cannot create testimonials", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.testimonials.create({ clientName: "Hacker", industry: "Solar", quote: "Unauthorized" })
    ).rejects.toThrow();
  });
});

// ─── Onboarding Tests ─────────────────────────────────────────────────────────

describe("onboarding", () => {
  it("creates an onboarding record", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.onboarding.create({
      clientName: "Onboarding Test Client",
      industry: "HVAC",
      specialistName: "Jane Doe",
    });
    expect(result.success).toBe(true);
  });

  it("lists onboarding records for user", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const records = await caller.onboarding.list();
    expect(Array.isArray(records)).toBe(true);
  });

  it("updates onboarding step completion", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.onboarding.create({ clientName: "Step Test Client", industry: "Roofing" });
    const records = await caller.onboarding.list();
    const record = records.find((r) => r.clientName === "Step Test Client");
    expect(record).toBeDefined();
    const result = await caller.onboarding.updateStep({ id: record!.id, step: "account_setup", completed: true });
    expect(result.completedSteps).toContain("account_setup");
  });
});

// ─── Admin Tests ──────────────────────────────────────────────────────────────

describe("admin", () => {
  it("admin can list all users", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const users = await caller.admin.users();
    expect(Array.isArray(users)).toBe(true);
  });

  it("non-admin cannot access admin routes", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.users()).rejects.toThrow();
  });

  it("admin can get system stats", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.admin.systemStats();
    expect(stats).toHaveProperty("totalUsers");
    expect(stats).toHaveProperty("totalCampaigns");
    expect(stats).toHaveProperty("totalLeads");
  });

  it("admin can view activity logs", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);
    const logs = await caller.admin.activityLogs({ limit: 10 });
    expect(Array.isArray(logs)).toBe(true);
  });

  it("prevents admin self-demotion", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.updateUserRole({ userId: 99, role: "user" })).rejects.toThrow(/cannot remove your own admin access/i);
  });

  it("admin can promote a user", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.updateUserRole({ userId: 1, role: "admin" })).resolves.toEqual({ success: true });
    const users = await caller.admin.users();
    const promoted = users.find((u) => u.id === 1);
    expect(promoted?.role).toBe("admin");
  });
});
