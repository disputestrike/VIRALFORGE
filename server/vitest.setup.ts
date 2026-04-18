/**
 * Vitest global setup — mocks the DB module and LLM so tests run without external deps.
 */

import { vi, beforeEach } from "vitest";
import { normalizeToE164US } from "./_core/phoneE164";

// ─── Mock LLM (invokeLLM) ─────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  isLlmConfigured: vi.fn().mockReturnValue(true),
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: "MOCK SCRIPT: Opening - Hi, this is Alex from TestCo. Value Prop - We help businesses grow. Objection Handling - I understand your concerns. Close - Can we schedule a demo?",
          role: "assistant",
        },
      },
    ],
  }),
}));

// ─── In-memory stores ─────────────────────────────────────────────────────────

let _leads: Record<string, unknown>[] = [];
let _campaigns: Record<string, unknown>[] = [];
let _templates: Record<string, unknown>[] = [];
let _testimonials: Record<string, unknown>[] = [];
let _messages: Record<string, unknown>[] = [];
let _callRecordings: Record<string, unknown>[] = [];
let _onboardings: Record<string, unknown>[] = [];
let _analyticsSnapshots: Record<string, unknown>[] = [];
let _activityLogs: Record<string, unknown>[] = [];
let _systemConfig: Record<string, unknown>[] = [];
let _campaignContacts: Record<string, unknown>[] = [];
let _users: Record<string, unknown>[] = [];
let _userPhoneNumbers: Record<string, unknown>[] = [];
let _idCounters: Record<string, number> = {};

function nextId(table: string) {
  _idCounters[table] = (_idCounters[table] ?? 0) + 1;
  return _idCounters[table];
}

function resetStores() {
  _leads = [];
  _campaigns = [];
  _templates = [];
  _testimonials = [];
  _messages = [];
  _callRecordings = [];
  _onboardings = [];
  _analyticsSnapshots = [];
  _activityLogs = [];
  _systemConfig = [];
  _campaignContacts = [];
  _idCounters = {};
  _userPhoneNumbers = [];
  _users = [
    { id: 1, openId: "test-user-open-id", name: "Test User", email: "test@apexai.com", role: "user", loginMethod: "manus", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), voiceAgentDisplayName: null },
    { id: 99, openId: "admin-open-id", name: "Admin User", email: "admin@apexai.com", role: "admin", loginMethod: "manus", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), voiceAgentDisplayName: null },
  ];
}

// ─── Mock the db module ───────────────────────────────────────────────────────

vi.mock("./db", () => buildMock());

