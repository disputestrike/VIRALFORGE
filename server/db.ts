import { randomBytes } from "crypto";
import { and, desc, eq, gte, inArray, isNull, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import type { MySql2Database } from "drizzle-orm/mysql2";
import type { ResultSetHeader } from "mysql2";
import {
  InsertUser,
  type Lead,
  activityLogs,
  analyticsSnapshots,
  callRecordings,
  campaignContacts,
  campaigns,
  knowledgeBases,
  leads,
  messages,
  onboardings,
  systemConfig,
  templates,
  testimonials,
  users,
  zapierWebhooks,
  leadScoringRules,
  blockedPhoneNumbers,
  escalationRules,
  crmConnections,
  workflows,
  customerMemories,
  supportTickets,
  emailSequences,
  mobileDevices,
  socialConnections,
  webchatWidgets,
  rcsRegistrations,
  userPhoneNumbers,
  voiceMetricEvents,
  promptVariants,
  abTestResults,
  callQualityScores,
  type InsertPromptVariant,
  type InsertAbTestResult,
  type InsertUserPhoneNumber,
  type UserPhoneNumber,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { normalizeToE164US } from "./_core/phoneE164";

let _db: MySql2Database | null = null;

export async function getDb(): Promise<MySql2Database | null> {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/** Safe insert that returns the inserted row ID from MySQL ResultSetHeader */
async function insertAndGetId<T extends Record<string, unknown>>(
  db: MySql2Database,
  table: Parameters<MySql2Database["insert"]>[0],
  data: T
): Promise<number> {
  const result = await (db.insert(table) as any).values(data);
  // Drizzle + MySQL2 returns [ResultSetHeader, ...]
  const header = Array.isArray(result) ? result[0] : result;
  return (header as ResultSetHeader).insertId ?? 0;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0];
}

export async function getCurrentMonthUsage(userId: number): Promise<{ leadsThisMonth: number; callsThisMonth: number }> {
  const db = await getDb();
  if (!db) return { leadsThisMonth: 0, callsThisMonth: 0 };
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [leadCountRows, callCountRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(leads)
      .where(and(eq(leads.createdBy, userId), gte(leads.createdAt, monthStart))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(callRecordings)
      .where(and(eq(callRecordings.createdBy, userId), gte(callRecordings.createdAt, monthStart))),
  ]);
  return {
    leadsThisMonth: Number(leadCountRows[0]?.count ?? 0),
    callsThisMonth: Number(callCountRows[0]?.count ?? 0),
  };
}

/** Partial `users` row update (settings screen, admin tools). */
export async function updateUserById(userId: number, patch: Record<string, unknown>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  if (Object.keys(clean).length === 0) return;
  await db.update(users).set({ ...clean, updatedAt: new Date() } as Record<string, unknown>).where(eq(users.id, userId));
}

export async function findUserByStripeCustomerId(customerId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
  return rows[0];
}

export async function updateUserStripeBilling(
  userId: number,
  patch: {
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripeSubscriptionStatus?: string | null;
    plan?: string | null;
  }
) {
  const db = await getDb();
  if (!db) return;
  const clean: Record<string, unknown> = {};
  if (patch.stripeCustomerId !== undefined) clean.stripeCustomerId = patch.stripeCustomerId;
  if (patch.stripeSubscriptionId !== undefined) clean.stripeSubscriptionId = patch.stripeSubscriptionId;
  if (patch.stripeSubscriptionStatus !== undefined) clean.stripeSubscriptionStatus = patch.stripeSubscriptionStatus;
  if (patch.plan !== undefined && patch.plan !== null) clean.plan = patch.plan;
  if (Object.keys(clean).length === 0) return;
  await db.update(users).set(clean as any).where(eq(users.id, userId));
}

// ─── Leads ────────────────────────────────────────────────────────────────────
export async function getLeads(opts?: { search?: string; segment?: string; status?: string; verificationStatus?: string; limit?: number; offset?: number; userId?: number }) {
  const db = await getDb();
  if (!db) return { leads: [], total: 0 };
  const conditions = [];
  // TENANT ISOLATION: Always filter by userId (createdBy)
  if (opts?.userId) conditions.push(eq(leads.createdBy, opts.userId));
  if (opts?.search) {
    const q = `%${opts.search}%`;
    conditions.push(or(like(leads.firstName, q), like(leads.lastName, q), like(leads.email, q), like(leads.company, q), like(leads.industry, q), like(leads.title, q)));
  }
  if (opts?.segment) conditions.push(eq(leads.segment, opts.segment as "hot" | "warm" | "cold" | "unqualified"));
  if (opts?.status) conditions.push(eq(leads.status, opts.status as "new" | "contacted" | "qualified" | "converted" | "lost"));
  if (opts?.verificationStatus) conditions.push(eq(leads.verificationStatus, opts.verificationStatus as "verified" | "unverified" | "bounced" | "pending"));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [rows, countRows] = await Promise.all([
    db.select().from(leads).where(where).orderBy(desc(leads.score), desc(leads.createdAt)).limit(opts?.limit ?? 50).offset(opts?.offset ?? 0),
    db.select({ count: sql<number>`count(*)` }).from(leads).where(where),
  ]);
  return { leads: rows, total: Number(countRows[0]?.count ?? 0) };
}

export async function getLeadById(id: number): Promise<Lead | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    return result[0] as Lead | undefined;
  } catch (error: any) {
    if (!isMissingCreatedByColumnError(error)) throw error;
    console.warn("[Database] leads.createdBy missing in live schema - falling back to legacy lead select by id");
    const rows = await legacyLeadQuery(
      db,
      "SELECT id, firstName, lastName, email, phone, company, industry, title, linkedinUrl, website, city, state, country, score, segment, verificationStatus, status, source, notes, tags, customFields, createdAt, updatedAt FROM leads WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0] as Lead | undefined;
  }
}

export async function getLeadByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(leads).where(eq(leads.phone, phone)).limit(1);
    return result[0];
  } catch (error: any) {
    if (!isMissingCreatedByColumnError(error)) throw error;
    console.warn("[Database] leads.createdBy missing in live schema - falling back to legacy lead select by phone");
    const rows = await legacyLeadQuery(
      db,
      "SELECT id, firstName, lastName, email, phone, company, industry, title, linkedinUrl, website, city, state, country, score, segment, verificationStatus, status, source, notes, tags, customFields, createdAt, updatedAt FROM leads WHERE phone = ? LIMIT 1",
      [phone]
    );
    return rows[0];
  }
}

export async function getLeadsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leads).where(inArray(leads.id, ids));
}

export async function createLead(data: typeof leads.$inferInsert): Promise<{ insertId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const insertId = await insertAndGetId(db, leads, data);
  return { insertId };
}

export async function createManyLeads(data: (typeof leads.$inferInsert)[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(leads).values(data);
}

export async function updateLead(id: number, data: Partial<typeof leads.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(leads).set(data).where(eq(leads.id, id));
}

export async function deleteLead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(leads).where(eq(leads.id, id));
}

// ─── Campaigns ────────────────────────────────────────────────────────────────
export async function getCampaigns(opts?: { status?: string; limit?: number; offset?: number; userId?: number }) {
  const db = await getDb();
  if (!db) return { campaigns: [], total: 0 };
  const conditions = [];
  // TENANT ISOLATION: Always filter by userId (createdBy)
  if (opts?.userId) conditions.push(eq(campaigns.createdBy, opts.userId));
  if (opts?.status) conditions.push(eq(campaigns.status, opts.status as "draft" | "active" | "paused" | "completed" | "archived"));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [rows, countRows] = await Promise.all([
    db.select().from(campaigns).where(where).orderBy(desc(campaigns.createdAt)).limit(opts?.limit ?? 50).offset(opts?.offset ?? 0),
    db.select({ count: sql<number>`count(*)` }).from(campaigns).where(where),
  ]);
  return { campaigns: rows, total: Number(countRows[0]?.count ?? 0) };
}

