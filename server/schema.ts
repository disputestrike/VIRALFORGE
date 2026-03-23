import {
  bigint,
  varchar,
  text,
  timestamp,
  
  decimal,
  int,
  boolean,
  json,
  index,
  unique,
  mysqlTable,
  primaryKey,
  foreignKey,
} from "drizzle-orm/mysql-core";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MULTI-TENANT SAAS SCHEMA
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ─── CORE: CUSTOMERS ──────────────────────────────────────────────────────

export const customers = mysqlTable(
  "customers",
  {
    id: varchar("id", { length: 64 }).primaryKey(), // cust_xxx
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).notNull().unique(),
    companyName: varchar("company_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    phone: varchar("phone", { length: 20 }),
    website: varchar("website", { length: 255 }),
    industry: varchar("industry", { length: 100 }),
    teamSize: int("team_size").default(1),
    
    // Subscription
    status: varchar("status", ["trial", "active", "paused", "cancelled"]).notNull().default("trial"),
    plan: varchar("plan", ["starter", "growth", "enterprise"]).notNull().default("starter"),
    
    // Limits
    monthlyLeadLimit: int("monthly_lead_limit").notNull().default(5000),
    monthlyLeadsUsed: int("monthly_leads_used").notNull().default(0),
    successFeePercentage: decimal("success_fee_percentage", { precision: 5, scale: 2 }).notNull().default("20"),
    
    // API
    apiKey: varchar("api_key", { length: 255 }).notNull().unique(),
    apiSecret: varchar("api_secret", { length: 255 }).notNull(),
    apiKeyRotatedAt: timestamp("api_key_rotated_at"),
    
    // Webhook
    webhookUrl: varchar("webhook_url", { length: 500 }),
    webhookSecret: varchar("webhook_secret", { length: 255 }),
    
    // Settings
    timezone: varchar("timezone", { length: 50 }).default("America/New_York"),
    
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
    trialEndsAt: timestamp("trial_ends_at"),
    subscriptionEndsAt: timestamp("subscription_ends_at"),
  },
  (table) => ({
    stripeIdx: index("idx_stripe_customer_id").on(table.stripeCustomerId),
    emailIdx: index("idx_email").on(table.email),
    statusIdx: index("idx_status").on(table.status),
    apiKeyIdx: index("idx_api_key").on(table.apiKey),
  })
);

// ─── LEADS (Multi-tenant) ──────────────────────────────────────────────────

export const leads = mysqlTable(
  "leads",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    customerId: varchar("customer_id", { length: 64 }).notNull(),
    
    firstName: varchar("first_name", { length: 100 }).notNull(),
    lastName: varchar("last_name", { length: 100 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 20 }),
    company: varchar("company", { length: 255 }),
    title: varchar("title", { length: 100 }),
    
    // Source tracking
    source: varchar("source", { length: 50 }).notNull(), // google_ads, facebook, instagram, etc
    sourceId: varchar("source_id", { length: 255 }).unique(),
    
    // Lead scoring
    score: int("score").default(0),
    segment: varchar("segment", ["hot", "warm", "cold", "unqualified"]).default("warm"),
    
    // Status
    status: varchar("status", ["new", "contacted", "qualified", "converted", "lost"]).default("new"),
    verificationStatus: varchar("verification_status", ["verified", "unverified", "bounced", "pending"]).default("pending"),
    
    // Campaign
    campaignId: int("campaign_id"),
    
    // Metadata
    notes: text("notes"),
    tags: json("tags"),
    metadata: json("metadata"),
    
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
    lastContactedAt: timestamp("last_contacted_at"),
  },
  (table) => ({
    customerIdx: index("idx_customer_id").on(table.customerId),
    sourceIdx: index("idx_source").on(table.source),
    scoreIdx: index("idx_score").on(table.score),
    statusIdx: index("idx_status").on(table.status),
    emailIdx: index("idx_email").on(table.email),
    phoneIdx: index("idx_phone").on(table.phone),
    customerSourceIdx: index("idx_customer_source").on(table.customerId, table.source),
    fk: foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
    }),
  })
);

// ─── VOICE SESSIONS ────────────────────────────────────────────────────────