function buildMock() {
  return {
    getDb: vi.fn().mockResolvedValue({}),

    upsertUser: vi.fn().mockImplementation(async (user: Record<string, unknown>) => {
      const existing = _users.find((u) => u.openId === user.openId);
      if (!existing) _users.push({ id: nextId("users"), createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), ...user });
    }),

    getUserByOpenId: vi.fn().mockImplementation(async (openId: string) =>
      _users.find((u) => u.openId === openId) ?? null
    ),

    getAllUsers: vi.fn().mockImplementation(async () => _users),

    getUserById: vi.fn().mockImplementation(async (id: number) => _users.find((u) => u.id === id) ?? undefined),

    getCurrentMonthUsage: vi
      .fn()
      .mockImplementation(async (_userId: number) => ({ leadsThisMonth: 0, callsThisMonth: 0 })),

    updateUserById: vi.fn().mockImplementation(async (userId: number, patch: Record<string, unknown>) => {
      const u = _users.find((x) => x.id === userId);
      if (!u) throw new Error("Database not available");
      for (const [k, v] of Object.entries(patch)) {
        if (v !== undefined) (u as Record<string, unknown>)[k] = v;
      }
      u.updatedAt = new Date();
    }),

    updateUserRole: vi.fn().mockImplementation(async (userId: number, role: string) => {
      const u = _users.find((u) => u.id === userId);
      if (u) u.role = role;
    }),

    // ─── Leads ───────────────────────────────────────────────────────────────
    getLeads: vi.fn().mockImplementation(async (opts?: Record<string, unknown>) => {
      let result = [..._leads];
      if (opts?.search) {
        const q = String(opts.search).toLowerCase();
        result = result.filter((l) =>
          String(l.firstName ?? "").toLowerCase().includes(q) ||
          String(l.lastName ?? "").toLowerCase().includes(q) ||
          String(l.email ?? "").toLowerCase().includes(q) ||
          String(l.company ?? "").toLowerCase().includes(q)
        );
      }
      if (opts?.segment) result = result.filter((l) => l.segment === opts.segment);
      if (opts?.status) result = result.filter((l) => l.status === opts.status);
      if (opts?.verificationStatus) result = result.filter((l) => l.verificationStatus === opts.verificationStatus);
      const offset = Number(opts?.offset ?? 0);
      const limit = Number(opts?.limit ?? 50);
      return { leads: result.slice(offset, offset + limit), total: result.length };
    }),

    getLeadById: vi.fn().mockImplementation(async (id: number) =>
      _leads.find((l) => l.id === id) ?? null
    ),

    createLead: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
      const id = nextId("leads");
      const lead = { id, status: "new", verificationStatus: "pending", score: 0, segment: "cold", createdAt: new Date(), updatedAt: new Date(), ...data };
      _leads.push(lead);
      return { insertId: id };
    }),

    updateLead: vi.fn().mockImplementation(async (id: number, data: Record<string, unknown>) => {
      const idx = _leads.findIndex((l) => l.id === id);
      if (idx !== -1) _leads[idx] = { ..._leads[idx], ...data, updatedAt: new Date() };
    }),

    deleteLead: vi.fn().mockImplementation(async (id: number) => {
      _leads = _leads.filter((l) => l.id !== id);
    }),

    // ─── Campaigns ───────────────────────────────────────────────────────────
    getCampaigns: vi.fn().mockImplementation(async (opts?: Record<string, unknown>) => {
      let result = [..._campaigns];
      if (opts?.status) result = result.filter((c) => c.status === opts.status);
      const offset = Number(opts?.offset ?? 0);
      const limit = Number(opts?.limit ?? 50);
      return { campaigns: result.slice(offset, offset + limit), total: result.length };
    }),

    getCampaignById: vi.fn().mockImplementation(async (id: number) =>
      _campaigns.find((c) => c.id === id) ?? null
    ),

    createCampaign: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
      const id = nextId("campaigns");
      const c = { id, status: "draft", goal: "appointments", totalContacts: 0, sentCount: 0, responseCount: 0, scheduledCount: 0, showCount: 0, convertedCount: 0, revenueGenerated: 0, createdAt: new Date(), updatedAt: new Date(), ...data };
      _campaigns.push(c);
      return [{ insertId: id }];
    }),

    updateCampaign: vi.fn().mockImplementation(async (id: number, data: Record<string, unknown>) => {
      const idx = _campaigns.findIndex((c) => c.id === id);
      if (idx !== -1) _campaigns[idx] = { ..._campaigns[idx], ...data, updatedAt: new Date() };
    }),

    deleteCampaign: vi.fn().mockImplementation(async (id: number) => {
      _campaigns = _campaigns.filter((c) => c.id !== id);
    }),

    // ─── Campaign Contacts ────────────────────────────────────────────────────
    getCampaignContacts: vi.fn().mockImplementation(async (campaignId: number) =>
      _campaignContacts.filter((cc) => cc.campaignId === campaignId)
    ),

    addContactToCampaign: vi.fn().mockImplementation(async (campaignId: number, leadId: number) => {
      const exists = _campaignContacts.find((cc) => cc.campaignId === campaignId && cc.leadId === leadId);
      if (exists) throw new Error("Contact already in campaign");
      const id = nextId("campaignContacts");
      _campaignContacts.push({ id, campaignId, leadId, status: "pending", createdAt: new Date(), updatedAt: new Date() });
      return [{ insertId: id }];
    }),

    removeContactFromCampaign: vi.fn().mockImplementation(async (campaignId: number, leadId: number) => {
      _campaignContacts = _campaignContacts.filter((cc) => !(cc.campaignId === campaignId && cc.leadId === leadId));
    }),

    updateCampaignContactStatus: vi.fn().mockImplementation(async (id: number, status: string) => {
      const idx = _campaignContacts.findIndex((cc) => cc.id === id);
      if (idx !== -1) _campaignContacts[idx].status = status;
    }),

    // ─── Messages ─────────────────────────────────────────────────────────────
    getMessages: vi.fn().mockImplementation(async (opts?: Record<string, unknown>) => {
      let result = [..._messages];
      if (opts?.campaignId) result = result.filter((m) => m.campaignId === opts.campaignId);
      if (opts?.leadId) result = result.filter((m) => m.leadId === opts.leadId);
      if (opts?.channel) result = result.filter((m) => m.channel === opts.channel);
      return result;
    }),

    createMessage: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
      const id = nextId("messages");
      _messages.push({ id, status: "queued", direction: "outbound", createdAt: new Date(), ...data });
      return [{ insertId: id }];
    }),

    updateMessageStatus: vi.fn().mockImplementation(async (id: number, status: string) => {
      const idx = _messages.findIndex((m) => m.id === id);
      if (idx !== -1) _messages[idx].status = status;
    }),

    // ─── Call Recordings ──────────────────────────────────────────────────────
    getCallRecordings: vi.fn().mockImplementation(async () => [..._callRecordings]),

    createCallRecording: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
      const id = nextId("callRecordings");
      _callRecordings.push({ id, createdAt: new Date(), calledAt: new Date(), ...data });
      return [{ insertId: id }];
    }),

    // ─── Templates ───────────────────────────────────────────────────────────
    getTemplates: vi.fn().mockImplementation(async (channel?: string) => {
      let result = _templates.filter((t) => !t.deletedAt);
      if (channel) result = result.filter((t) => t.channel === channel);
      return result;
    }),

    createTemplate: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
      const id = nextId("templates");
      _templates.push({ id, isActive: true, createdAt: new Date(), updatedAt: new Date(), ...data });
      return [{ insertId: id }];
    }),

    updateTemplate: vi.fn().mockImplementation(async (id: number, data: Record<string, unknown>) => {
      const idx = _templates.findIndex((t) => t.id === id);
      if (idx !== -1) _templates[idx] = { ..._templates[idx], ...data, updatedAt: new Date() };
    }),

    deleteTemplate: vi.fn().mockImplementation(async (id: number) => {
      const idx = _templates.findIndex((t) => t.id === id);
      if (idx !== -1) _templates[idx].deletedAt = new Date();
    }),

    // ─── Analytics ────────────────────────────────────────────────────────────
    getAnalyticsSnapshots: vi.fn().mockImplementation(async () => [..._analyticsSnapshots]),

    getGlobalMetrics: vi.fn().mockResolvedValue({
      responseRate: 0,
      scheduleRate: 0,
      showRate: 0,
      salesIncrease: 0,
      totalLeads: 0,
      totalCampaigns: 0,
      totalMessages: 0,
      totalRevenue: 0,
      totalAppointments: 0,
    }),

    createAnalyticsSnapshot: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
      _analyticsSnapshots.push({ id: nextId("analyticsSnapshots"), createdAt: new Date(), date: new Date(), ...data });
    }),

    // ─── Testimonials ─────────────────────────────────────────────────────────
    getTestimonials: vi.fn().mockImplementation(async (featuredOnly?: boolean) => {
      let result = _testimonials.filter((t) => !t.deletedAt && t.isActive !== false);
      if (featuredOnly) result = result.filter((t) => t.featured);
      return result;
    }),

    createTestimonial: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
      const id = nextId("testimonials");
      _testimonials.push({ id, isActive: true, featured: false, sortOrder: 0, createdAt: new Date(), updatedAt: new Date(), ...data });
    }),

    updateTestimonial: vi.fn().mockImplementation(async (id: number, data: Record<string, unknown>) => {
      const idx = _testimonials.findIndex((t) => t.id === id);
      if (idx !== -1) _testimonials[idx] = { ..._testimonials[idx], ...data, updatedAt: new Date() };
    }),

    deleteTestimonial: vi.fn().mockImplementation(async (id: number) => {
      const idx = _testimonials.findIndex((t) => t.id === id);
      if (idx !== -1) _testimonials[idx].deletedAt = new Date();
    }),

    // ─── Onboarding ───────────────────────────────────────────────────────────
    getOnboardings: vi.fn().mockImplementation(async (userId?: number) => {
      if (userId !== undefined) return _onboardings.filter((o) => o.userId === userId);
      return [..._onboardings];
    }),

    createOnboarding: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
      const id = nextId("onboardings");
      _onboardings.push({ id, status: "not_started", completedSteps: "[]", createdAt: new Date(), updatedAt: new Date(), ...data });
      return [{ insertId: id }];
    }),

    updateOnboarding: vi.fn().mockImplementation(async (id: number, data: Record<string, unknown>) => {
      const idx = _onboardings.findIndex((o) => o.id === id);
      if (idx !== -1) _onboardings[idx] = { ..._onboardings[idx], ...data, updatedAt: new Date() };
    }),

    // ─── Activity Log ─────────────────────────────────────────────────────────
    logActivity: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
      _activityLogs.push({ id: nextId("activityLogs"), createdAt: new Date(), ...data });
    }),

    getActivityLogs: vi.fn().mockImplementation(async () => [..._activityLogs]),

    // ─── System Config ────────────────────────────────────────────────────────
    getSystemConfig: vi.fn().mockImplementation(async () => [..._systemConfig]),

    setSystemConfig: vi.fn().mockImplementation(async (key: string, value: string, category = "general") => {
      const idx = _systemConfig.findIndex((c) => c.key === key);
      if (idx !== -1) _systemConfig[idx] = { ..._systemConfig[idx], value, category, updatedAt: new Date() };
      else _systemConfig.push({ id: nextId("systemConfig"), key, value, category, updatedAt: new Date() });
    }),

    // ─── Integrations (Zapier / lead scoring) ─────────────────────────────────
    getDefaultLeadScoringRule: vi.fn().mockResolvedValue(null),
    getZapierWebhook: vi.fn().mockResolvedValue(null),
    upsertZapierWebhook: vi.fn().mockResolvedValue(null),
    listLeadScoringRules: vi.fn().mockResolvedValue([]),
    upsertLeadScoringRule: vi.fn().mockResolvedValue({}),

    listBlockedPhones: vi.fn().mockResolvedValue([]),
    addBlockedPhone: vi.fn().mockResolvedValue(undefined),
    removeBlockedPhone: vi.fn().mockResolvedValue(undefined),
    isPhoneBlocked: vi.fn().mockResolvedValue(false),

    listEscalationRules: vi.fn().mockResolvedValue([]),
    upsertEscalationRule: vi.fn().mockResolvedValue({}),
    deleteEscalationRule: vi.fn().mockResolvedValue(undefined),

    getDashboardBreakdown: vi.fn().mockResolvedValue({
      totalCalls: 0,
      callsByOutcome: [],
      leadSegments: [],
    }),

    listUserPhoneNumbers: vi.fn().mockImplementation(async (userId: number) =>
      _userPhoneNumbers.filter((r) => Number(r.userId) === userId)
    ),
    insertUserPhoneNumber: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
      const id = nextId("userPhoneNumbers");
      _userPhoneNumbers.push({ id, createdAt: new Date(), ...data });
      return { insertId: id };
    }),
    setUserPhoneNumberActive: vi.fn().mockImplementation(async (id: number, userId: number, isActive: boolean) => {
      const idx = _userPhoneNumbers.findIndex((r) => r.id === id && Number(r.userId) === userId);
      if (idx !== -1) _userPhoneNumbers[idx] = { ..._userPhoneNumbers[idx], isActive };
    }),

    getUserIdByPhoneNumber: vi.fn().mockImplementation(async (phoneNumber: string) => {
      const normalized =
        normalizeToE164US(String(phoneNumber).trim()) ||
        (String(phoneNumber).trim().startsWith("+") ? String(phoneNumber).trim().replace(/\s+/g, "") : "");
      if (!normalized) return null;
      for (const row of _userPhoneNumbers) {
        const r = String(row.phoneNumber ?? "");
        const rn = normalizeToE164US(r) || r.replace(/\D/g, "");
        if (rn === normalized || r.replace(/\D/g, "") === normalized.replace(/\D/g, "")) {
          return Number(row.userId);
        }
      }
      return null;
    }),

    registerBringYourOwnPhoneNumber: vi.fn().mockImplementation(
      async (userId: number, rawPhone: string, friendlyName?: string | null) => {
        const trimmed = String(rawPhone ?? "").trim();
        if (!trimmed) throw new Error("Phone number is required");
        const normalized =
          normalizeToE164US(trimmed) ||
          (trimmed.startsWith("+") ? trimmed.replace(/\s+/g, "") : `+${trimmed.replace(/\D/g, "")}`);
        let owner: number | null = null;
        for (const row of _userPhoneNumbers) {
          const r = String(row.phoneNumber ?? "");
          const rn = normalizeToE164US(r) || r.replace(/\D/g, "");
          if (rn === normalized || r.replace(/\D/g, "") === normalized.replace(/\D/g, "")) {
            owner = Number(row.userId);
            break;
          }
        }
        if (owner !== null && owner !== userId) {
          throw new Error("That number is already linked to another account.");
        }
        const existing = _userPhoneNumbers.filter((row) => Number(row.userId) === userId);
        const dup = existing.find((row) => {
          const r = String(row.phoneNumber ?? "");
          return (
            normalizeToE164US(r) === normalized || r.replace(/\D/g, "") === normalized.replace(/\D/g, "")
          );
        });
        if (dup) {
          return { insertId: Number(dup.id), phoneNumber: String(dup.phoneNumber), alreadyLinked: true };
        }
        const isFirst = existing.length === 0;
        const id = nextId("userPhoneNumbers");
        _userPhoneNumbers.push({
          id,
          userId,
          phoneNumber: normalized,
          signalwireSid: null,
          friendlyName: friendlyName?.trim() || null,
          isActive: true,
          isPrimary: isFirst,
          industry: null,
          createdAt: new Date(),
        });
        return { insertId: id, phoneNumber: normalized, alreadyLinked: false };
      }
    ),

    listCrmConnections: vi.fn().mockResolvedValue([]),
    upsertCrmConnectionStub: vi.fn().mockResolvedValue(undefined),
    setCrmDisconnected: vi.fn().mockResolvedValue(undefined),

    listWorkflows: vi.fn().mockResolvedValue([]),
    upsertWorkflow: vi.fn().mockResolvedValue({ insertId: 1 }),
    deleteWorkflow: vi.fn().mockResolvedValue(undefined),

    listCustomerMemories: vi.fn().mockResolvedValue([]),
    addCustomerMemory: vi.fn().mockResolvedValue({ insertId: 1 }),

    listSupportTickets: vi.fn().mockResolvedValue([]),
    createSupportTicket: vi.fn().mockResolvedValue({ insertId: 1 }),
    updateSupportTicketStatus: vi.fn().mockResolvedValue(undefined),

    listEmailSequences: vi.fn().mockResolvedValue([]),
    listActiveEmailSequencesByTrigger: vi.fn().mockResolvedValue([]),
    upsertEmailSequence: vi.fn().mockResolvedValue({ insertId: 1 }),
    deleteEmailSequence: vi.fn().mockResolvedValue(undefined),

    getSentimentSummary: vi.fn().mockResolvedValue({
      total: 0,
      bySentiment: [] as { sentiment: string; count: number }[],
    }),

    listMobileDevices: vi.fn().mockResolvedValue([]),
    registerMobileDevice: vi.fn().mockResolvedValue({ insertId: 1 }),
    removeMobileDevice: vi.fn().mockResolvedValue(undefined),

    listSocialConnections: vi.fn().mockResolvedValue([]),
    upsertSocialConnectionStub: vi.fn().mockResolvedValue(undefined),
    setSocialDisconnected: vi.fn().mockResolvedValue(undefined),

    listWebchatWidgets: vi.fn().mockResolvedValue([]),
    createWebchatWidget: vi.fn().mockResolvedValue({ insertId: 1, publicKey: "a".repeat(64) }),
    updateWebchatWidget: vi.fn().mockResolvedValue(undefined),
    deleteWebchatWidget: vi.fn().mockResolvedValue(undefined),
    getWebchatWidgetByPublicKey: vi.fn().mockResolvedValue(null),

    getRcsRegistration: vi.fn().mockResolvedValue(null),
    upsertRcsRegistration: vi.fn().mockResolvedValue(undefined),
  };
}

// Reset stores between each test for isolation
beforeEach(() => {
  resetStores();
  vi.clearAllMocks();
  // Re-apply mock implementations after clearAllMocks
  const mockModule = buildMock();
  Object.entries(mockModule).forEach(([key, val]) => {
    if (typeof val === "function" && "mockImplementation" in val) {
      // implementations are closures over the stores — they stay valid
    }
  });
});