export async function getCampaignById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return result[0];
}

export async function createCampaign(data: typeof campaigns.$inferInsert): Promise<{ insertId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const insertId = await insertAndGetId(db, campaigns, data);
  return { insertId };
}

export async function updateCampaign(id: number, data: Partial<typeof campaigns.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(campaigns).set(data).where(eq(campaigns.id, id));
}

export async function deleteCampaign(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(campaigns).where(eq(campaigns.id, id));
}

export async function getCampaignContacts(campaignId: number, opts?: { limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return [];
  const query = db.select().from(campaignContacts)
    .where(eq(campaignContacts.campaignId, campaignId))
    .orderBy(desc(campaignContacts.createdAt));
  if (opts?.limit !== undefined) {
    return await query.limit(opts.limit).offset(opts?.offset ?? 0);
  }
  return await query;
}

export async function addContactToCampaign(campaignId: number, leadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(campaignContacts).values({ campaignId, leadId });
  await db.update(campaigns).set({ totalContacts: sql`totalContacts + 1` }).where(eq(campaigns.id, campaignId));
}

export async function removeContactFromCampaign(campaignId: number, leadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(campaignContacts).where(and(eq(campaignContacts.campaignId, campaignId), eq(campaignContacts.leadId, leadId)));
  await db.update(campaigns).set({ totalContacts: sql`GREATEST(totalContacts - 1, 0)` }).where(eq(campaigns.id, campaignId));
}

export async function updateCampaignContactStatus(id: number, status: typeof campaignContacts.$inferInsert["status"]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(campaignContacts).set({ status, lastContactedAt: new Date() }).where(eq(campaignContacts.id, id));
}

// ─── Messages ─────────────────────────────────────────────────────────────────
export async function getMessages(opts?: { campaignId?: number; leadId?: number; channel?: string; limit?: number; userId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  // TENANT ISOLATION
  if (opts?.userId) conditions.push(eq(messages.createdBy, opts.userId));
  if (opts?.campaignId) conditions.push(eq(messages.campaignId, opts.campaignId));
  if (opts?.leadId) conditions.push(eq(messages.leadId, opts.leadId));
  if (opts?.channel) conditions.push(eq(messages.channel, opts.channel as "sms" | "email" | "voice" | "social"));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(messages).where(where).orderBy(desc(messages.createdAt)).limit(opts?.limit ?? 100);
}

export async function createMessage(data: typeof messages.$inferInsert): Promise<{ insertId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const insertId = await insertAndGetId(db, messages, data);
  return { insertId };
}

export async function createManyMessages(data: (typeof messages.$inferInsert)[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(messages).values(data);
}

export async function updateMessageStatus(id: number, status: typeof messages.$inferInsert["status"], extra?: Record<string, Date>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(messages).set({ status, ...extra }).where(eq(messages.id, id));
}

// ─── Call Recordings ──────────────────────────────────────────────────────────
export async function getCallRecordings(opts?: { campaignId?: number; leadId?: number; limit?: number; userId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  // TENANT ISOLATION
  if (opts?.userId) conditions.push(eq(callRecordings.createdBy, opts.userId));
  if (opts?.campaignId) conditions.push(eq(callRecordings.campaignId, opts.campaignId));
  if (opts?.leadId) conditions.push(eq(callRecordings.leadId, opts.leadId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(callRecordings).where(where).orderBy(desc(callRecordings.calledAt)).limit(opts?.limit ?? 50);
}

export async function createCallRecording(data: typeof callRecordings.$inferInsert): Promise<{ insertId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const insertId = await insertAndGetId(db, callRecordings, data);
  return { insertId };
}

// ─── Templates ────────────────────────────────────────────────────────────────
export async function getTemplates(channel?: string, userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(templates.isActive, true)];
  if (channel) conditions.push(eq(templates.channel, channel as "sms" | "email" | "voice" | "social"));
  // TENANT ISOLATION: show user's own templates + system templates (createdBy is null)
  if (userId) conditions.push(sql`(templates.createdBy = ${userId} OR templates.createdBy IS NULL)`);
  return db.select().from(templates).where(and(...conditions)).orderBy(desc(templates.createdAt));
}

export async function createTemplate(data: typeof templates.$inferInsert): Promise<{ insertId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const insertId = await insertAndGetId(db, templates, data);
  return { insertId };
}

export async function updateTemplate(id: number, data: Partial<typeof templates.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(templates).set(data).where(eq(templates.id, id));
}

export async function deleteTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(templates).set({ isActive: false }).where(eq(templates.id, id));
}

// ─── Analytics ────────────────────────────────────────────────────────────────
export async function getAnalyticsSnapshots(opts?: { campaignId?: number; channel?: string; limit?: number; userId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  // TENANT ISOLATION
  if (opts?.userId) conditions.push(eq(analyticsSnapshots.createdBy, opts.userId));
  if (opts?.campaignId) conditions.push(eq(analyticsSnapshots.campaignId, opts.campaignId));
  if (opts?.channel) conditions.push(eq(analyticsSnapshots.channel, opts.channel as "sms" | "email" | "voice" | "social" | "all"));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(analyticsSnapshots).where(where).orderBy(desc(analyticsSnapshots.date)).limit(opts?.limit ?? 30);
}

export async function getGlobalMetrics(userId?: number) {
  const db = await getDb();
  if (!db)
    return {
      responseRate: 0,
      scheduleRate: 0,
      showRate: 0,
      salesIncrease: 0,
      totalLeads: 0,
      totalCampaigns: 0,
      totalMessages: 0,
      totalRevenue: 0,
      totalAppointments: 0,
    };
  const [leadsCount, campaignsData, messagesCount, analyticsData] = await Promise.all([
    userId ? db.select({ count: sql<number>`count(*)` }).from(leads).where(eq(leads.createdBy, userId)) : db.select({ count: sql<number>`count(*)` }).from(leads),
    userId ? db.select({ count: sql<number>`count(*)`, revenue: sql<number>`sum(revenueGenerated)`, responses: sql<number>`sum(responseCount)`, scheduled: sql<number>`sum(scheduledCount)`, showed: sql<number>`sum(showCount)`, sent: sql<number>`sum(sentCount)`, converted: sql<number>`sum(convertedCount)` }).from(campaigns).where(eq(campaigns.createdBy, userId)) : db.select({ count: sql<number>`count(*)`, revenue: sql<number>`sum(revenueGenerated)`, responses: sql<number>`sum(responseCount)`, scheduled: sql<number>`sum(scheduledCount)`, showed: sql<number>`sum(showCount)`, sent: sql<number>`sum(sentCount)`, converted: sql<number>`sum(convertedCount)` }).from(campaigns),
    userId ? db.select({ count: sql<number>`count(*)` }).from(messages).where(eq(messages.createdBy, userId)) : db.select({ count: sql<number>`count(*)` }).from(messages),
    userId ? db.select({ avgResponse: sql<number>`avg(responseRate)`, avgSchedule: sql<number>`avg(scheduleRate)`, avgShow: sql<number>`avg(showRate)`, avgConversion: sql<number>`avg(conversionRate)` }).from(analyticsSnapshots).where(eq(analyticsSnapshots.createdBy, userId)) : db.select({ avgResponse: sql<number>`avg(responseRate)`, avgSchedule: sql<number>`avg(scheduleRate)`, avgShow: sql<number>`avg(showRate)`, avgConversion: sql<number>`avg(conversionRate)` }).from(analyticsSnapshots),
  ]);
  const c = campaignsData[0];
  const a = analyticsData[0];
  const totalSent = Number(c?.sent ?? 0);
  const responseRate = a?.avgResponse ? Number(a.avgResponse) : (totalSent > 0 ? (Number(c?.responses ?? 0) / totalSent) * 100 : 0);
  const scheduleRate = a?.avgSchedule ? Number(a.avgSchedule) : (Number(c?.responses ?? 0) > 0 ? (Number(c?.scheduled ?? 0) / Number(c?.responses ?? 1)) * 100 : 0);
  const showRate = a?.avgShow ? Number(a.avgShow) : (Number(c?.scheduled ?? 0) > 0 ? (Number(c?.showed ?? 0) / Number(c?.scheduled ?? 1)) * 100 : 0);
  const salesIncrease = Number(c?.converted ?? 0) > 0 ? ((Number(c?.converted ?? 0) / Math.max(totalSent, 1)) * 100) : 0;
  return {
    responseRate: Math.round(responseRate * 10) / 10,
    scheduleRate: Math.round(scheduleRate * 10) / 10,
    showRate: Math.round(showRate * 10) / 10,
    salesIncrease: Math.round(salesIncrease * 10) / 10,
    totalLeads: Number(leadsCount[0]?.count ?? 0),
    totalCampaigns: Number(c?.count ?? 0),
    totalMessages: Number(messagesCount[0]?.count ?? 0),
    totalRevenue: Number(c?.revenue ?? 0),
    totalAppointments: Number(c?.scheduled ?? 0),
  };
}

export type DashboardBreakdown = {
  totalCalls: number;
  callsByOutcome: Array<{ outcome: string; count: number }>;
  leadSegments: Array<{ segment: string; count: number }>;
};

export async function getDashboardBreakdown(userId: number): Promise<DashboardBreakdown> {
  const db = await getDb();
  if (!db) {
    return { totalCalls: 0, callsByOutcome: [], leadSegments: [] };
  }
  const [callTotal] = await db
    .select({ n: sql<number>`count(*)` })
    .from(callRecordings)
    .where(eq(callRecordings.createdBy, userId));
  const outcomes = await db
    .select({ outcome: callRecordings.outcome, count: sql<number>`count(*)` })
    .from(callRecordings)
    .where(eq(callRecordings.createdBy, userId))
    .groupBy(callRecordings.outcome);
  const segments = await db
    .select({ segment: leads.segment, count: sql<number>`count(*)` })
    .from(leads)
    .where(eq(leads.createdBy, userId))
    .groupBy(leads.segment);
  return {
    totalCalls: Number(callTotal?.n ?? 0),
    callsByOutcome: outcomes.map((o) => ({
      outcome: String(o.outcome ?? "unknown"),
      count: Number(o.count),
    })),
    leadSegments: segments.map((s) => ({
      segment: String(s.segment ?? "cold"),
      count: Number(s.count),
    })),
  };
}

export async function createAnalyticsSnapshot(data: typeof analyticsSnapshots.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(analyticsSnapshots).values(data);
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
export async function getTestimonials(featuredOnly?: boolean) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(testimonials.isActive, true)];
  if (featuredOnly) conditions.push(eq(testimonials.featured, true));
  return db.select().from(testimonials).where(and(...conditions)).orderBy(testimonials.sortOrder, desc(testimonials.createdAt));
}

export async function createTestimonial(data: typeof testimonials.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(testimonials).values(data);
}

export async function updateTestimonial(id: number, data: Partial<typeof testimonials.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(testimonials).set(data).where(eq(testimonials.id, id));
}

export async function deleteTestimonial(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(testimonials).set({ isActive: false }).where(eq(testimonials.id, id));
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
export async function getOnboardings(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = userId ? [eq(onboardings.userId, userId)] : [];
  return db.select().from(onboardings).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(desc(onboardings.createdAt));
}

export async function createOnboarding(data: typeof onboardings.$inferInsert): Promise<{ insertId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const insertId = await insertAndGetId(db, onboardings, data);
  return { insertId };
}

export async function updateOnboarding(id: number, data: Partial<typeof onboardings.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(onboardings).set(data).where(eq(onboardings.id, id));
}

// ─── Activity Log ─────────────────────────────────────────────────────────────
export async function logActivity(data: { userId?: number; entityType: string; entityId?: number; action: string; description?: string; metadata?: Record<string, unknown> }) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(activityLogs).values({ ...data, metadata: data.metadata ? JSON.stringify(data.metadata) : undefined });
  } catch (e) {
    console.warn("[Activity] Failed to log:", e);
  }
}

export async function getActivityLogs(opts?: {
  limit?: number;
  userId?: number;
  entityType?: string;
  entityId?: number;
  actions?: string[];
  fromDate?: Date;
}) {
  const db = await getDb();
  if (!db) return [];
  const limit = opts?.limit ?? 50;
  const conditions: any[] = [];
  if (opts?.userId != null) conditions.push(eq(activityLogs.userId, opts.userId));
  if (opts?.entityType) conditions.push(eq(activityLogs.entityType, opts.entityType));
  if (opts?.entityId != null) conditions.push(eq(activityLogs.entityId, opts.entityId));
  if (opts?.actions?.length) conditions.push(inArray(activityLogs.action, opts.actions));
  if (opts?.fromDate) conditions.push(gte(activityLogs.createdAt, opts.fromDate));
  const where = conditions.length ? and(...conditions) : undefined;
  return db.select().from(activityLogs).where(where).orderBy(desc(activityLogs.createdAt)).limit(limit);
}

/** Persisted voice trace (requires `voice_metric_events` table — see drizzle/voice_metric_events.sql). */
export async function insertVoiceMetricEvent(data: {
  sessionId?: string | null;
  callId?: string | null;
  phase: string;
  msSinceCallStart?: number | null;
  extra?: Record<string, unknown> | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(voiceMetricEvents).values({
      sessionId: data.sessionId ?? null,
      callId: data.callId ?? null,
      phase: data.phase,
      msSinceCallStart: data.msSinceCallStart ?? null,
      extra: data.extra ?? null,
    });
  } catch (e) {
    console.warn("[DB] voice_metric_events insert skipped (table missing or error):", (e as Error).message);
  }
}

export async function listVoiceMetricEvents(limit = 200): Promise<typeof voiceMetricEvents.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return db.select().from(voiceMetricEvents).orderBy(desc(voiceMetricEvents.id)).limit(Math.min(500, Math.max(1, limit)));
  } catch {
    return [];
  }
}

/** Percentiles for stt_final→first TTS audio (phase `latency_stt_final_to_tts_first`, extra.ms). */
export async function getVoiceMetricLatencyStats(sampleLimit = 500): Promise<{
  count: number;
  p50: number | null;
  p95: number | null;
  avg: number | null;
}> {
  const db = await getDb();
  if (!db) return { count: 0, p50: null, p95: null, avg: null };
  try {
    const rows = await db
      .select()
      .from(voiceMetricEvents)
      .where(eq(voiceMetricEvents.phase, "latency_stt_final_to_tts_first"))
      .orderBy(desc(voiceMetricEvents.id))
      .limit(Math.min(2000, Math.max(1, sampleLimit)));
    const msList: number[] = [];
    for (const r of rows) {
      const ex = r.extra as { ms?: unknown } | null;
      if (ex && typeof ex.ms === "number" && Number.isFinite(ex.ms)) msList.push(ex.ms);
    }
    if (msList.length === 0) return { count: 0, p50: null, p95: null, avg: null };
    const sorted = [...msList].sort((a, b) => a - b);
    const p50 = sorted[Math.floor((sorted.length - 1) * 0.5)] ?? null;
    const p95 = sorted[Math.floor((sorted.length - 1) * 0.95)] ?? null;
    const avg = Math.round(msList.reduce((a, b) => a + b, 0) / msList.length);
    return { count: msList.length, p50, p95, avg };
  } catch {
    return { count: 0, p50: null, p95: null, avg: null };
  }
}

// ─── Call Quality Scores ──────────────────────────────────────────────────────

export async function insertCallQualityScore(data: {
  callId: string;
  sessionId?: string | null;
  sentiment: string;
  emotion: string;
  conversionScore: number;
  escalationRisk: number;
  flags?: Record<string, unknown> | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(callQualityScores).values({
      callId: data.callId,
      sessionId: data.sessionId ?? null,
      sentiment: data.sentiment,
      emotion: data.emotion,
      conversionScore: data.conversionScore,
      escalationRisk: data.escalationRisk,
      flags: data.flags ?? null,
    });
  } catch (e) {
    console.warn("[DB] call_quality_scores insert skipped:", (e as Error).message);
  }
}

export async function getCallQualityScore(callId: string) {
  const db = await getDb();
  if (!db) return null;
  try {
    const rows = await db
      .select()
      .from(callQualityScores)
      .where(eq(callQualityScores.callId, callId))
      .orderBy(desc(callQualityScores.createdAt))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function getCallQualityScoresByTimeRange(opts: {
  fromDate: Date;
  toDate: Date;
  limit?: number;
}): Promise<typeof callQualityScores.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return db
      .select()
      .from(callQualityScores)
      .where(
        and(
          gte(callQualityScores.createdAt, opts.fromDate),
          lte(callQualityScores.createdAt, opts.toDate)
        )
      )
      .orderBy(desc(callQualityScores.createdAt))
      .limit(Math.min(1000, opts.limit ?? 200));
  } catch {
    return [];
  }
}

/** Fetch voice_metric_events for a specific callId, ordered by msSinceCallStart. */
export async function getVoiceMetricEventsByCallId(
  callId: string
): Promise<typeof voiceMetricEvents.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return db
      .select()
      .from(voiceMetricEvents)
      .where(eq(voiceMetricEvents.callId, callId))
      .orderBy(voiceMetricEvents.msSinceCallStart);
  } catch {
    return [];
  }
}

