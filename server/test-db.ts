/**
 * Test Database Setup for ApexAI
 * Provides mock DB helpers for unit testing without a live MySQL connection.
 */

import { vi } from "vitest";

// ─── Mock fixtures ────────────────────────────────────────────────────────────

export const TEST_USER = {
  id: 1,
  openId: "test-user-123",
  name: "Test User",
  email: "test@example.com",
  loginMethod: "oauth" as const,
  role: "admin" as "user" | "admin",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  lastSignedIn: new Date("2024-01-01"),
};

export const TEST_LEAD = {
  id: 1,
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@example.com",
  phone: "555-0001",
  company: "Acme Corp",
  industry: "Technology",
  title: "CEO",
  linkedinUrl: null,
  website: null,
  city: "Austin",
  state: "TX",
  country: "US",
  score: 80,
  segment: "hot" as "hot" | "warm" | "cold" | "unqualified",
  verificationStatus: "verified" as "verified" | "unverified" | "bounced" | "pending",
  status: "new" as "new" | "contacted" | "qualified" | "converted" | "lost",
  source: "manual",
  notes: null,
  tags: null,
  customFields: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

export const TEST_CAMPAIGN = {
  id: 1,
  name: "Test Campaign",
  description: "A test campaign",
  channels: JSON.stringify(["email", "sms"]),
  status: "draft" as "draft" | "active" | "paused" | "completed" | "archived",
  goal: "appointments" as "appointments" | "demos" | "sales" | "awareness" | "follow_up",
  industry: "Technology",
  startDate: null,
  endDate: null,
  dailyLimit: 100,
  totalContacts: 0,
  sentCount: 0,
  responseCount: 0,
  scheduledCount: 0,
  showCount: 0,
  convertedCount: 0,
  revenueGenerated: 0,
  settings: null,
  createdBy: 1,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

export const TEST_TEMPLATE = {
  id: 1,
  name: "Test Template",
  channel: "email" as "email" | "sms" | "voice" | "social",
  subject: "Hello {{firstName}}",
  body: "Hi {{firstName}} {{lastName}}, welcome!",
  variables: null,
  isActive: true,
  createdBy: 1,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

export const TEST_TESTIMONIAL = {
  id: 1,
  clientName: "John Doe",
  industry: "Technology",
  company: "TechCorp",
  quote: "ApexAI changed our outbound game!",
  beforeMetric: "10% response rate",
  afterMetric: "45% response rate",
  specificResult: "3x more appointments",
  resultValue: "$500k pipeline",
  avatarUrl: null,
  isActive: true,
  featured: true,
  sortOrder: 0,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

// ─── Mock DB factory ──────────────────────────────────────────────────────────

export function createMockDb() {
  return {
    getUserByOpenId: vi.fn().mockResolvedValue(TEST_USER),
    upsertUser: vi.fn().mockResolvedValue(undefined),
    getLeads: vi.fn().mockResolvedValue([TEST_LEAD]),
    getLeadById: vi.fn().mockResolvedValue(TEST_LEAD),
    createLead: vi.fn().mockResolvedValue({ insertId: 1 }),
    updateLead: vi.fn().mockResolvedValue(undefined),
    deleteLead: vi.fn().mockResolvedValue(undefined),
    getCampaigns: vi.fn().mockResolvedValue([TEST_CAMPAIGN]),
    getCampaignById: vi.fn().mockResolvedValue(TEST_CAMPAIGN),
    createCampaign: vi.fn().mockResolvedValue({ insertId: 1 }),
    updateCampaign: vi.fn().mockResolvedValue(undefined),
    deleteCampaign: vi.fn().mockResolvedValue(undefined),
    getTemplates: vi.fn().mockResolvedValue([TEST_TEMPLATE]),
    getTemplateById: vi.fn().mockResolvedValue(TEST_TEMPLATE),
    createTemplate: vi.fn().mockResolvedValue({ insertId: 1 }),
    updateTemplate: vi.fn().mockResolvedValue(undefined),
    deleteTemplate: vi.fn().mockResolvedValue(undefined),
    getMessages: vi.fn().mockResolvedValue([]),
    createMessage: vi.fn().mockResolvedValue({ insertId: 1 }),
    updateMessage: vi.fn().mockResolvedValue(undefined),
    getCallRecordings: vi.fn().mockResolvedValue([]),
    createCallRecording: vi.fn().mockResolvedValue({ insertId: 1 }),
    getTestimonials: vi.fn().mockResolvedValue([TEST_TESTIMONIAL]),
    createTestimonial: vi.fn().mockResolvedValue({ insertId: 1 }),
    updateTestimonial: vi.fn().mockResolvedValue(undefined),
    deleteTestimonial: vi.fn().mockResolvedValue(undefined),
    getOnboarding: vi.fn().mockResolvedValue(null),
    createOnboarding: vi.fn().mockResolvedValue({ insertId: 1 }),
    updateOnboarding: vi.fn().mockResolvedValue(undefined),
    getAnalyticsSnapshots: vi.fn().mockResolvedValue([]),
    createAnalyticsSnapshot: vi.fn().mockResolvedValue({ insertId: 1 }),
    logActivity: vi.fn().mockResolvedValue(undefined),
    getActivityLogs: vi.fn().mockResolvedValue([]),
    getSystemConfig: vi.fn().mockResolvedValue([]),
    setSystemConfig: vi.fn().mockResolvedValue(undefined),
    getCampaignContacts: vi.fn().mockResolvedValue([]),
    addCampaignContact: vi.fn().mockResolvedValue({ insertId: 1 }),
    removeCampaignContact: vi.fn().mockResolvedValue(undefined),
    getUsers: vi.fn().mockResolvedValue([TEST_USER]),
    updateUser: vi.fn().mockResolvedValue(undefined),
  };
}

export type MockDb = ReturnType<typeof createMockDb>;