export const voiceSessions = mysqlTable(
  "voice_sessions",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    customerId: varchar("customer_id", { length: 64 }).notNull(),
    leadId: bigint("lead_id", { mode: "number" }).notNull(),
    
    callId: varchar("call_id", { length: 255 }).notNull().unique(),
    status: varchar("status", ["initiated", "ringing", "in_progress", "completed", "failed"]).notNull().default("initiated"),
    
    phoneNumber: varchar("phone_number", { length: 20 }),
    phoneNumberFrom: varchar("phone_number_from", { length: 20 }),
    
    // AI State
    conversationHistory: json("conversation_history"),
    sentiment: varchar("sentiment", ["positive", "neutral", "negative"]).default("neutral"),
    
    // Appointment
    appointmentProposed: json("appointment_proposed"),
    appointmentConfirmed: boolean("appointment_confirmed").default(false),
    appointmentId: int("appointment_id"),
    
    // Recording
    recordingUrl: varchar("recording_url", { length: 500 }),
    recordingDuration: int("recording_duration"), // seconds
    transcript: text("transcript"),
    transcriptionStatus: varchar("transcription_status", ["pending", "completed", "failed"]).default("pending"),
    
    // Metrics
    duration: int("duration").default(0), // seconds
    aiTurns: int("ai_turns").default(0),
    userTurns: int("user_turns").default(0),
    
    // Timestamps
    startTime: timestamp("start_time").defaultNow().notNull(),
    endTime: timestamp("end_time"),
    lastActivity: timestamp("last_activity").defaultNow().notNull(),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    customerIdx: index("idx_customer_id").on(table.customerId),
    leadIdx: index("idx_lead_id").on(table.leadId),
    callIdIdx: unique("idx_call_id").on(table.callId),
    statusIdx: index("idx_status").on(table.status),
    fkCustomer: foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
    }),
    fkLead: foreignKey({
      columns: [table.leadId],
      foreignColumns: [leads.id],
    }),
  })
);

// ─── APPOINTMENTS ──────────────────────────────────────────────────────────

export const appointmentBookings = mysqlTable(
  "appointment_bookings",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    customerId: varchar("customer_id", { length: 64 }).notNull(),
    leadId: bigint("lead_id", { mode: "number" }).notNull(),
    voiceSessionId: bigint("voice_session_id", { mode: "number" }),
    
    scheduledTime: timestamp("scheduled_time").notNull(),
    duration: int("duration").default(30), // minutes
    timezone: varchar("timezone", { length: 50 }).notNull().default("America/New_York"),
    
    // Status
    confirmationStatus: varchar("confirmation_status", ["proposed", "confirmed", "declined", "cancelled", "completed"]).notNull().default("proposed"),
    showStatus: varchar("show_status", ["pending", "showed", "no_show", "rescheduled"]).notNull().default("pending"),
    
    // Confirmation
    confirmationMethod: varchar("confirmation_method", ["sms", "email", "call"]),
    confirmationSent: boolean("confirmation_sent").default(false),
    confirmationSentAt: timestamp("confirmation_sent_at"),
    reminderSent: boolean("reminder_sent").default(false),
    reminderSentAt: timestamp("reminder_sent_at"),
    
    // Notes
    notes: text("notes"),
    noShowReason: varchar("no_show_reason", { length: 255 }),
    
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    customerIdx: index("idx_customer_id").on(table.customerId),
    leadIdx: index("idx_lead_id").on(table.leadId),
    scheduledIdx: index("idx_scheduled_time").on(table.scheduledTime),
    confirmationIdx: index("idx_confirmation_status").on(table.confirmationStatus),
    showIdx: index("idx_show_status").on(table.showStatus),
    fkCustomer: foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
    }),
    fkLead: foreignKey({
      columns: [table.leadId],
      foreignColumns: [leads.id],
    }),
  })
);

// ─── LEAD SOURCE CONNECTIONS ──────────────────────────────────────────────

export const leadSourceConnections = mysqlTable(
  "lead_source_connections",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    customerId: varchar("customer_id", { length: 64 }).notNull(),
    
    provider: varchar("provider", { length: 50 }).notNull(), // google_ads, facebook, instagram, etc
    status: varchar("status", ["connecting", "connected", "error", "disconnected"]).notNull().default("connecting"),
    
    // Encrypted tokens
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at"),
    
    // Webhook
    webhookId: varchar("webhook_id", { length: 255 }),
    
    // Metadata
    metadata: json("metadata"),
    lastSyncAt: timestamp("last_sync_at"),
    errorMessage: text("error_message"),
    
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    customerIdx: index("idx_customer_id").on(table.customerId),
    providerIdx: index("idx_provider").on(table.provider),
    customerProviderIdx: unique("idx_customer_provider").on(table.customerId, table.provider),
    fkCustomer: foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
    }),
  })
);

// ─── JOB QUEUE ─────────────────────────────────────────────────────────────