/** Fetch voice_metric_events for a specific phase within a time range (for trend analysis). */
export async function getVoiceMetricEventsByPhaseAndTimeRange(opts: {
  phase: string;
  fromDate: Date;
  toDate: Date;
  limit?: number;
}): Promise<typeof voiceMetricEvents.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    return db
      .select()
      .from(voiceMetricEvents)
      .where(
        and(
          eq(voiceMetricEvents.phase, opts.phase),
          gte(voiceMetricEvents.createdAt, opts.fromDate),
          lte(voiceMetricEvents.createdAt, opts.toDate)
        )
      )
      .orderBy(desc(voiceMetricEvents.createdAt))
      .limit(Math.min(2000, opts.limit ?? 500));
  } catch {
    return [];
  }
}

// ─── System Config ────────────────────────────────────────────────────────────
export async function getSystemConfig() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(systemConfig).orderBy(systemConfig.category);
}

export async function setSystemConfig(key: string, value: string, category = "general") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(systemConfig).values({ key, value, category })
    .onDuplicateKeyUpdate({ set: { value, category } });
}

export async function listKnowledgeBases(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(knowledgeBases)
    .where(eq(knowledgeBases.userId, userId))
    .orderBy(desc(knowledgeBases.updatedAt));
}

// ── Appointments ──────────────────────────────────────────────────────────────
export async function getAppointments(opts?: { leadId?: number; status?: string; upcoming?: boolean; userId?: number }): Promise<any[]> {
  const conn = await import("mysql2/promise");
  const connection = await conn.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  try {
    const conditions: string[] = ["1=1"];
    const params: any[] = [];
    // TENANT ISOLATION: filter appointments via leads.createdBy
    if (opts?.userId) { conditions.push("l.createdBy = ?"); params.push(opts.userId); }
    if (opts?.leadId) { conditions.push("a.leadId = ?"); params.push(opts.leadId); }
    if (opts?.status) { conditions.push("a.confirmationStatus = ?"); params.push(opts.status); }
    if (opts?.upcoming) { conditions.push("a.scheduledTime >= NOW()"); }
    const where = "WHERE " + conditions.join(" AND ");
    const [rows] = await connection.execute(
      `SELECT a.*, l.firstName, l.lastName, l.phone, l.email, l.company
       FROM appointment_bookings a
       LEFT JOIN leads l ON a.leadId = l.id
       ${where}
       ORDER BY a.scheduledTime ASC LIMIT 100`,
      params
    );
    return rows as any[];
  } finally {
    await connection.end();
  }
}

