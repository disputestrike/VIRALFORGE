import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Transfer number — where to route live call handoffs
  transferNumber: varchar("transferNumber", { length: 20 }),
  // Language preference for AI voice
  language: varchar("language", { length: 20 }).default("en"),
  // Plan tier
  plan: varchar("plan", { length: 50 }).default("trial"),
  /** Stripe Customer id (cus_...) — set after first checkout or portal */
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  stripeSubscriptionStatus: varchar("stripeSubscriptionStatus", { length: 64 }),
  // Agency settings
  isAgency: boolean("isAgency").default(false),
  agencyName: varchar("agencyName", { length: 200 }),
  whiteLabel: boolean("whiteLabel").default(false),
  // Google Calendar integration
  gcalRefreshToken: text("gcalRefreshToken"),
  gcalBookingUrl: varchar("gcalBookingUrl", { length: 500 }),
  businessName: varchar("businessName", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Leads ────────────────────────────────────────────────────────────────────
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 30 }),
  company: varchar("company", { length: 200 }),
  industry: varchar("industry", { length: 100 }),
  title: varchar("title", { length: 150 }),
  linkedinUrl: varchar("linkedinUrl", { length: 500 }),
  website: varchar("website", { length: 500 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }),
  score: int("score").default(0).notNull(),
  segment: mysqlEnum("segment", ["hot", "warm", "cold", "unqualified"]).default("cold").notNull(),
  verificationStatus: mysqlEnum("verificationStatus", ["verified", "unverified", "bounced", "pending"]).default("pending").notNull(),
  status: mysqlEnum("status", ["new", "contacted", "qualified", "converted", "lost"]).default("new").notNull(),
  source: varchar("source", { length: 100 }),
  createdBy: int("createdBy"),
  notes: text("notes"),
  tags: text("tags"),
  customFields: text("customFields"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ─── Templates ────────────────────────────────────────────────────────────────
export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  channel: mysqlEnum("channel", ["sms", "email", "voice", "social"]).notNull(),
  subject: varchar("subject", { length: 500 }),
  body: text("body").notNull(),
  variables: text("variables"),
  isActive: boolean("isActive").default(true).notNull(),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

// ─── Campaigns ────────────────────────────────────────────────────────────────
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  channels: text("channels"),
  status: mysqlEnum("status", ["draft", "active", "paused", "completed", "archived"]).default("draft").notNull(),
  goal: mysqlEnum("goal", ["appointments", "demos", "sales", "awareness", "follow_up"]).default("appointments").notNull(),
  industry: varchar("industry", { length: 100 }),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  dailyLimit: int("dailyLimit").default(50),
  totalContacts: int("totalContacts").default(0),
  sentCount: int("sentCount").default(0),
  responseCount: int("responseCount").default(0),
  scheduledCount: int("scheduledCount").default(0),
  showCount: int("showCount").default(0),
  convertedCount: int("convertedCount").default(0),
  revenueGenerated: float("revenueGenerated").default(0),
  settings: text("settings"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

// ─── Campaign Contacts ────────────────────────────────────────────────────────
export const campaignContacts = mysqlTable("campaign_contacts", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  leadId: int("leadId").notNull(),
  status: mysqlEnum("status", ["pending", "contacted", "responded", "scheduled", "showed", "converted", "failed", "opted_out"]).default("pending").notNull(),
  channel: mysqlEnum("channel", ["sms", "email", "voice", "social"]),
  lastContactedAt: timestamp("lastContactedAt"),
  nextContactAt: timestamp("nextContactAt"),
  attempts: int("attempts").default(0),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CampaignContact = typeof campaignContacts.$inferSelect;

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId"),
  leadId: int("leadId").notNull(),
  channel: mysqlEnum("channel", ["sms", "email", "voice", "social"]).notNull(),
  direction: mysqlEnum("direction", ["outbound", "inbound"]).default("outbound").notNull(),
  status: mysqlEnum("status", ["queued", "sent", "delivered", "read", "replied", "failed", "bounced"]).default("queued").notNull(),
  subject: varchar("subject", { length: 500 }),
  body: text("body"),
  templateId: int("templateId"),
  sentAt: timestamp("sentAt"),
  deliveredAt: timestamp("deliveredAt"),
  readAt: timestamp("readAt"),
  repliedAt: timestamp("repliedAt"),
  metadata: text("metadata"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;

// ─── Call Recordings ──────────────────────────────────────────────────────────
export const callRecordings = mysqlTable("call_recordings", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  campaignId: int("campaignId"),
  messageId: int("messageId"),
  duration: int("duration").default(0),
  status: mysqlEnum("status", ["completed", "no_answer", "voicemail", "failed", "busy"]).default("completed").notNull(),
  outcome: mysqlEnum("outcome", ["interested", "not_interested", "callback", "scheduled", "voicemail", "no_answer"]).default("no_answer").notNull(),
  transcript: text("transcript"),
  recordingUrl: varchar("recordingUrl", { length: 1000 }),
  aiSummary: text("aiSummary"),
  sentiment: mysqlEnum("sentiment", ["positive", "neutral", "negative"]),
  scheduledAppointment: boolean("scheduledAppointment").default(false),
  createdBy: int("createdBy"),
  calledAt: timestamp("calledAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CallRecording = typeof callRecordings.$inferSelect;

// ─── Analytics Snapshots ──────────────────────────────────────────────────────
export const analyticsSnapshots = mysqlTable("analytics_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId"),
  date: timestamp("date").defaultNow().notNull(),
  totalContacts: int("totalContacts").default(0),
  totalSent: int("totalSent").default(0),
  totalResponses: int("totalResponses").default(0),
  totalScheduled: int("totalScheduled").default(0),
  totalShowed: int("totalShowed").default(0),
  totalConverted: int("totalConverted").default(0),
  responseRate: float("responseRate").default(0),
  scheduleRate: float("scheduleRate").default(0),
  showRate: float("showRate").default(0),
  conversionRate: float("conversionRate").default(0),
  revenueGenerated: float("revenueGenerated").default(0),
  costPerLead: float("costPerLead").default(0),
  roi: float("roi").default(0),
  channel: mysqlEnum("channel", ["sms", "email", "voice", "social", "all"]).default("all"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnalyticsSnapshot = typeof analyticsSnapshots.$inferSelect;

// ─── Testimonials ─────────────────────────────────────────────────────────────
export const testimonials = mysqlTable("testimonials", {
  id: int("id").autoincrement().primaryKey(),
  clientName: varchar("clientName", { length: 200 }).notNull(),
  industry: varchar("industry", { length: 100 }).notNull(),
  company: varchar("company", { length: 200 }),
  quote: text("quote").notNull(),
  beforeMetric: varchar("beforeMetric", { length: 500 }),
  afterMetric: varchar("afterMetric", { length: 500 }),
  specificResult: varchar("specificResult", { length: 500 }),
  resultValue: varchar("resultValue", { length: 200 }),
  avatarUrl: varchar("avatarUrl", { length: 1000 }),
  isActive: boolean("isActive").default(true).notNull(),
  featured: boolean("featured").default(false).notNull(),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = typeof testimonials.$inferInsert;

// ─── Onboarding ───────────────────────────────────────────────────────────────
export const onboardings = mysqlTable("onboardings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientName: varchar("clientName", { length: 200 }).notNull(),
  industry: varchar("industry", { length: 100 }),
  status: mysqlEnum("status", ["not_started", "in_progress", "completed"]).default("not_started").notNull(),
  setupDay: timestamp("setupDay"),
  supportEndDate: timestamp("supportEndDate"),
  completedSteps: text("completedSteps"),
  notes: text("notes"),
  specialistName: varchar("specialistName", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Onboarding = typeof onboardings.$inferSelect;
export type InsertOnboarding = typeof onboardings.$inferInsert;

// ─── Activity Log ─────────────────────────────────────────────────────────────
export const activityLogs = mysqlTable("activity_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  entityType: varchar("entityType", { length: 50 }).notNull(),
  entityId: int("entityId"),
  action: varchar("action", { length: 100 }).notNull(),
  description: text("description"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLogs.$inferSelect;

// ─── System Config ────────────────────────────────────────────────────────────
export const systemConfig = mysqlTable("system_config", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  category: varchar("category", { length: 50 }).notNull().default("general"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SystemConfig = typeof systemConfig.$inferSelect;

// ─── User Industry Packs ──────────────────────────────────────────────────────
export const userIndustryPacks = mysqlTable("user_industry_packs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  industry: varchar("industry", { length: 100 }).notNull(), // solar, hvac, roofing, insurance, realestate, general
  isActive: boolean("isActive").default(true).notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(), // which industry the AI uses for inbound calls
  planTier: varchar("planTier", { length: 50 }).default("base"), // base, addon
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserIndustryPack = typeof userIndustryPacks.$inferSelect;
export type InsertUserIndustryPack = typeof userIndustryPacks.$inferInsert;

// ─── User Phone Numbers ───────────────────────────────────────────────────────
export const userPhoneNumbers = mysqlTable("user_phone_numbers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  phoneNumber: varchar("phoneNumber", { length: 20 }).notNull(),
  signalwireSid: varchar("signalwireSid", { length: 255 }),
  friendlyName: varchar("friendlyName", { length: 200 }),
  isActive: boolean("isActive").default(true).notNull(),
  isPrimary: boolean("isPrimary").default(true).notNull(),
  industry: varchar("industry", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserPhoneNumber = typeof userPhoneNumbers.$inferSelect;
export type InsertUserPhoneNumber = typeof userPhoneNumbers.$inferInsert;

// ─── Agency Sub-Accounts ──────────────────────────────────────────────────────
export const agencyClients = mysqlTable("agency_clients", {
  id: int("id").autoincrement().primaryKey(),
  agencyUserId: int("agencyUserId").notNull(),      // the agency owner
  clientUserId: int("clientUserId"),                 // ApexAI user if they have one
  clientName: varchar("clientName", { length: 200 }).notNull(),
  clientEmail: varchar("clientEmail", { length: 320 }),
  clientPhone: varchar("clientPhone", { length: 20 }),
  businessName: varchar("businessName", { length: 200 }),
  industry: varchar("industry", { length: 100 }),
  plan: varchar("plan", { length: 50 }).default("starter"),
  status: mysqlEnum("status", ["active","paused","cancelled","pending"]).default("active").notNull(),
  minutesIncluded: int("minutesIncluded").default(500),
  minutesUsed: int("minutesUsed").default(0),
  // Billing
  monthlyRate: float("monthlyRate").default(149),    // what agency charges client
  costToAgency: float("costToAgency").default(99),   // what they pay ApexAI
  // Settings
  transferNumber: varchar("transferNumber", { length: 20 }),
  language: varchar("language", { length: 20 }).default("en"),
  aiPhoneNumber: varchar("aiPhoneNumber", { length: 20 }),
  signalwireSid: varchar("signalwireSid", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AgencyClient = typeof agencyClients.$inferSelect;
export type InsertAgencyClient = typeof agencyClients.$inferInsert;

// ─── Knowledge base (website crawl + document ingestion) — Part 1 feature #2 ─
export const knowledgeBases = mysqlTable("knowledge_bases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  /** JSON: siteUrl, title, description, logoUrl, faviconUrl, primaryColor — filled when crawling a website */
  brandProfile: text("brandProfile"),
  status: mysqlEnum("status", ["training", "active", "failed"]).default("training").notNull(),
  trainingProgress: int("trainingProgress").default(0).notNull(),
  lastTrainedAt: timestamp("lastTrainedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgeBase = typeof knowledgeBases.$inferSelect;
export type InsertKnowledgeBase = typeof knowledgeBases.$inferInsert;

export const knowledgeBaseSources = mysqlTable("knowledge_base_sources", {
  id: int("id").autoincrement().primaryKey(),
  knowledgeBaseId: int("knowledgeBaseId").notNull(),
  sourceType: mysqlEnum("sourceType", [
    "website",
    "pdf",
    "word",
    "txt",
    "html",
    "markdown",
    "faq",
  ]).notNull(),
  sourceUrl: varchar("sourceUrl", { length: 2048 }),
  fileName: varchar("fileName", { length: 255 }),
  filePath: varchar("filePath", { length: 2048 }),
  fileSize: int("fileSize"),
  contentHash: varchar("contentHash", { length: 64 }),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KnowledgeBaseSource = typeof knowledgeBaseSources.$inferSelect;
export type InsertKnowledgeBaseSource = typeof knowledgeBaseSources.$inferInsert;

export const knowledgeBaseChunks = mysqlTable("knowledge_base_chunks", {
  id: int("id").autoincrement().primaryKey(),
  knowledgeBaseId: int("knowledgeBaseId").notNull(),
  sourceId: int("sourceId"),
  content: text("content").notNull(),
  /** JSON array of floats — OpenAI `text-embedding-3-small` written by `knowledgeBaseIngestion.ts` */
  embedding: text("embedding"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type KnowledgeBaseChunk = typeof knowledgeBaseChunks.$inferSelect;
export type InsertKnowledgeBaseChunk = typeof knowledgeBaseChunks.$inferInsert;

// ─── Zapier outbound webhooks (`zapierEmit` on lead + call persist) ───────────
export const zapierWebhooks = mysqlTable("zapier_webhooks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  targetUrl: varchar("targetUrl", { length: 2048 }).notNull(),
  events: varchar("events", { length: 500 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ZapierWebhook = typeof zapierWebhooks.$inferSelect;
export type InsertZapierWebhook = typeof zapierWebhooks.$inferInsert;

// ─── Lead scoring rules (JSON ruleset per tenant) ────────────────────────────
export const leadScoringRules = mysqlTable("lead_scoring_rules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  rules: json("rules").notNull(),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeadScoringRuleRow = typeof leadScoringRules.$inferSelect;
export type InsertLeadScoringRule = typeof leadScoringRules.$inferInsert;

// ─── Blocked numbers (spam / DNC per tenant) — Part 1 #7 ─────────────────────
export const blockedPhoneNumbers = mysqlTable("blocked_phone_numbers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  phoneE164: varchar("phoneE164", { length: 24 }).notNull(),
  note: varchar("note", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BlockedPhoneNumber = typeof blockedPhoneNumbers.$inferSelect;
export type InsertBlockedPhoneNumber = typeof blockedPhoneNumbers.$inferInsert;

// ─── Escalation rules (keyword → transfer) — Part 1 #8 ───────────────────────
export const escalationRules = mysqlTable("escalation_rules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  keyword: varchar("keyword", { length: 200 }).notNull(),
  /** If empty, uses account transfer number from Settings */
  transferNumber: varchar("transferNumber", { length: 24 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EscalationRule = typeof escalationRules.$inferSelect;
export type InsertEscalationRule = typeof escalationRules.$inferInsert;

// ─── CRM external connections (OAuth + sync — stub metadata) — Part 1 #10 ───
export const crmConnections = mysqlTable("crm_connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: mysqlEnum("provider", ["salesforce", "hubspot", "pipedrive"]).notNull(),
  status: mysqlEnum("status", ["disconnected", "pending_oauth", "connected"]).default("pending_oauth").notNull(),
  displayName: varchar("displayName", { length: 200 }),
  externalAccountId: varchar("externalAccountId", { length: 200 }),
  lastSyncAt: timestamp("lastSyncAt"),
  /** JSON: scopes, instance URL, etc. — no raw tokens in logs */
  meta: text("meta"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CrmConnection = typeof crmConnections.$inferSelect;
export type InsertCrmConnection = typeof crmConnections.$inferInsert;

// ─── Workflows (no-code definitions — engine TBD) — Part 1 #11 ───────────────
export const workflows = mysqlTable("workflows", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  definition: json("definition").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Workflow = typeof workflows.$inferSelect;
export type InsertWorkflow = typeof workflows.$inferInsert;

// ─── Customer memory (per-tenant notes / RAG slice — Part 1 #12) ───────────
export const customerMemories = mysqlTable("customer_memories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  leadId: int("leadId"),
  content: text("content").notNull(),
  source: varchar("source", { length: 64 }).default("manual"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CustomerMemory = typeof customerMemories.$inferSelect;
export type InsertCustomerMemory = typeof customerMemories.$inferInsert;

// ─── Support tickets — Part 1 #14 ────────────────────────────────────────────
export const supportTickets = mysqlTable("support_tickets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  leadId: int("leadId"),
  subject: varchar("subject", { length: 300 }).notNull(),
  body: text("body").notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "closed"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;

// ─── Email automation sequences — Part 1 #17 ─────────────────────────────────
export const emailSequences = mysqlTable("email_sequences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  triggerEvent: varchar("triggerEvent", { length: 64 }).notNull(),
  bodyTemplate: text("bodyTemplate").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailSequence = typeof emailSequences.$inferSelect;
export type InsertEmailSequence = typeof emailSequences.$inferInsert;

// ─── Mobile app devices — Part 1 #15 (push + client identity) ───────────────
export const mobileDevices = mysqlTable("mobile_devices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  platform: mysqlEnum("platform", ["ios", "android"]).notNull(),
  /** Stable ID generated by the mobile client (Keychain / Keystore). */
  deviceKey: varchar("deviceKey", { length: 128 }).notNull(),
  displayName: varchar("displayName", { length: 200 }),
  pushToken: varchar("pushToken", { length: 512 }),
  appVersion: varchar("appVersion", { length: 32 }),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MobileDevice = typeof mobileDevices.$inferSelect;
export type InsertMobileDevice = typeof mobileDevices.$inferInsert;

// ─── Social channel connections — Part 1 #16 (OAuth + posting TBD) ───────────
export const socialConnections = mysqlTable("social_connections", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: mysqlEnum("provider", ["linkedin", "facebook", "instagram", "x"]).notNull(),
  status: mysqlEnum("status", ["disconnected", "pending_oauth", "connected"]).default("pending_oauth").notNull(),
  displayName: varchar("displayName", { length: 200 }),
  meta: text("meta"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SocialConnection = typeof socialConnections.$inferSelect;
export type InsertSocialConnection = typeof socialConnections.$inferInsert;

// ─── Embeddable webchat widgets — Part 1 #19 (public script TBD) ────────────
export const webchatWidgets = mysqlTable("webchat_widgets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  /** Public token for `/api/webchat/...` embed (no session secret). */
  publicKey: varchar("publicKey", { length: 64 }).notNull().unique(),
  welcomeMessage: text("welcomeMessage"),
  /** Comma-separated origins or JSON string — validated when worker ships. */
  allowedOrigins: text("allowedOrigins"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WebchatWidget = typeof webchatWidgets.$inferSelect;
export type InsertWebchatWidget = typeof webchatWidgets.$inferInsert;

// ─── RCS brand / agent registration stub — Part 1 #18 (carrier pipeline TBD) ─
export const rcsRegistrations = mysqlTable("rcs_registrations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  brandName: varchar("brandName", { length: 200 }).notNull(),
  agentId: varchar("agentId", { length: 200 }),
  status: mysqlEnum("status", ["draft", "submitted", "verified"]).default("draft").notNull(),
  meta: text("meta"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RcsRegistration = typeof rcsRegistrations.$inferSelect;
export type InsertRcsRegistration = typeof rcsRegistrations.$inferInsert;

// ─── Voice orchestration telemetry (run `voice_metric_events.sql` if table missing) ─
export const voiceMetricEvents = mysqlTable("voice_metric_events", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 128 }),
  callId: varchar("callId", { length: 128 }),
  phase: varchar("phase", { length: 64 }).notNull(),
  msSinceCallStart: int("msSinceCallStart"),
  extra: json("extra"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VoiceMetricEvent = typeof voiceMetricEvents.$inferSelect;
export type InsertVoiceMetricEvent = typeof voiceMetricEvents.$inferInsert;

// ─── A/B Testing ─────────────────────────────────────────────────────────────────
export const promptVariants = mysqlTable("prompt_variants", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  testName: varchar("testName", { length: 200 }).notNull(),
  variantKey: varchar("variantKey", { length: 64 }).notNull(),
  promptOverride: text("promptOverride"),
  promptSuffix: text("promptSuffix"),
  /** Traffic weight 0–100; variants in same test should sum to 100 */
  weight: int("weight").notNull().default(50),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PromptVariant = typeof promptVariants.$inferSelect;
export type InsertPromptVariant = typeof promptVariants.$inferInsert;

export const abTestResults = mysqlTable("ab_test_results", {
  id: int("id").autoincrement().primaryKey(),
  variantId: int("variantId").notNull(),
  callId: varchar("callId", { length: 128 }),
  sessionId: varchar("sessionId", { length: 128 }),
  leadId: int("leadId"),
  outcome: varchar("outcome", { length: 64 }),
  converted: boolean("converted").default(false).notNull(),
  durationSeconds: int("durationSeconds").default(0),
  sentiment: varchar("sentiment", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AbTestResult = typeof abTestResults.$inferSelect;
export type InsertAbTestResult = typeof abTestResults.$inferInsert;
