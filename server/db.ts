import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import type { MySql2Database } from "drizzle-orm/mysql2";
import type { ResultSetHeader } from "mysql2";
import {
  InsertUser,
  activityLogs,
  analyticsSnapshots,
  callRecordings,
  campaignContacts,
  campaigns,
  leads,
  messages,
  onboardings,
  systemConfig,
  templates,
  testimonials,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

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

// ─── Leads ────────────────────────────────────────────────────────────────────
export async function getLeads(opts?: { search?: string; segment?: string; status?: string; verificationStatus?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { leads: [], total: 0 };
  const conditions = [];
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

export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result[0];
}

export async function getLeadByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leads).where(eq(leads.phone, phone)).limit(1);
  return result[0];
}

export async function createLead(data: typeof leads.$inferInsert): Promise<{ insertId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const insertId = await insertAndGetId(db, leads, data);
  return { insertId };
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
export async function getCampaigns(opts?: { status?: string; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { campaigns: [], total: 0 };
  const conditions = [];
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

export async function getCampaignContacts(campaignId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaignContacts).where(eq(campaignContacts.campaignId, campaignId)).orderBy(desc(campaignContacts.createdAt));
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
export async function getMessages(opts?: { campaignId?: number; leadId?: number; channel?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
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

export async function updateMessageStatus(id: number, status: typeof messages.$inferInsert["status"], extra?: Record<string, Date>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(messages).set({ status, ...extra }).where(eq(messages.id, id));
}

// ─── Call Recordings ──────────────────────────────────────────────────────────
export async function getCallRecordings(opts?: { campaignId?: number; leadId?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
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
export async function getTemplates(channel?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(templates.isActive, true)];
  if (channel) conditions.push(eq(templates.channel, channel as "sms" | "email" | "voice" | "social"));
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
export async function getAnalyticsSnapshots(opts?: { campaignId?: number; channel?: string; limit?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (opts?.campaignId) conditions.push(eq(analyticsSnapshots.campaignId, opts.campaignId));
  if (opts?.channel) conditions.push(eq(analyticsSnapshots.channel, opts.channel as "sms" | "email" | "voice" | "social" | "all"));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(analyticsSnapshots).where(where).orderBy(desc(analyticsSnapshots.date)).limit(opts?.limit ?? 30);
}

export async function getGlobalMetrics() {
  const db = await getDb();
  if (!db) return { responseRate: 0, scheduleRate: 0, showRate: 0, salesIncrease: 0, totalLeads: 0, totalCampaigns: 0, totalMessages: 0, totalRevenue: 0 };
  const [leadsCount, campaignsData, messagesCount, analyticsData] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(leads),
    db.select({ count: sql<number>`count(*)`, revenue: sql<number>`sum(revenueGenerated)`, responses: sql<number>`sum(responseCount)`, scheduled: sql<number>`sum(scheduledCount)`, showed: sql<number>`sum(showCount)`, sent: sql<number>`sum(sentCount)`, converted: sql<number>`sum(convertedCount)` }).from(campaigns),
    db.select({ count: sql<number>`count(*)` }).from(messages),
    db.select({ avgResponse: sql<number>`avg(responseRate)`, avgSchedule: sql<number>`avg(scheduleRate)`, avgShow: sql<number>`avg(showRate)`, avgConversion: sql<number>`avg(conversionRate)` }).from(analyticsSnapshots),
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

export async function getActivityLogs(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit);
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