export async function updateAppointment(id: number, data: { confirmationStatus?: string; showStatus?: string; notes?: string }): Promise<void> {
  const conn = await import("mysql2/promise");
  const connection = await conn.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  try {
    const sets: string[] = [];
    const params: any[] = [];
    if (data.confirmationStatus) { sets.push("confirmationStatus = ?"); params.push(data.confirmationStatus); }
    if (data.showStatus) { sets.push("showStatus = ?"); params.push(data.showStatus); }
    if (data.notes !== undefined) { sets.push("notes = ?"); params.push(data.notes); }
    if (sets.length === 0) return;
    params.push(id);
    await connection.execute(`UPDATE appointment_bookings SET ${sets.join(", ")} WHERE id = ?`, params);
  } finally {
    await connection.end();
  }
}

export async function createManualAppointment(data: { leadId: number; scheduledTime: Date; duration?: number; notes?: string; timezone?: string }): Promise<{ insertId: number }> {
  const conn = await import("mysql2/promise");
  const connection = await conn.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  try {
    const [result] = await connection.execute(
      `INSERT INTO appointment_bookings (leadId, scheduledTime, duration, notes, timezone, confirmationStatus, showStatus)
       VALUES (?, ?, ?, ?, ?, 'confirmed', 'pending')`,
      [data.leadId, data.scheduledTime, data.duration ?? 30, data.notes ?? null, data.timezone ?? "America/New_York"]
    );
    return { insertId: (result as any).insertId };
  } finally {
    await connection.end();
  }
}

// ── Local Number Pool (SignalWire local presence) ─────────────────────────
// Look up which user owns a given phone number (for inbound call routing)
export type { UserPhoneNumber };

function normalizeStoredPhoneNumber(raw: string): string {
  return normalizeToE164US(raw) || raw.trim();
}

/**
 * Link a tenant-owned / port-in number to this user for inbound routing (`getUserIdByPhoneNumber`).
 * Does not purchase from SignalWire — customer keeps or ports their existing DID.
 */
export async function registerBringYourOwnPhoneNumber(
  userId: number,
  rawPhone: string,
  friendlyName?: string | null
): Promise<{ insertId: number; phoneNumber: string; alreadyLinked: boolean }> {
  const trimmed = String(rawPhone ?? "").trim();
  if (!trimmed) throw new Error("Phone number is required");
  const normalized =
    normalizeToE164US(trimmed) ||
    (trimmed.startsWith("+") ? trimmed.replace(/\s+/g, "") : `+${trimmed.replace(/\D/g, "")}`);

  const owner = await getUserIdByPhoneNumber(normalized);
  if (owner !== null && owner !== userId) {
    throw new Error("That number is already linked to another account.");
  }

  const existing = await listUserPhoneNumbers(userId);
  const dup = existing.find(
    (row) =>
      normalizeToE164US(row.phoneNumber) === normalized ||
      row.phoneNumber.replace(/\D/g, "") === normalized.replace(/\D/g, "")
  );
  if (dup) {
    return { insertId: dup.id, phoneNumber: dup.phoneNumber, alreadyLinked: true };
  }

  const isFirst = existing.length === 0;
  const { insertId } = await insertUserPhoneNumber({
    userId,
    phoneNumber: normalized,
    signalwireSid: null,
    friendlyName: friendlyName?.trim() || null,
    isActive: true,
    isPrimary: isFirst,
    industry: null,
  });
  return { insertId, phoneNumber: normalized, alreadyLinked: false };
}