export const jobQueue = mysqlTable(
  "job_queue",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    customerId: varchar("customer_id", { length: 64 }).notNull(),
    
    jobId: varchar("job_id", { length: 255 }).notNull().unique(),
    jobType: varchar("job_type", [
      "call_lead",
      "send_sms",
      "send_email",
      "book_appointment",
      "follow_up",
      "voicemail_transcribe",
      "reminder",
    ]).notNull(),
    
    status: varchar("status", ["pending", "processing", "completed", "failed"]).notNull().default("pending"),
    priority: int("priority").default(50),
    
    data: json("data"),
    result: json("result"),
    errorMessage: text("error_message"),
    
    attemptNumber: int("attempt_number").default(1),
    maxAttempts: int("max_attempts").default(3),
    
    scheduledFor: timestamp("scheduled_for"),
    processedAt: timestamp("processed_at"),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    customerIdx: index("idx_customer_id").on(table.customerId),
    jobIdIdx: unique("idx_job_id").on(table.jobId),
    statusIdx: index("idx_status").on(table.status),
    jobTypeIdx: index("idx_job_type").on(table.jobType),
    scheduledIdx: index("idx_scheduled_for").on(table.scheduledFor),
    fkCustomer: foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
    }),
  })
);

// ─── BILLING ───────────────────────────────────────────────────────────────

export const invoices = mysqlTable(
  "invoices",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    customerId: varchar("customer_id", { length: 64 }).notNull(),
    stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }).unique(),
    
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("usd"),
    
    status: varchar("status", ["draft", "open", "paid", "void", "uncollectible"]).notNull().default("open"),
    dueDate: timestamp("due_date"),
    paidAt: timestamp("paid_at"),
    
    description: text("description"),
    items: json("items"),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    customerIdx: index("idx_customer_id").on(table.customerId),
    stripeIdx: index("idx_stripe_invoice_id").on(table.stripeInvoiceId),
    statusIdx: index("idx_status").on(table.status),
    fkCustomer: foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
    }),
  })
);

// ─── BILLING TRANSACTIONS ──────────────────────────────────────────────────

export const billingTransactions = mysqlTable(
  "billing_transactions",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    customerId: varchar("customer_id", { length: 64 }).notNull(),
    
    stripeTransactionId: varchar("stripe_transaction_id", { length: 255 }).unique().notNull(),
    type: varchar("type", ["monthly_plan", "success_fee", "overage", "refund"]).notNull(),
    
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("usd"),
    
    status: varchar("status", ["pending", "completed", "failed", "refunded"]).notNull().default("pending"),
    idempotencyKey: varchar("idempotency_key", { length: 255 }).unique(),
    
    description: text("description"),
    metadata: json("metadata"),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    customerIdx: index("idx_customer_id").on(table.customerId),
    stripeIdx: index("idx_stripe_transaction_id").on(table.stripeTransactionId),
    idempotencyIdx: unique("idx_idempotency_key").on(table.idempotencyKey),
    fkCustomer: foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
    }),
  })
);

// ─── AUDIT LOG ─────────────────────────────────────────────────────────────

export const auditLog = mysqlTable(
  "audit_log",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    customerId: varchar("customer_id", { length: 64 }).notNull(),
    
    userId: varchar("user_id", { length: 255 }),
    action: varchar("action", { length: 50 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: varchar("entity_id", { length: 255 }),
    
    changesBefore: json("changes_before"),
    changesAfter: json("changes_after"),
    
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    
    metadata: json("metadata"),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    customerIdx: index("idx_customer_id").on(table.customerId),
    actionIdx: index("idx_action").on(table.action),
    entityIdx: index("idx_entity").on(table.entityType, table.entityId),
    createdIdx: index("idx_created_at").on(table.createdAt),
    fkCustomer: foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
    }),
  })
);

// ─── WEBHOOKS (FOR TRACKING INCOMING) ──────────────────────────────────────

export const webhookEvents = mysqlTable(
  "webhook_events",
  {
    id: bigint("id", { mode: "number" }).primaryKey().autoincrement(),
    customerId: varchar("customer_id", { length: 64 }).notNull(),
    
    provider: varchar("provider", { length: 50 }).notNull(),
    eventId: varchar("event_id", { length: 255 }).notNull().unique(),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    
    payload: json("payload"),
    signatureVerified: boolean("signature_verified").default(false),
    
    status: varchar("status", ["received", "processing", "completed", "failed"]).notNull().default("received"),
    errorMessage: text("error_message"),
    
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    customerIdx: index("idx_customer_id").on(table.customerId),
    eventIdIdx: unique("idx_event_id").on(table.eventId),
    providerIdx: index("idx_provider").on(table.provider),
    statusIdx: index("idx_status").on(table.status),
    fkCustomer: foreignKey({
      columns: [table.customerId],
      foreignColumns: [customers.id],
    }),
  })
);

export type Customer = typeof customers.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type VoiceSession = typeof voiceSessions.$inferSelect;
export type AppointmentBooking = typeof appointmentBookings.$inferSelect;
export type LeadSourceConnection = typeof leadSourceConnections.$inferSelect;
export type JobQueueRecord = typeof jobQueue.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type BillingTransaction = typeof billingTransactions.$inferSelect;
export type AuditLogRecord = typeof auditLog.$inferSelect;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
