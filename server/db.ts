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

export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    return result[0];
  } catch (error: any) {
    if (!isMissingCreatedByColumnError(error)) throw error;
    console.warn("[Database] leads.createdBy missing in live schema - falling back to legacy lead select by id");
    const rows = await legacyLeadQuery(
      db,
      "SELECT id, firstName, lastName, email, phone, company, industry, title, linkedinUrl, website, city, state, country, score, segment, verificationStatus, status, source, notes, tags, customFields, createdAt, updatedAt FROM leads WHERE id = ? LIMIT 1",
      [id]
    );
    return rows[0];
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
  if (!db) return { responseRate: 0, scheduleRate: 0, showRate: 0, salesIncrease: 0, totalLeads: 0, totalCampaigns: 0, totalMessages: 0, totalRevenue: 0 };
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
export async function getUserIdByPhoneNumber(phoneNumber: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    // Check user_phone_numbers table (provisioned numbers)
    const [rows] = await (db as any).execute(
      "SELECT userId FROM user_phone_numbers WHERE phoneNumber = ? AND isActive = TRUE LIMIT 1",
      [phoneNumber]
    );
    if (Array.isArray(rows) && rows.length > 0) return (rows[0] as any).userId;
  } catch { /* table may not exist yet */ }
  return 1; // Fallback to system admin
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