function buildPhoneCandidates(raw: string): string[] {
  const normalized = normalizeStoredPhoneNumber(raw);
  const digits = normalized.replace(/\D/g, "");
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  return Array.from(
    new Set(
      [
        normalized,
        raw.trim(),
        digits ? `+${digits}` : "",
        digits.length === 10 ? `+1${digits}` : "",
        digits.length === 11 && digits.startsWith("1") ? `+${digits}` : "",
        last10,
      ].filter(Boolean)
    )
  );
}

export async function listUserPhoneNumbers(userId: number): Promise<UserPhoneNumber[]> {
  const db = await getDb();
  if (!db) return [];
  try {
    const rows = await db
      .select()
      .from(userPhoneNumbers)
      .where(eq(userPhoneNumbers.userId, userId))
      .orderBy(desc(userPhoneNumbers.createdAt));
    return rows.map((row) => ({
      ...row,
      phoneNumber: normalizeStoredPhoneNumber(row.phoneNumber),
    }));
  } catch (e) {
    console.warn("[DB] listUserPhoneNumbers:", e);
    return [];
  }
}

export async function getPreferredActiveUserPhoneNumber(
  userId: number
): Promise<UserPhoneNumber | null> {
  const rows = await listUserPhoneNumbers(userId);
  return (
    rows.find((row) => row.isActive && row.isPrimary) ??
    rows.find((row) => row.isActive) ??
    null
  );
}

export async function insertUserPhoneNumber(data: InsertUserPhoneNumber): Promise<{ insertId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const phoneNumber = normalizeStoredPhoneNumber(data.phoneNumber);
  const [existing] = await db
    .select({ id: userPhoneNumbers.id })
    .from(userPhoneNumbers)
    .where(
      and(
        eq(userPhoneNumbers.userId, data.userId),
        eq(userPhoneNumbers.phoneNumber, phoneNumber)
      )
    )
    .limit(1);
  if (existing?.id) {
    return { insertId: existing.id };
  }
  const insertId = await insertAndGetId(db, userPhoneNumbers, {
    ...data,
    phoneNumber,
  });
  return { insertId };
}

export async function setUserPhoneNumberActive(id: number, userId: number, isActive: boolean): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [currentRow] = await db
    .select()
    .from(userPhoneNumbers)
    .where(and(eq(userPhoneNumbers.id, id), eq(userPhoneNumbers.userId, userId)))
    .limit(1);
  if (!currentRow) return;
  await db
    .update(userPhoneNumbers)
    .set({ isActive })
    .where(and(eq(userPhoneNumbers.id, id), eq(userPhoneNumbers.userId, userId)));
  if (!isActive && currentRow.isPrimary) {
    const [replacement] = await db
      .select({ id: userPhoneNumbers.id })
      .from(userPhoneNumbers)
      .where(
        and(
          eq(userPhoneNumbers.userId, userId),
          eq(userPhoneNumbers.isActive, true)
        )
      )
      .orderBy(desc(userPhoneNumbers.createdAt))
      .limit(1);
    if (replacement?.id) {
      await db
        .update(userPhoneNumbers)
        .set({ isPrimary: true })
        .where(eq(userPhoneNumbers.id, replacement.id));
    }
  }
}

export async function getUserIdByPhoneNumber(phoneNumber: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const raw = String(phoneNumber ?? "").trim();
  if (!raw) return null;
  const digits = normalizeStoredPhoneNumber(raw).replace(/\D/g, "");
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  const candidates = buildPhoneCandidates(raw);
  try {
    // Check user_phone_numbers table (provisioned numbers) with relaxed normalization.
    for (const candidate of candidates) {
      const [rows] = await (db as any).execute(
        "SELECT userId FROM user_phone_numbers WHERE phoneNumber = ? AND isActive = TRUE LIMIT 1",
        [candidate]
      );
      if (Array.isArray(rows) && rows.length > 0) return (rows[0] as any).userId;
    }
    if (last10) {
      const [rows] = await (db as any).execute(
        "SELECT userId FROM user_phone_numbers WHERE REPLACE(REPLACE(REPLACE(REPLACE(phoneNumber, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ? AND isActive = TRUE LIMIT 1",
        [`%${last10}`]
      );
      if (Array.isArray(rows) && rows.length > 0) return (rows[0] as any).userId;
    }
  } catch { /* table may not exist yet */ }
  return null;
}

export async function getLocalNumberByAreaCode(areaCode: string): Promise<{ phoneNumber: string } | null> {
  const conn = await import("mysql2/promise");
  const connection = await conn.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  try {
    const [rows] = await connection.execute(
      `SELECT phone_number as phoneNumber FROM local_number_pool 
       WHERE area_code = ? AND is_active = 1 
       ORDER BY last_used_at ASC LIMIT 1`,
      [areaCode]
    );
    const r = rows as any[];
    return r.length > 0 ? { phoneNumber: r[0].phoneNumber } : null;
  } catch {
    return null; // Table may not exist yet — graceful fallback
  } finally {
    await connection.end();
  }
}

export async function updateLocalNumberLastUsed(phoneNumber: string): Promise<void> {
  const conn = await import("mysql2/promise");
  const connection = await conn.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  try {
    await connection.execute(
      `UPDATE local_number_pool SET last_used_at = NOW() WHERE phone_number = ?`,
      [phoneNumber]
    );
  } catch {
    // Silently fail — non-critical
  } finally {
    await connection.end();
  }
}

// ─── Zapier + lead scoring (integrations) ───────────────────────────────────
export async function getZapierWebhook(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(zapierWebhooks).where(eq(zapierWebhooks.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertZapierWebhook(
  userId: number,
  data: { targetUrl: string; events?: string | null; isActive?: boolean }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(zapierWebhooks)
    .values({
      userId,
      targetUrl: data.targetUrl,
      events: data.events ?? null,
      isActive: data.isActive ?? true,
    })
    .onDuplicateKeyUpdate({
      set: {
        targetUrl: data.targetUrl,
        events: data.events ?? null,
        isActive: data.isActive ?? true,
        updatedAt: new Date(),
      },
    });
  return getZapierWebhook(userId);
}

export async function listLeadScoringRules(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(leadScoringRules)
    .where(eq(leadScoringRules.userId, userId))
    .orderBy(desc(leadScoringRules.updatedAt));
}

export async function getDefaultLeadScoringRule(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(leadScoringRules)
    .where(and(eq(leadScoringRules.userId, userId), eq(leadScoringRules.isDefault, true)))
    .limit(1);
  return rows[0] ?? null;
}

export async function listBlockedPhones(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(blockedPhoneNumbers)
    .where(eq(blockedPhoneNumbers.userId, userId))
    .orderBy(desc(blockedPhoneNumbers.createdAt));
}

export async function addBlockedPhone(userId: number, phoneE164: string, note?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(blockedPhoneNumbers)
    .values({ userId, phoneE164, note: note ?? null })
    .onDuplicateKeyUpdate({
      set: { note: note ?? null },
    });
}

export async function removeBlockedPhone(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(blockedPhoneNumbers).where(and(eq(blockedPhoneNumbers.id, id), eq(blockedPhoneNumbers.userId, userId)));
}

export async function isPhoneBlocked(userId: number, phoneE164: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: blockedPhoneNumbers.id })
    .from(blockedPhoneNumbers)
    .where(and(eq(blockedPhoneNumbers.userId, userId), eq(blockedPhoneNumbers.phoneE164, phoneE164)))
    .limit(1);
  return rows.length > 0;
}

export async function listEscalationRules(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(escalationRules)
    .where(eq(escalationRules.userId, userId))
    .orderBy(desc(escalationRules.updatedAt));
}

export async function upsertEscalationRule(
  userId: number,
  input: {
    id?: number;
    name: string;
    keyword: string;
    transferNumber?: string | null;
    isActive?: boolean;
  }
): Promise<{ insertId?: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const isActive = input.isActive ?? true;
  if (input.id) {
    await db
      .update(escalationRules)
      .set({
        name: input.name,
        keyword: input.keyword,
        transferNumber: input.transferNumber?.trim() || null,
        isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(escalationRules.id, input.id), eq(escalationRules.userId, userId)));
    return {};
  }
  const insertId = await insertAndGetId(db, escalationRules, {
    userId,
    name: input.name,
    keyword: input.keyword,
    transferNumber: input.transferNumber?.trim() || null,
    isActive,
  });
  return { insertId };
}

export async function deleteEscalationRule(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(escalationRules).where(and(eq(escalationRules.id, id), eq(escalationRules.userId, userId)));
}

export async function listCrmConnections(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(crmConnections)
    .where(eq(crmConnections.userId, userId))
    .orderBy(desc(crmConnections.updatedAt));
}

export async function upsertCrmConnectionStub(
  userId: number,
  provider: "salesforce" | "hubspot" | "pipedrive"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const label = provider.charAt(0).toUpperCase() + provider.slice(1);
  await db
    .insert(crmConnections)
    .values({
      userId,
      provider,
      status: "pending_oauth",
      displayName: `${label} (OAuth pending)`,
      meta: JSON.stringify({ stub: true }),
    })
    .onDuplicateKeyUpdate({
      set: {
        status: "pending_oauth",
        displayName: `${label} (OAuth pending)`,
        updatedAt: new Date(),
      },
    });
}

export async function setCrmDisconnected(
  userId: number,
  provider: "salesforce" | "hubspot" | "pipedrive"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(crmConnections)
    .set({ status: "disconnected", updatedAt: new Date() })
    .where(and(eq(crmConnections.userId, userId), eq(crmConnections.provider, provider)));
}

export async function listWorkflows(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workflows).where(eq(workflows.userId, userId)).orderBy(desc(workflows.updatedAt));
}

export async function upsertWorkflow(
  userId: number,
  input: { id?: number; name: string; definition: unknown; isActive?: boolean }
): Promise<{ insertId?: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const isActive = input.isActive ?? true;
  if (input.id) {
    await db
      .update(workflows)
      .set({
        name: input.name,
        definition: input.definition as Record<string, unknown>,
        isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(workflows.id, input.id), eq(workflows.userId, userId)));
    return {};
  }
  const insertId = await insertAndGetId(db, workflows, {
    userId,
    name: input.name,
    definition: input.definition as Record<string, unknown>,
    isActive,
  });
  return { insertId };
}

export async function deleteWorkflow(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(workflows).where(and(eq(workflows.id, id), eq(workflows.userId, userId)));
}

export async function listCustomerMemories(userId: number, leadId?: number) {
  const db = await getDb();
  if (!db) return [];
  const where =
    leadId != null
      ? and(eq(customerMemories.userId, userId), eq(customerMemories.leadId, leadId))
      : eq(customerMemories.userId, userId);
  return db.select().from(customerMemories).where(where).orderBy(desc(customerMemories.createdAt));
}

export async function addCustomerMemory(
  userId: number,
  data: { leadId?: number; content: string; source?: string }
): Promise<{ insertId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.leadId != null) {
    const lead = await getLeadById(data.leadId);
    if (!lead || lead.createdBy !== userId) throw new Error("Lead not found");
  }
  const insertId = await insertAndGetId(db, customerMemories, {
    userId,
    leadId: data.leadId ?? null,
    content: data.content,
    source: data.source ?? "manual",
  });
  return { insertId };
}

export async function listSupportTickets(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.userId, userId))
    .orderBy(desc(supportTickets.updatedAt));
}

export async function createSupportTicket(
  userId: number,
  data: { leadId?: number; subject: string; body: string }
): Promise<{ insertId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.leadId != null) {
    const lead = await getLeadById(data.leadId);
    if (!lead || lead.createdBy !== userId) throw new Error("Lead not found");
  }
  const insertId = await insertAndGetId(db, supportTickets, {
    userId,
    leadId: data.leadId ?? null,
    subject: data.subject,
    body: data.body,
    status: "open",
  });
  return { insertId };
}

export async function updateSupportTicketStatus(
  userId: number,
  id: number,
  status: "open" | "in_progress" | "closed"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(supportTickets)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(supportTickets.id, id), eq(supportTickets.userId, userId)));
}

export async function listEmailSequences(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(emailSequences)
    .where(eq(emailSequences.userId, userId))
    .orderBy(desc(emailSequences.updatedAt));
}

export async function upsertEmailSequence(
  userId: number,
  input: { id?: number; name: string; triggerEvent: string; bodyTemplate: string; isActive?: boolean }
): Promise<{ insertId?: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const isActive = input.isActive ?? true;
  if (input.id) {
    await db
      .update(emailSequences)
      .set({
        name: input.name,
        triggerEvent: input.triggerEvent,
        bodyTemplate: input.bodyTemplate,
        isActive,
        updatedAt: new Date(),
      })
      .where(and(eq(emailSequences.id, input.id), eq(emailSequences.userId, userId)));
    return {};
  }
  const insertId = await insertAndGetId(db, emailSequences, {
    userId,
    name: input.name,
    triggerEvent: input.triggerEvent,
    bodyTemplate: input.bodyTemplate,
    isActive,
  });
  return { insertId };
}

export async function deleteEmailSequence(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(emailSequences).where(and(eq(emailSequences.id, id), eq(emailSequences.userId, userId)));
}

export async function listActiveEmailSequencesByTrigger(userId: number, triggerEvent: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(emailSequences)
    .where(
      and(
        eq(emailSequences.userId, userId),
        eq(emailSequences.triggerEvent, triggerEvent),
        eq(emailSequences.isActive, true)
      )
    );
}

export async function listMobileDevices(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(mobileDevices)
    .where(eq(mobileDevices.userId, userId))
    .orderBy(desc(mobileDevices.lastSeenAt));
}

export async function registerMobileDevice(
  userId: number,
  input: {
    platform: "ios" | "android";
    deviceKey: string;
    displayName?: string;
    pushToken?: string;
    appVersion?: string;
  }
): Promise<{ insertId?: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const key = input.deviceKey.trim();
  if (!key) throw new Error("deviceKey is required");

  const existing = await db
    .select({ id: mobileDevices.id })
    .from(mobileDevices)
    .where(and(eq(mobileDevices.userId, userId), eq(mobileDevices.deviceKey, key)))
    .limit(1);

  const now = new Date();
  if (existing.length) {
    await db
      .update(mobileDevices)
      .set({
        displayName: input.displayName ?? null,
        pushToken: input.pushToken ?? null,
        appVersion: input.appVersion ?? null,
        lastSeenAt: now,
      })
      .where(eq(mobileDevices.id, existing[0]!.id));
    return {};
  }

  const insertId = await insertAndGetId(db, mobileDevices, {
    userId,
    platform: input.platform,
    deviceKey: key,
    displayName: input.displayName ?? null,
    pushToken: input.pushToken ?? null,
    appVersion: input.appVersion ?? null,
    lastSeenAt: now,
  });
  return { insertId };
}

export async function removeMobileDevice(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(mobileDevices).where(and(eq(mobileDevices.id, id), eq(mobileDevices.userId, userId)));
}

export async function listSocialConnections(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(socialConnections)
    .where(eq(socialConnections.userId, userId))
    .orderBy(desc(socialConnections.updatedAt));
}

export async function upsertSocialConnectionStub(
  userId: number,
  provider: "linkedin" | "facebook" | "instagram" | "x"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const label = provider === "x" ? "X" : provider.charAt(0).toUpperCase() + provider.slice(1);
  await db
    .insert(socialConnections)
    .values({
      userId,
      provider,
      status: "pending_oauth",
      displayName: `${label} (OAuth pending)`,
      meta: JSON.stringify({ stub: true }),
    })
    .onDuplicateKeyUpdate({
      set: {
        status: "pending_oauth",
        displayName: `${label} (OAuth pending)`,
        updatedAt: new Date(),
      },
    });
}

export async function setSocialDisconnected(
  userId: number,
  provider: "linkedin" | "facebook" | "instagram" | "x"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(socialConnections)
    .set({ status: "disconnected", updatedAt: new Date() })
    .where(and(eq(socialConnections.userId, userId), eq(socialConnections.provider, provider)));
}

export async function listWebchatWidgets(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(webchatWidgets)
    .where(eq(webchatWidgets.userId, userId))
    .orderBy(desc(webchatWidgets.updatedAt));
}

export async function createWebchatWidget(
  userId: number,
  input: { name: string; welcomeMessage?: string; allowedOrigins?: string }
): Promise<{ insertId: number; publicKey: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const publicKey = randomBytes(32).toString("hex");
  const insertId = await insertAndGetId(db, webchatWidgets, {
    userId,
    name: input.name,
    publicKey,
    welcomeMessage: input.welcomeMessage ?? null,
    allowedOrigins: input.allowedOrigins ?? null,
    isActive: true,
  });
  return { insertId, publicKey };
}

export async function updateWebchatWidget(
  userId: number,
  id: number,
  input: {
    name?: string;
    welcomeMessage?: string | null;
    allowedOrigins?: string | null;
    isActive?: boolean;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.welcomeMessage !== undefined) patch.welcomeMessage = input.welcomeMessage;
  if (input.allowedOrigins !== undefined) patch.allowedOrigins = input.allowedOrigins;
  if (input.isActive !== undefined) patch.isActive = input.isActive;
  await db
    .update(webchatWidgets)
    .set(patch as Record<string, unknown>)
    .where(and(eq(webchatWidgets.id, id), eq(webchatWidgets.userId, userId)));
}

export async function deleteWebchatWidget(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(webchatWidgets).where(and(eq(webchatWidgets.id, id), eq(webchatWidgets.userId, userId)));
}

/** Public embed: resolve active widget by `publicKey` (64-char hex). */
export async function getWebchatWidgetByPublicKey(publicKey: string) {
  const db = await getDb();
  if (!db) return null;
  const key = publicKey.trim();
  if (key.length < 64) return null;
  const rows = await db
    .select()
    .from(webchatWidgets)
    .where(and(eq(webchatWidgets.publicKey, key), eq(webchatWidgets.isActive, true)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRcsRegistration(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(rcsRegistrations)
    .where(eq(rcsRegistrations.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertRcsRegistration(
  userId: number,
  input: { brandName: string; agentId?: string; status?: "draft" | "submitted" | "verified" }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const status = input.status ?? "draft";
  await db
    .insert(rcsRegistrations)
    .values({
      userId,
      brandName: input.brandName,
      agentId: input.agentId ?? null,
      status,
      meta: JSON.stringify({ stub: true }),
    })
    .onDuplicateKeyUpdate({
      set: {
        brandName: input.brandName,
        agentId: input.agentId ?? null,
        status,
        updatedAt: new Date(),
      },
    });
}

export async function getSentimentSummary(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, bySentiment: [] as { sentiment: string; count: number }[] };
  const rows = await db
    .select({ sentiment: callRecordings.sentiment, count: sql<number>`count(*)` })
    .from(callRecordings)
    .where(eq(callRecordings.createdBy, userId))
    .groupBy(callRecordings.sentiment);
  const total = rows.reduce((a, r) => a + Number(r.count), 0);
  return {
    total,
    bySentiment: rows.map((r) => ({
      sentiment: String(r.sentiment ?? "neutral"),
      count: Number(r.count),
    })),
  };
}

export async function upsertLeadScoringRule(
  userId: number,
  input: { id?: number; name: string; rules: unknown; isDefault?: boolean }
): Promise<{ insertId?: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const isDefault = input.isDefault ?? false;

  if (input.id) {
    if (isDefault) {
      await db.update(leadScoringRules).set({ isDefault: false }).where(eq(leadScoringRules.userId, userId));
    }
    await db
      .update(leadScoringRules)
      .set({
        name: input.name,
        rules: input.rules as Record<string, unknown>,
        isDefault,
        updatedAt: new Date(),
      })
      .where(and(eq(leadScoringRules.id, input.id), eq(leadScoringRules.userId, userId)));
    return {};
  }

  if (isDefault) {
    await db.update(leadScoringRules).set({ isDefault: false }).where(eq(leadScoringRules.userId, userId));
  }
  const insertId = await insertAndGetId(db, leadScoringRules, {
    userId,
    name: input.name,
    rules: input.rules as Record<string, unknown>,
    isDefault,
  });

  return { insertId };
}

function isMissingCreatedByColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as any;
  const query = typeof err?.query === "string" ? err.query : "";
  const causeMessage = typeof err?.cause?.sqlMessage === "string" ? err.cause.sqlMessage : "";
  const message = typeof err?.message === "string" ? err.message : "";
  return (
    (query.includes("from `leads`") || query.includes("FROM leads")) &&
    (
      message.includes("Unknown column 'createdBy'") ||
      causeMessage.includes("Unknown column 'createdBy'")
    )
  );
}

async function legacyLeadQuery(
  db: MySql2Database,
  query: string,
  params: unknown[]
): Promise<Array<Record<string, unknown>>> {
  const [rows] = await (db as any).execute(query, params);
  return Array.isArray(rows)
    ? rows.map((row: Record<string, unknown>) => ({ ...row, createdBy: null }))
    : [];
}

// ─── A/B Testing ─────────────────────────────────────────────────────────────

export async function listPromptVariants(userId: number, testName?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(promptVariants.userId, userId), eq(promptVariants.isActive, true)];
  if (testName) conditions.push(eq(promptVariants.testName, testName));
  return db.select().from(promptVariants).where(and(...conditions)).orderBy(promptVariants.testName, promptVariants.weight);
}

export async function upsertPromptVariant(
  userId: number,
  data: Omit<InsertPromptVariant, "userId" | "createdAt" | "updatedAt">
): Promise<{ insertId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const insertId = await insertAndGetId(db, promptVariants, { ...data, userId });
  return { insertId };
}

export async function deletePromptVariant(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(promptVariants).set({ isActive: false }).where(and(eq(promptVariants.id, id), eq(promptVariants.userId, userId)));
}

export async function recordAbTestResult(data: InsertAbTestResult): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(abTestResults).values(data);
}

export async function getAbTestSummary(userId: number, testName: string) {
  const db = await getDb();
  if (!db) return [];
  // Join variants for this user + testName with results
  const variants = await db
    .select()
    .from(promptVariants)
    .where(and(eq(promptVariants.userId, userId), eq(promptVariants.testName, testName)));

  const results = await Promise.all(
    variants.map(async (v) => {
      const [stats] = await db
        .select({
          total: sql<number>`count(*)`,
          converted: sql<number>`sum(converted)`,
          avgDuration: sql<number>`avg(durationSeconds)`,
        })
        .from(abTestResults)
        .where(eq(abTestResults.variantId, v.id));
      return {
        variantId: v.id,
        variantKey: v.variantKey,
        weight: v.weight,
        total: Number(stats?.total ?? 0),
        converted: Number(stats?.converted ?? 0),
        conversionRate: Number(stats?.total ?? 0) > 0
          ? Math.round((Number(stats?.converted ?? 0) / Number(stats?.total ?? 1)) * 1000) / 10
          : 0,
        avgDurationSeconds: Math.round(Number(stats?.avgDuration ?? 0)),
      };
    })
  );
  return results;
}

/**
 * Pick a prompt variant for a call using a deterministic hash of the callId.
 * Falls back to null if no active variants are found.
 */
export async function selectAbVariantForCall(
  userId: number,
  callId: string,
  testName = "voice_prompt"
): Promise<{ variantId: number; variantKey: string; promptOverride?: string | null; promptSuffix?: string | null } | null> {
  const variants = await listPromptVariants(userId, testName);
  if (!variants.length) return null;
  // Deterministic selection using hash of callId
  let hash = 0;
  for (let i = 0; i < callId.length; i++) {
    hash = ((hash << 5) - hash + callId.charCodeAt(i)) | 0;
  }
  const bucket = Math.abs(hash) % 100;
  let cumulative = 0;
  for (const v of variants) {
    cumulative += v.weight;
    if (bucket < cumulative) {
      return { variantId: v.id, variantKey: v.variantKey, promptOverride: v.promptOverride, promptSuffix: v.promptSuffix };
    }
  }
  // Fallback to last variant
  const last = variants[variants.length - 1];
  return { variantId: last.id, variantKey: last.variantKey, promptOverride: last.promptOverride, promptSuffix: last.promptSuffix };
}

// ─── Analytics: Cost, ROI, Daily Trend ───────────────────────────────────────

/** Cost per call based on duration × $0.04/min (STT+TTS+LLM estimate) */
export async function getCostPerCallStats(userId: number) {
  const db = await getDb();
  if (!db) return { avgCostCents: 0, totalCostCents: 0, totalCalls: 0 };
  const [stats] = await db
    .select({
      totalCalls: sql<number>`count(*)`,
      totalSeconds: sql<number>`sum(duration)`,
      avgSeconds: sql<number>`avg(duration)`,
    })
    .from(callRecordings)
    .where(eq(callRecordings.createdBy, userId));
  const totalSeconds = Number(stats?.totalSeconds ?? 0);
  const totalCalls = Number(stats?.totalCalls ?? 0);
  const avgSeconds = Number(stats?.avgSeconds ?? 0);
  // $0.04/min = 0.04/60 per second = 0.000667 per second → in cents: 0.06667 per second
  const COST_PER_SECOND_CENTS = (0.04 / 60) * 100;
  return {
    totalCalls,
    totalCostCents: Math.round(totalSeconds * COST_PER_SECOND_CENTS),
    avgCostCents: Math.round(avgSeconds * COST_PER_SECOND_CENTS),
    avgCostDollars: parseFloat((avgSeconds * COST_PER_SECOND_CENTS / 100).toFixed(4)),
    totalCostDollars: parseFloat((totalSeconds * COST_PER_SECOND_CENTS / 100).toFixed(2)),
  };
}

/** ROI per campaign = revenueGenerated / estimated call cost */
export async function getRoiPerCampaign(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const campaignList = await db
    .select({
      id: campaigns.id,
      name: campaigns.name,
      revenue: campaigns.revenueGenerated,
      sentCount: campaigns.sentCount,
      convertedCount: campaigns.convertedCount,
      totalContacts: campaigns.totalContacts,
    })
    .from(campaigns)
    .where(eq(campaigns.createdBy, userId));

  return campaignList.map((c) => {
    const revenue = Number(c.revenue ?? 0);
    const calls = Number(c.sentCount ?? 0);
    // Assume avg 3 min per call @ $0.04/min
    const estimatedCostDollars = calls * 3 * 0.04;
    const roi = estimatedCostDollars > 0
      ? parseFloat(((revenue - estimatedCostDollars) / estimatedCostDollars * 100).toFixed(1))
      : 0;
    return {
      campaignId: c.id,
      campaignName: c.name,
      revenueDollars: revenue,
      estimatedCostDollars: parseFloat(estimatedCostDollars.toFixed(2)),
      roiPercent: roi,
      convertedCount: Number(c.convertedCount ?? 0),
      totalContacts: Number(c.totalContacts ?? 0),
    };
  });
}

/** Day-by-day call volume for the last N days */
export async function getDailyCallTrend(userId: number, days = 30) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      day: sql<string>`DATE(calledAt)`,
      count: sql<number>`count(*)`,
      converted: sql<number>`sum(case when outcome = 'interested' or outcome = 'scheduled' then 1 else 0 end)`,
      avgDuration: sql<number>`avg(duration)`,
    })
    .from(callRecordings)
    .where(and(eq(callRecordings.createdBy, userId), sql`calledAt >= ${since}`))
    .groupBy(sql`DATE(calledAt)`)
    .orderBy(sql`DATE(calledAt)`);

  return rows.map((r) => ({
    day: String(r.day),
    calls: Number(r.count),
    converted: Number(r.converted ?? 0),
    avgDurationSeconds: Math.round(Number(r.avgDuration ?? 0)),
  }));
}

// ─── CRM: Real HubSpot + Salesforce sync ─────────────────────────────────────

/** Retrieve stored OAuth tokens from crm_connections.meta for a user+provider */
export async function getCrmTokens(
  userId: number,
  provider: "salesforce" | "hubspot" | "pipedrive"
): Promise<{ accessToken: string; refreshToken?: string; instanceUrl?: string } | null> {
  const db = await getDb();
  if (!db) return null;
  const [conn] = await db
    .select()
    .from(crmConnections)
    .where(and(eq(crmConnections.userId, userId), eq(crmConnections.provider, provider)));
  if (!conn || conn.status !== "connected") return null;
  try {
    const meta = JSON.parse(conn.meta ?? "{}");
    if (!meta.accessToken) return null;
    return { accessToken: meta.accessToken, refreshToken: meta.refreshToken, instanceUrl: meta.instanceUrl };
  } catch {
    return null;
  }
}

/** Store OAuth tokens after exchange */
export async function saveCrmTokens(
  userId: number,
  provider: "salesforce" | "hubspot" | "pipedrive",
  tokens: { accessToken: string; refreshToken?: string; instanceUrl?: string; portalId?: string; displayName?: string }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(crmConnections)
    .set({
      status: "connected",
      displayName: tokens.displayName ?? provider,
      externalAccountId: tokens.portalId ?? tokens.instanceUrl ?? undefined,
      lastSyncAt: new Date(),
      meta: JSON.stringify({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        instanceUrl: tokens.instanceUrl,
        portalId: tokens.portalId,
      }),
      updatedAt: new Date(),
    })
    .where(and(eq(crmConnections.userId, userId), eq(crmConnections.provider, provider)));
}

/** Auto-save a persistent memory from a call to customerMemories (bypasses lead ownership check) */
export async function saveCallMemory(
  userId: number,
  leadId: number | null | undefined,
  content: string,
  source = "call"
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  if (!content.trim()) return;
  await db.insert(customerMemories).values({
    userId,
    leadId: leadId ?? null,
    content: content.trim(),
    source,
  });
}

/** Find lead by phone number for inbound caller lookup (userId-scoped variant) */
export async function getLeadByPhoneForUser(userId: number, phone: string): Promise<{ id: number; firstName: string; lastName: string } | null> {
  const db = await getDb();
  if (!db) return null;
  // Try exact match first, then with/without +1
  const normalized = phone.replace(/\D/g, "");
  const [row] = await db
    .select({ id: leads.id, firstName: leads.firstName, lastName: leads.lastName })
    .from(leads)
    .where(and(
      eq(leads.createdBy, userId),
      or(
        eq(leads.phone, phone),
        like(leads.phone, `%${normalized.slice(-10)}`)
      )
    ))
    .limit(1);
  return row ?? null;
}
