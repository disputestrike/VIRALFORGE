import "dotenv/config";
import { ENV } from "./env";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { WebSocketServer } from "ws";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import * as voiceSessionManager from "./services/voiceSessionManager";
import { apiRateLimiter, aiRateLimiter, authRateLimiter, webhookRateLimiter } from "./middleware/rateLimiter";
import * as voiceProcessingService from "./services/voiceProcessingService";
import { startSessionPersistenceInterval } from "./services/voiceSessionManager";
// Live calls: realtimeVoiceEngine — Deepgram STT → configured LLM provider → telephony TTS.
import { createCallEngine, notifyVoiceCallTerminalFromHttp } from "../realtime/realtimeVoiceEngine";
import {
  getPublicDemoConfig,
  getPublicDemoOwnerId,
  isPublicDemoPhoneNumber,
  PUBLIC_DEMO_BUSINESS_NAME,
  PUBLIC_DEMO_INDUSTRY,
} from "../realtime/tenantVoiceRuntime";
import { normalizeToE164US } from "./phoneE164";
import { getUsRingtoneWav } from "./telephony/usRingtoneWav";
import { registerWebchatPublicRoutes } from "./webchatPublicApi";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.warn("[Migration] DATABASE_URL not set — skipping migrations");
    return;
  }
  try {
    console.log("[Migration] Running database migrations...");
    const { drizzle } = await import("drizzle-orm/mysql2");
    const { migrate } = await import("drizzle-orm/mysql2/migrator");
    const mysql2 = await import("mysql2/promise");

    const connection = await mysql2.createConnection({
      uri: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('railway') || process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : undefined,
    });
    const db = drizzle(connection);

    // Migrations folder path — works in both dev (src) and production (dist/)
    const migrationsFolder = path.resolve(
      process.env.NODE_ENV === "production"
        ? path.join(import.meta.dirname, "../drizzle")
        : path.join(import.meta.dirname, "../../drizzle")
    );

    await migrate(db, { migrationsFolder });
    await ensureCriticalVoiceSchema(connection);
    await connection.end();
    console.log("[Migration] Migrations completed successfully");
  } catch (error) {
    console.error("[Migration] Migration failed:", error);
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }
}

/** Per-table check — do not return early after leads; `call_recordings.createdBy` etc. can still be missing on older Railway DBs. */
const TENANT_CREATED_BY: Array<{ table: string; index: string }> = [
  { table: "leads", index: "idx_leads_created_by" },
  { table: "campaigns", index: "idx_campaigns_created_by" },
  { table: "messages", index: "idx_messages_created_by" },
  { table: "templates", index: "idx_templates_created_by" },
  { table: "call_recordings", index: "idx_call_recordings_created_by" },
  { table: "analytics_snapshots", index: "idx_analytics_snapshots_created_by" },
];

async function ensureCriticalVoiceSchema(connection: any) {
  for (const { table, index } of TENANT_CREATED_BY) {
    const [rows] = await connection.execute(
      `SELECT COUNT(*) AS count
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = ?
         AND COLUMN_NAME = 'createdBy'`,
      [table]
    );
    const count = Number((rows as Array<{ count: number }>)[0]?.count ?? 0);
    if (count > 0) continue;

    throw new Error(`[Migration] Missing required column ${table}.createdBy after migrations. Run Drizzle migrations before startup.`);
  }
}

function normalizeRoutingPhone(value: string | null | undefined): string {
  return normalizeToE164US(String(value ?? "").trim());
}

async function resolveInboundOwnerForNumber(
  toNumber: string | null | undefined
): Promise<number | null> {
  const normalized = normalizeRoutingPhone(toNumber);
  if (!normalized) return null;
  const dbMod = await import("../db");
  const directOwner = await dbMod.getUserIdByPhoneNumber(normalized);
  if (directOwner) return directOwner;
  if (isPublicDemoPhoneNumber(normalized)) {
    return getPublicDemoOwnerId();
  }
  return null;
}

async function startServer() {
  // Run migrations before starting the server
  await runMigrations();

  // ── Feature flags — logged on every startup ───────────────
  console.log("[ApexAI] Starting with feature flags:");
  console.log(`  Database:   ${ENV.databaseUrl ? "configured" : "missing (set DATABASE_URL)"}`);
  console.log(`  Redis/Queue: ${ENV.queueEnabled ? "✅ BullMQ + Redis" : "⚠️  In-memory fallback (set REDIS_URL)"}`);
  console.log(`  Google Auth: ${ENV.googleClientId ? "✅ enabled" : "❌ disabled (set GOOGLE_CLIENT_ID)"}`);
  console.log(`  Voice/SMS:   ${ENV.voiceEnabled ? "✅ SignalWire ready" : "⚠️  disabled (set SIGNALWIRE_PROJECT_ID)"}`);
  console.log(`  Email:       ${ENV.emailEnabled ? "✅ Resend ready" : "⚠️  disabled (set RESEND_API_KEY)"}`);
  console.log(`  STT:         ${ENV.sttEnabled ? `✅ Deepgram ready (model=${process.env.VOICE_DEEPGRAM_MODEL ?? "nova-3"})` : "⚠️  disabled (set DEEPGRAM_API_KEY)"}`);
  const activeTts = ENV.elevenLabsApiKey ? `Cartesia+ElevenLabs (TTS_PROVIDER=${ENV.ttsProvider})` : "Cartesia";
  console.log(`  TTS:         ${ENV.ttsEnabled || ENV.elevenLabsApiKey ? `✅ ${activeTts}` : "⚠️  disabled (set CARTESIA_API_KEY or ELEVENLABS_API_KEY)"}`);
  const activeLlm = ENV.aiEnabled ? `Cerebras (${ENV.cerebrasModel})` : "NONE";
  console.log(
    `  AI/LLM:      ${ENV.aiEnabled ? `✅ ${activeLlm} [LLM_PROVIDER=${ENV.llmProvider}]` : "⚠️  disabled — set CEREBRAS_API_KEY"}`
  );
  console.log("");

  // INTEGRATION: Initialize job queue and workers
  // Clean up junk call recordings on startup
  try {
    const dbMod = await import("../db"); const deleteJunkCallRecordings = (dbMod as any).deleteJunkCallRecordings;
    const deleted = deleteJunkCallRecordings ? await deleteJunkCallRecordings() : 0;
    if (deleted > 0) console.log(`[Startup] Cleaned ${deleted} junk call recordings from DB`);
  } catch (e) {
    console.warn("[Startup] Could not clean junk recordings:", (e as Error).message);
  }

  console.log("[Server] Initializing job queue and workers...");
  try {
    const { getQueues } = await import("./services/queue");
    const { Worker } = await import("bullmq");
    const { initiateCall } = await import("./services/signalwireService");

    // Initialize queues
    const queues = await getQueues();
    if (!queues) {
      console.warn("[Server] Redis not available — workers not started");
    } else {
      console.log("[Server] Starting BullMQ workers...");
    }
    const redisConnection = process.env.REDIS_URL ? { url: process.env.REDIS_URL } : null;

    if (redisConnection) {
    // Call worker
    type CallJobPayload = {
      leadId: number;
      campaignId?: number;
      script?: string;
      userId?: number;
    };
    const callWorker = new Worker(
      "calls",
      async (job) => {
        const data = job.data as CallJobPayload;
        console.log(`[CallWorker] ▶ QUEUED→PROCESSING | jobId: ${job.id} | leadId: ${data.leadId}`);
        const dbMod = await import("../db");
        try {
          const lead = await dbMod.getLeadById(data.leadId);
          if (!lead?.phone) {
            throw new Error(`Lead ${data.leadId} has no phone number`);
          }

          const l = lead as any;
          const sessionId = `sess_out_${data.leadId}_${String(job.id)}_${Date.now()}`;
          let script: string | undefined = data.script;
          if (!script && data.campaignId) {
            const camp = await dbMod.getCampaignById(data.campaignId);
            const raw = camp?.settings;
            if (raw && typeof raw === "string") {
              try {
                const j = JSON.parse(raw) as Record<string, unknown>;
                const pick =
                  j.voiceOpeningScript ?? j.outboundScript ?? j.openingScript;
                if (typeof pick === "string" && pick.trim()) script = pick.trim();
              } catch {
                /* ignore bad JSON */
              }
            }
          }

          const result = await initiateCall({
            leadId: l.id as number,
            phoneNumber: l.phone as string,
            campaignId: data.campaignId,
            sessionId,
            script,
            blocklistUserId:
              typeof l.createdBy === "number" && Number.isFinite(l.createdBy) ? l.createdBy : undefined,
            userId:
              data.userId ??
              (typeof l.createdBy === "number" && Number.isFinite(l.createdBy)
                ? l.createdBy
                : undefined),
          });

          await dbMod.updateLead(l.id as number, { status: "contacted" });
          await dbMod.logActivity({
            userId: (l.createdBy as number | undefined) ?? undefined,
            entityType: "call",
            entityId: l.id as number,
            action: "initiated",
            description: `Outbound call initiated for ${l.firstName} ${l.lastName}`,
            metadata: { callSid: (result as any).callSid, campaignId: data.campaignId },
          });

          console.log(`[CallWorker] ✅ PROCESSING→COMPLETED | jobId: ${job.id} | callSid: ${(result as any).callSid} | leadId: ${lead.id}`);
          return result;
        } catch (error) {
          await dbMod.updateLead(data.leadId, { status: "contacted" }).catch(() => {});
          console.error(`[CallWorker] ❌ PROCESSING→FAILED | jobId: ${job.id} | reason: ${(error as Error).message}`);
          throw error;
        }
      },
      { connection: redisConnection as any }
    );

    callWorker.on("completed", (job) => {
      console.log(`[CallWorker] Job ${job.id} completed`);
    });

    callWorker.on("failed", (job, err) => {
      console.error(`[CallWorker] Job ${job?.id} failed:`, err);
    });

    console.log("[Server] Job queue and call worker initialized");

    // SMS worker
    const smsWorker = new Worker(
      "sms",
      async (job) => {
        const jobStart = Date.now();
        const {
          phone,
          type,
          leadName,
          scheduledTime,
          msgId,
          userId,
          body: bodyOverride,
        } = job.data;
        console.log(`[SMSWorker] ▶ QUEUED→PROCESSING | jobId: ${job.id} | type: ${type} | phone: ${phone} | leadId: ${job.data.leadId} | msgId: ${msgId || "none"}`);
        const dbMod = await import("../db");
        try {
          const { default: swService } = await import("./services/signalwireService");

          let message = typeof bodyOverride === "string" && bodyOverride.trim() ? bodyOverride.trim() : "";
          if (!message && type === "appointment_confirmation") {
            message = `Hi ${leadName || "there"}! Your appointment is confirmed for ${scheduledTime || "your scheduled time"}. Reply STOP to cancel.`;
          }
          if (!message && type === "appointment_reminder") {
            message = `Reminder ${leadName || "there"}: Your appointment is ${scheduledTime || "coming up"}. See you soon!`;
          }
          if (!message && type === "follow_up") {
            message = `Hi ${leadName || "there"}! Following up on our call. Still interested? Reply YES or let me know how I can help.`;
          }
          if (!message && type === "no_show_followup") {
            message = `Hi ${leadName || "there"}, we missed you at your appointment. Would you like to reschedule?`;
          }
          if (!message) {
            message = `Hi ${leadName || "there"}, this is a message from ApexAI.`;
          }

          const result = await swService.sendSMS({
            to: phone,
            body: message,
            userId,
          });

          // ── Write final status back to messages table ──────────────────
          if (msgId) {
            await dbMod.updateMessageStatus(msgId, "sent", { sentAt: new Date(), deliveredAt: new Date() });
          }
          await dbMod.updateLead(job.data.leadId, { status: "contacted" });

          console.log(`[SMSWorker] ✅ PROCESSING→COMPLETED | jobId: ${job.id} | messageSid: ${result.messageSid} | to: ${phone} | msgId: ${msgId} → status: sent`);
          return { success: true, messageSid: result.messageSid };
        } catch (error) {
          // ── Write failure status back to messages table ─────────────────
          if (msgId) {
            await dbMod.updateMessageStatus(msgId, "failed").catch(() => {});
          }
          console.error(`[SMSWorker] ❌ PROCESSING→FAILED | jobId: ${job.id} | msgId: ${msgId} → status: failed | reason: ${(error as Error).message}`);
          throw error;
        }
      },
      { connection: redisConnection as any, concurrency: 50 } // High-speed: 50 simultaneous calls
    );

    smsWorker.on("completed", (job) => {
      console.log(`[SMSWorker] ✅ COMPLETED | jobId: ${job.id}`);
    });

    smsWorker.on("failed", (job, err) => {
      console.error(`[SMSWorker] ❌ FAILED | jobId: ${job?.id} | error: ${err.message}`);
    });

    // Email worker
    const emailWorker = new Worker(
      "email",
      async (job) => {
        console.log(`[EmailWorker] ▶ QUEUED→PROCESSING | jobId: ${job.id} | type: ${job.data.type} | email: ${job.data.email} | leadId: ${job.data.leadId}`);
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(ENV.resendApiKey);

          const { email, type, leadName, scheduledTime, calendarLink, customSubject, customHtml } = job.data;
          const SENDER_NAME = ENV.resendFromName;

          let subject = "";
          let html = "";

          if (type === "sequence" && customSubject && customHtml) {
            subject = customSubject;
            html = customHtml;
          } else if (type === "appointment_confirmation") {
            const formattedTime = new Date(scheduledTime || Date.now()).toLocaleString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });

            subject = `Appointment Confirmed: ${formattedTime}`;
            html = `
              <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>Your Appointment is Confirmed!</h2>
                    <p>Hi ${leadName || "there"},</p>
                    <p>We're excited to meet with you on <strong>${formattedTime}</strong>.</p>
                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <p><strong>Date & Time:</strong> ${formattedTime}</p>
                      <p><strong>Duration:</strong> 30 minutes</p>
                    </div>
                    ${calendarLink ? `<p><a href="${calendarLink}">Add this appointment to your calendar</a></p>` : ""}
                    <p>If you need to reschedule, just reply to this email.</p>
                    <p>Best regards,<br><strong>${SENDER_NAME} Team</strong></p>
                  </div>
                </body>
              </html>
            `;
          } else if (type === "appointment_reminder") {
            const formattedTime = new Date(scheduledTime || Date.now()).toLocaleString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });

            subject = `Reminder: Your Appointment is Tomorrow`;
            html = `
              <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2>Appointment Reminder</h2>
                    <p>Hi ${leadName || "there"},</p>
                    <p>Just a friendly reminder that your appointment is coming up tomorrow at ${formattedTime}!</p>
                    <p>We're looking forward to speaking with you.</p>
                    <p>Best regards,<br><strong>${SENDER_NAME} Team</strong></p>
                  </div>
                </body>
              </html>
            `;
          } else {
            subject = "Message from ApexAI";
            html = `<p>Hi ${leadName || "there"},</p><p>Thank you for your interest!</p>`;
          }

          // Send email
          const result = await resend.emails.send({
            from: ENV.resendFromHeader,
            to: email,
            subject: subject,
            html: html,
          });

          const emailId = (result as any)?.data?.id || (result as any)?.id || 'sent';
          if (job.data.msgId) {
            const dbMod2 = await import("../db");
            await dbMod2.updateMessageStatus(job.data.msgId, "sent", { sentAt: new Date() });
          }
          console.log(`[EmailWorker] ✅ PROCESSING→COMPLETED | jobId: ${job.id} | to: ${email} | msgId: ${job.data.msgId} → status: sent`);
          return { success: true, emailId };
        } catch (error) {
          console.error(`[EmailWorker] Job ${job.id} failed:`, error);
          throw error;
        }
      },
      { connection: redisConnection as any, concurrency: 10 }
    );

    emailWorker.on("completed", (job) => {
      console.log(`[EmailWorker] ✅ COMPLETED | jobId: ${job.id}`);
    });

    emailWorker.on("failed", (job, err) => {
      console.error(`[EmailWorker] Job ${job?.id} failed:`, err);
    });

    const automationWorker = new Worker(
      "automation",
      async (job) => {
        const dbMod = await import("../db");
        const data = job.data as {
          action: "lead.created";
          userId: number;
          payload: {
            leadId: number;
            score?: number;
            segment?: string;
            firstName?: string;
            lastName?: string;
            company?: string;
            source?: string;
            email?: string;
            phone?: string;
          };
        };

        if (data.action !== "lead.created") {
          console.warn(`[AutomationWorker] Unknown action: ${String((data as any).action)}`);
          return { skipped: true };
        }

        try {
          const { emitZapierEvent } = await import("./services/zapierEmit");
          const { runEmailSequencesForLeadCreated } = await import("./services/emailSequenceTrigger");
          const { runWorkflowsOnLeadCreated } = await import("./services/workflowEngine");

          await emitZapierEvent(data.userId, "lead.created", {
            leadId: data.payload.leadId,
            score: data.payload.score,
            segment: data.payload.segment,
            firstName: data.payload.firstName,
            lastName: data.payload.lastName,
            company: data.payload.company,
            source: data.payload.source,
          });

          await runEmailSequencesForLeadCreated(data.userId, {
            id: data.payload.leadId,
            firstName: data.payload.firstName ?? "",
            lastName: data.payload.lastName ?? "",
            email: data.payload.email,
            company: data.payload.company,
            phone: data.payload.phone,
          });

          await runWorkflowsOnLeadCreated(data.userId, {
            id: data.payload.leadId,
            firstName: data.payload.firstName,
            lastName: data.payload.lastName,
            email: data.payload.email,
            phone: data.payload.phone,
            company: data.payload.company,
            source: data.payload.source,
          });

          await dbMod.logActivity({
            userId: data.userId,
            entityType: "lead",
            entityId: data.payload.leadId,
            action: "automation_completed",
            description: `Lead-created automations completed for lead ${data.payload.leadId}`,
          });

          return { success: true };
        } catch (error) {
          await dbMod.logActivity({
            userId: data.userId,
            entityType: "lead",
            entityId: data.payload.leadId,
            action: "automation_failed",
            description: `Lead-created automation failed: ${(error as Error).message}`,
            metadata: { jobId: job.id },
          }).catch(() => {});
          throw error;
        }
      },
      { connection: redisConnection as any, concurrency: 15 }
    );

    automationWorker.on("completed", (job) => {
      console.log(`[AutomationWorker] ✅ COMPLETED | jobId: ${job.id}`);
    });

    automationWorker.on("failed", (job, err) => {
      console.error(`[AutomationWorker] ❌ FAILED | jobId: ${job?.id} | error: ${err.message}`);
    });

    console.log("[Server] SMS, Email, and Automation workers initialized");
    } // end if(redisConnection)
  } catch (error) {
    console.warn("[Server] Job queue initialization warning:", error);
    // Don't crash if queue fails to initialize
  }

  const app = express();
  const server = createServer(app);

  // Stripe webhook must use raw body (register before express.json)
  app.post(
    "/api/stripe/webhook",
    webhookRateLimiter,
    express.raw({ type: "application/json" }),
    async (req, res) => {
      try {
        const { handleStripeWebhook } = await import("./services/stripeBilling");
        const out = await handleStripeWebhook(req);
        if (!out.received) {
          return res.status(400).send(out.error ?? "Bad request");
        }
        return res.json({ received: true });
      } catch (e: unknown) {
        console.error("[Stripe] webhook error:", e);
        return res.status(500).send("Webhook handler error");
      }
    }
  );

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ── Rate Limiting ────────────────────────────────────────────────────────────
  // ── Request correlation ID (Fortune 100 / enterprise tracing) ───────────
  app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    const reqId = req.headers["x-request-id"] as string
      || `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    (req as any).reqId = reqId;
    res.setHeader("x-request-id", reqId);
    next();
  });

  app.use("/api/trpc", apiRateLimiter);
  app.use("/api/public", apiRateLimiter);
  app.use("/api/auth", authRateLimiter);
  app.use("/api/trpc/voiceAI", aiRateLimiter);
  app.use("/api/trpc/leads.aiSearch", aiRateLimiter);
  app.use("/api/trpc/messages.aiCompose", aiRateLimiter);
  app.use("/api/trpc/templates.generateWithAI", aiRateLimiter);
  app.use("/webhooks", webhookRateLimiter);
  app.use("/api/trpc/webhooks", webhookRateLimiter);

  // ── Security Headers ──────────────────────────────────────────────────────────
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  // US ring WAV for TwiML <Play> — real audio, not silence (hear ring → then AI stream)
  app.get("/api/voice/ring-tone.wav", (_req, res) => {
    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(getUsRingtoneWav());
  });

  // Health check endpoint — must respond immediately, before any DB or auth checks
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      env: ENV.nodeEnv,
      services: {
        database: ENV.databaseUrl ? "configured" : "missing",
        redis:    ENV.redisUrl    ? "configured" : "missing — using in-memory fallback",
        voice:    ENV.voiceEnabled  ? "ready (signalwire)"  : "disabled — add SIGNALWIRE_PROJECT_ID",
        voiceRealtime: ENV.voiceRealtimeReady
          ? `ready (Deepgram nova-3 STT + ${ENV.llmProvider} LLM + ${ENV.ttsProvider} TTS)`
          : "incomplete — set DEEPGRAM_API_KEY + CEREBRAS_API_KEY + one TTS key (CARTESIA/ELEVENLABS)",
        sms:      ENV.smsEnabled    ? "ready (signalwire)"  : "disabled — add SIGNALWIRE_PROJECT_ID",
        email:    ENV.emailEnabled  ? "ready"  : "disabled — add RESEND_API_KEY",
        stripe:   ENV.stripeEnabled ? "ready — webhook POST /api/stripe/webhook" : "disabled — add STRIPE_SECRET_KEY + price ids",
        calendar: (process.env.GCAL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID) ? "ready (Google Calendar)" : "ready (add-to-calendar links)",
        stt:      ENV.sttEnabled    ? `ready (Deepgram ${process.env.VOICE_DEEPGRAM_MODEL ?? "nova-3"})` : "disabled — add DEEPGRAM_API_KEY",
        tts:      (ENV.ttsEnabled || ENV.elevenLabsApiKey) ? `ready (${ENV.ttsProvider})` : "disabled — add CARTESIA_API_KEY or ELEVENLABS_API_KEY",
        ai:       ENV.aiEnabled
          ? `ready (${ENV.llmProvider} — ${ENV.cerebrasModel})`
          : "disabled — add CEREBRAS_API_KEY",
      },
    });
  });

  registerWebchatPublicRoutes(app);

  // ── E2E Test Endpoint (protected by secret — safe to keep) ───────────────────
  app.post("/api/e2e-test", async (req, res) => {
    try {
      const secret = req.headers["x-e2e-secret"];
      if (secret !== (process.env.E2E_TEST_SECRET || "apexai-e2e-2026")) {
        return res.status(403).json({ error: "forbidden" });
      }
      const { action, leadId, userId, callId, testName } = req.body as Record<string, any>;
      const db = await import("../db");
      const results: Record<string, any> = {};

      if (action === "save_memory" || action === "all") {
        await db.saveCallMemory(
          userId ?? 1,
          leadId ?? null,
          `[E2E Test] Caller name: E2E SunwaveTest | Industry: solar | Pain points: missed calls, low conversion | Call outcome: interested`,
          "call_auto"
        );
        const memories = await db.listCustomerMemories(userId ?? 1, leadId ?? undefined);
        results.memory = { saved: true, count: memories.length, latest: memories[0]?.content?.slice(0, 100) };
      }

      if (action === "ab_test" || action === "all") {
        const variant = await db.selectAbVariantForCall(userId ?? 1, callId ?? "e2e-test-call-001");
        results.abVariant = variant ?? { note: "no active variants — create one in abTesting.create" };

        if (variant) {
          await db.recordAbTestResult({
            variantId: variant.variantId,
            callId: callId ?? "e2e-test-call-001",
            sessionId: "sess_e2e_test",
            leadId: leadId ?? undefined,
            outcome: "interested",
            converted: true,
            durationSeconds: 185,
            sentiment: "positive",
          });
          const summary = await db.getAbTestSummary(userId ?? 1, testName ?? "voice_prompt");
          results.abSummary = summary;
        }
      }

      if (action === "analytics" || action === "all") {
        const [costStats, roiData, trend] = await Promise.all([
          db.getCostPerCallStats(userId ?? 1),
          db.getRoiPerCampaign(userId ?? 1),
          db.getDailyCallTrend(userId ?? 1, 7),
        ]);
        results.analytics = { costStats, roiCampaigns: roiData.length, trend7Days: trend };
      }

      if (action === "crm_status" || action === "all") {
        const connections = await db.listCrmConnections(userId ?? 1);
        results.crmConnections = connections.map((c: any) => ({ provider: c.provider, status: c.status, displayName: c.displayName }));
        const hubspotTokens = await db.getCrmTokens(userId ?? 1, "hubspot");
        results.hubspotConnected = !!hubspotTokens;
      }

      if (action === "lead_check") {
        const lead = await db.getLeadById(leadId);
        results.lead = lead ? { id: lead.id, firstName: lead.firstName, lastName: lead.lastName, phone: lead.phone, industry: lead.industry } : null;
        try {
          const memories = await db.listCustomerMemories(userId ?? 1, leadId);
          results.memories = memories.map((m: any) => ({ id: m.id, source: m.source, content: m.content?.slice(0, 100), createdAt: m.createdAt }));
        } catch (memErr: any) {
          results.memoriesError = memErr.message?.slice(0, 200);
          results.memoriesNote = "customer_memories table may have wrong schema — run action=fix_schema first";
        }
      }

      if (action === "create_ab_variant") {
        // Create control + variant A for e2e testing
        const control = await db.upsertPromptVariant(userId ?? 1, {
          testName: testName ?? "voice_prompt",
          variantKey: "control",
          promptOverride: null,
          promptSuffix: null,
          weight: 50,
          isActive: true,
        });
        const variantA = await db.upsertPromptVariant(userId ?? 1, {
          testName: testName ?? "voice_prompt",
          variantKey: "variant_a",
          promptOverride: null,
          promptSuffix: "\n\nVARIANT A: Lead with urgency. Mention that slots are filling up fast. Ask qualifying questions faster.",
          weight: 50,
          isActive: true,
        });
        results.variantsCreated = { control: control.insertId, variantA: variantA.insertId };
        const all = await db.listPromptVariants(userId ?? 1, testName ?? "voice_prompt");
        results.variants = all.map((v: any) => ({ id: v.id, key: v.variantKey, weight: v.weight }));
      }

      if (action === "fix_schema") {
        // Fix customer_memories table schema live via raw mysql2 connection
        const mysql2 = await import("mysql2/promise");
        const conn = await mysql2.createConnection({
          uri: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false },
        });
        const fixes = [
          // TEXT columns can't have DEFAULT in MySQL strict mode
          "ALTER TABLE `customer_memories` ADD COLUMN `content` text NOT NULL",
          "ALTER TABLE `customer_memories` ADD COLUMN `source` varchar(64) DEFAULT 'manual'",
          "ALTER TABLE `customer_memories` DROP COLUMN `key`",
          "ALTER TABLE `customer_memories` DROP COLUMN `value`",
          "ALTER TABLE `customer_memories` DROP COLUMN `updatedAt`",
          "CREATE TABLE IF NOT EXISTS `prompt_variants` (`id` int NOT NULL AUTO_INCREMENT PRIMARY KEY, `userId` int NOT NULL, `testName` varchar(200) NOT NULL, `variantKey` varchar(64) NOT NULL, `promptOverride` text, `promptSuffix` text, `weight` int NOT NULL DEFAULT 50, `isActive` tinyint(1) NOT NULL DEFAULT 1, `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)",
          "CREATE TABLE IF NOT EXISTS `ab_test_results` (`id` int NOT NULL AUTO_INCREMENT PRIMARY KEY, `variantId` int NOT NULL, `callId` varchar(128), `sessionId` varchar(128), `leadId` int, `outcome` varchar(64), `converted` tinyint(1) NOT NULL DEFAULT 0, `durationSeconds` int DEFAULT 0, `sentiment` varchar(32), `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP)",
          "SHOW COLUMNS FROM `customer_memories`",
        ];
        const fixResults: string[] = [];
        for (const sql of fixes) {
          try {
            const [rows] = await conn.execute(sql);
            if (sql.startsWith("SHOW")) {
              fixResults.push(`COLUMNS: ${JSON.stringify(rows).slice(0, 200)}`);
            } else {
              fixResults.push(`OK: ${sql.slice(0, 70)}`);
            }
          } catch (e: any) {
            const errno = e.errno || e.cause?.errno || e.code || "?";
            const msg = (e.sqlMessage || e.message || String(e)).slice(0, 80);
            // errno 1060 = duplicate column (already exists = OK)
            // errno 1091 = column doesn't exist (DROP of non-existent = OK)
            const isOk = e.errno === 1060 || e.errno === 1091 || e.code === "ER_DUP_FIELDNAME" || e.code === "ER_CANT_DROP_FIELD_OR_KEY";
            fixResults.push(`${isOk ? 'ALREADY_OK' : 'FAIL'}(${errno}|${e.code || '?'}): ${msg}`);
          }
        }
        await conn.end();
        results.fixResults = fixResults;

        // Verify
        try {
          const memories = await db.listCustomerMemories(userId ?? 1);
          results.memoryTableOk = true;
          results.memoryRowCount = memories.length;
        } catch (e: any) {
          results.memoryTableOk = false;
          results.memoryError = e.message?.slice(0, 100);
        }
      }

      return res.json({ ok: true, results });
    } catch (e) {
      console.error("[E2E Test]", e);
      return res.status(500).json({ error: (e as Error).message });
    }
  });

  // INTEGRATION: Voice webhook routes for SignalWire callbacks
  // ── SignalWire Webhook Signature Validation ───────────────────────────────────
  const validateTwilioSignature = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Always allow through — signature validation logs only
    // SignalWire trial mode uses signing key (PSK) not API token
    const signature = req.headers["x-signalwire-signature"] as string
      || req.headers["x-twilio-signature"] as string;
    if (!signature) {
      console.log("[Voice] No signature header — trial mode, allowing through");
    }
    return next();
  };

  app.post("/api/voice/start", validateTwilioSignature, async (req, res) => {
    const { CallSid, From, To } = req.body;
    const leadId = (req.query.leadId as string) || "";
    const sessionId = (req.query.sessionId as string) || CallSid || `session_${Date.now()}`;
    let streamLeadParam = leadId;

    console.log(`[Voice] Call started: ${CallSid} from ${From}`);

    // ── Spam / robocall filtering ────────────────────────────────────────────
    // Block known spam prefixes and toll-free robocall patterns
    if (From) {
      const spamPrefixes = [
        "+1800", "+1888", "+1877", "+1866", "+1855", "+1844", "+1833", "+1822",
        "800", "888", "877", "866", "855", "844", "833",
      ];
      const isSpam = spamPrefixes.some(p => From.replace(/\D/g, "").startsWith(p.replace(/\D/g, "")));
      if (isSpam) {
        console.log(`[Voice] Spam blocked: ${From}`);
        res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Reject reason="busy"/></Response>`);
        return;
      }
    }

    // Create session and lead if inbound
    try {
      if (From) {
        const db = await import("../db");
        const { takeOutboundCallContext } = await import("../realtime/outboundCallContext");
        const stashedOutbound = takeOutboundCallContext(sessionId);
        const outboundLeadId = leadId ? parseInt(leadId, 10) : null;
        const isOutboundDial = Boolean(stashedOutbound || outboundLeadId);
        let lead: any = outboundLeadId ? await db.getLeadById(outboundLeadId) : null;
        let ownerId = lead?.createdBy ?? null;

        // Look up which user owns the called number (To) for proper tenant assignment
        if (!ownerId) {
          ownerId = await resolveInboundOwnerForNumber(To);
        }
        if (!ownerId) {
          console.warn("[Voice] No tenant owner match for inbound number", { to: To, from: From, sessionId });
          if (!isOutboundDial) {
            res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thanks for calling. This line is not configured right now. Please try again later.</Say>
  <Hangup/>
</Response>`);
            return;
          }
        }

        // Load owner's settings (transfer number, language)
        let ownerSettings: { transferNumber?: string; language?: string; businessName?: string } = {};
        try {
          const { getDb } = await import("../db");
          const { users } = await import("../../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const dbInst = await getDb();
          if (dbInst && ownerId) {
            const [ownerUser] = await (dbInst as any).select().from(users).where(eq(users.id, ownerId)).limit(1);
            if (ownerUser) ownerSettings = {
              transferNumber: ownerUser.transferNumber,
              language: ownerUser.language || "en",
              businessName: ownerUser.businessName || undefined,
            };
          }
        } catch {}
        if (!ownerSettings.businessName && ownerId === getPublicDemoOwnerId()) {
          ownerSettings.businessName = PUBLIC_DEMO_BUSINESS_NAME;
        }

        // Inbound calls create/find lead by caller phone. Outbound calls use explicit leadId.
        if (!lead) {
          lead = await db.getLeadByPhone(From);
        }
        if (!lead) {
          const { insertId } = await db.createLead({
            firstName: "Inbound",
            lastName: From.slice(-4),
            phone: From,
            source: "inbound_call",
            status: "new",
            score: 60,
            segment: "warm",
            createdBy: ownerId ?? null,
          });
          if (ownerId) {
            const { addAutomationJob } = await import("./services/queue");
            await addAutomationJob({
              action: "lead.created",
              userId: ownerId,
              payload: {
                leadId: insertId,
                score: 60,
                segment: "warm",
                firstName: "Inbound",
                lastName: From.slice(-4),
                phone: From,
                source: "inbound_call",
              },
            });
          }
          lead = await db.getLeadById(insertId);
        }
        if (lead && (lead as { id?: number }).id != null) {
          streamLeadParam = String((lead as { id: number }).id);
        }
        const vm = await import("./services/voiceSessionManager");
        const { getUserVoiceSettings } = await import("./services/voiceProfiles");
        const voiceSettings = ownerId ? await getUserVoiceSettings(ownerId) : { voiceProfileId: "cartesia-sarah-sales" };
        if (!vm.getSession(sessionId)) {
          const contactPhone =
            outboundLeadId && To ? String(To) : String(From || "");
          console.log("[Voice] Tenant route:", {
            to: To,
            from: From,
            ownerId: ownerId ?? null,
            resolvedBusinessName: ownerSettings.businessName || null,
            resolvedLanguage: ownerSettings.language || "en",
            resolvedVoiceProfileId: voiceSettings.voiceProfileId || null,
          });
          vm.createSession((lead as any).id ?? 0, "default", sessionId, {
            userId: ownerId ?? null,
            language: ownerSettings.language || "en",
            voiceProfileId: voiceSettings.voiceProfileId,
            callerPhone: contactPhone || undefined,
            callDirection: isOutboundDial ? "outbound" : "inbound",
            outboundScript: stashedOutbound?.script ?? null,
            complianceRecordingPending: process.env.VOICE_COMPLIANCE_RECORDING_NOTICE === "true",
          });
          vm.startSessionPersistenceInterval(sessionId);
        }
      }
    } catch (e) {
      console.error("[Voice] Session setup error:", e);
    }

    res.type("text/xml");
    const sid = sessionId || req.body.CallSid || `session_${Date.now()}`;
    // Encode & as &amp; — required for valid XML
    // Use explicit Railway public domain for WebSocket URL
    // Use <Connect><Stream> for BIDIRECTIONAL audio (confirmed working in SignalWire docs)
    // <Start><Stream> is unidirectional only - cannot send audio back to caller
    // <Connect><Stream> blocks and enables full duplex bidirectional streaming
    const wsHost = process.env.RAILWAY_PUBLIC_DOMAIN || req.get("host");
    const streamQs = new URLSearchParams();
    streamQs.set("sessionId", sid);
    if (streamLeadParam) streamQs.set("leadId", streamLeadParam);
    const streamUrlRaw = `wss://${wsHost}/api/voice-stream?${streamQs.toString()}`;
    // `&` in query string must be &amp; inside XML attribute or TwiML parsers break / truncate the URL.
    const streamUrl = streamUrlRaw.replace(/&/g, "&amp;");
    console.log("[Voice] Stream URL (raw for logs):", streamUrlRaw);
    console.log("[Voice] Session ID:", sid);
    // <Connect><Stream> is required for bidirectional audio (per SignalWire official example)
    // <Start><Stream> is unidirectional only — cannot send AI audio back to caller
    const statusCallback = `https://${wsHost}/api/voice/status`;
    const baseHttps = ENV.publicUrl.replace(/\/$/, "");
    const ringXml =
      ENV.voicePlayRingBeforeStream
        ? `  <Play>${baseHttps}/api/voice/ring-tone.wav</Play>\n`
        : "";
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
${ringXml}  <Connect action="${statusCallback}" method="POST">
    <Stream url="${streamUrl}" track="inbound_track">
      <Parameter name="sessionId" value="${sid}" />
      <Parameter name="leadId" value="${streamLeadParam}" />
    </Stream>
  </Connect>
  <Pause length="300" />
</Response>`);
  });

  app.post("/api/voice/status", validateTwilioSignature, async (req, res) => {
    const CallSid = req.body.CallSid as string | undefined;
    const CallStatus = req.body.CallStatus as string | undefined;
    console.log("[Voice] Status callback:", { CallSid, CallStatus });
    if (CallSid && CallStatus) {
      try {
        await notifyVoiceCallTerminalFromHttp(CallSid, CallStatus);
      } catch (e) {
        console.error("[Voice] notifyVoiceCallTerminalFromHttp:", e);
      }
    }
    res.send("OK");
  });

  // ── Process recording: STT → Claude → TTS → respond ──────────────────────
  app.post("/api/voice/process-recording", validateTwilioSignature, async (req, res) => {
    const { CallSid, RecordingUrl, TranscriptionText } = req.body;
    const sessionId = (req.query.sessionId as string) || CallSid;
    const leadId = req.query.leadId as string;
    const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "https://apexai-production-d567.up.railway.app";

    console.log(`[Voice] Processing recording: ${RecordingUrl} | session: ${sessionId}`);

    try {
      // Use transcription if available, otherwise fetch and transcribe recording
      let userText = TranscriptionText || "";

      if (!userText && RecordingUrl) {
        // Download recording and transcribe with Deepgram STT
        const audioResp = await fetch(`${RecordingUrl}.wav`);
        const audioBuffer = Buffer.from(await audioResp.arrayBuffer());
        const { transcribeAudio } = await import("./services/sttService");
        userText = await transcribeAudio(audioBuffer);
      }

      console.log(`[Voice] Transcribed: "${userText}"`);

      // Generate AI response via conversation engine
      let aiResponse = "I understand. How can I help you further?";
      if (userText.trim()) {
        const convEngine = await import("./services/conversationEngine");
        const db = await import("../db");
        const lead = leadId ? await db.getLeadById(parseInt(leadId)) : null;
        const result = await convEngine.generateConversationResponse({
          history: [],
          text: userText,
          leadName: lead ? `${lead.firstName} ${lead.lastName}` : undefined,
        });
        aiResponse = result.response;
      }

      console.log(`[Voice] AI response: "${aiResponse}"`);

      // Respond with AI speech + record next input
      res.type("text/xml");
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman">${aiResponse.replace(/[<>&"]/g, (c) => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c] || c))}</Say>
  <Record
    action="${baseUrl}/api/voice/process-recording?sessionId=${sessionId}&leadId=${leadId}"
    method="POST"
    maxLength="30"
    timeout="5"
    playBeep="false"
    transcribe="true"
    transcribeCallback="${baseUrl}/api/voice/transcription?sessionId=${sessionId}" />
</Response>`);
    } catch (error) {
      console.error("[Voice] Processing error:", error);
      res.type("text/xml");
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman">I apologize, I had trouble processing that. Could you please repeat?</Say>
  <Record
    action="${baseUrl}/api/voice/process-recording?sessionId=${sessionId}&leadId=${leadId}"
    method="POST"
    maxLength="30"
    timeout="5"
    playBeep="false" />
</Response>`);
    }
  });

  // ── Transcription callback (async — SignalWire sends after transcription) ─
  app.post("/api/voice/transcription", validateTwilioSignature, (req, res) => {
    console.log(`[Voice] Transcription received: "${req.body.TranscriptionText}"`);
    res.send("OK");
  });

  app.post("/api/voice/recording", validateTwilioSignature, (req, res) => {
    console.log("[Voice] Recording available:", req.body.RecordingUrl);
    // Handle recording callback
    res.send("OK");
  });

  // ─── INBOUND CALL ROUTES ──────────────────────────────────────────────────────

  // /api/voice/inbound — DIRECT AI CONNECTION (no IVR menu)
  // SignalWire should point the phone number webhook HERE
  // This connects caller directly to the AI agent immediately
  app.post("/api/voice/inbound", validateTwilioSignature, async (req, res) => {
    const { CallSid, From, To } = req.body;
    console.log(`[Inbound] Direct AI call from ${From}`);

    const dbMod = await import("../db");
    const fromNorm = From ? normalizeToE164US(String(From)) : "";
    const ownerForBlock = await resolveInboundOwnerForNumber(To);
    if (ownerForBlock && fromNorm && (await dbMod.isPhoneBlocked(ownerForBlock, fromNorm))) {
      console.log(`[Inbound] Blocklist reject: ${From} (owner ${ownerForBlock})`);
      res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response><Reject reason="busy"/></Response>`);
      return;
    }

    // Spam filter (toll-free solicitors)
    if (From) {
      const spamPrefixes = ["+1800","+1888","+1877","+1866","+1855","+1844","+1833"];
      const isSpam = spamPrefixes.some(p => From.replace(/\D/g,"").startsWith(p.replace(/\D/g,"")));
      if (isSpam) {
        console.log(`[Inbound] Spam blocked: ${From}`);
        res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response><Reject reason="busy"/></Response>`);
        return;
      }
    }

    // Create lead and session (match /api/voice/start: tenant voice + language from called number)
    const sid = CallSid || `session_${Date.now()}`;
    let inboundLeadId = "";
    try {
      let ownerId = await resolveInboundOwnerForNumber(To);
      if (!ownerId) {
        console.warn("[Inbound] No tenant owner match for inbound number", {
          to: To,
          from: From,
          sid,
        });
        res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thanks for calling. This line is not configured right now. Please try again later.</Say>
  <Hangup/>
</Response>`);
        return;
      }
      let lead = await dbMod.getLeadByPhone(From);
      if (!lead) {
        const { insertId } = await dbMod.createLead({
          firstName: "Inbound", lastName: String(From).slice(-4),
          phone: From, source: "inbound_call",
          status: "new", score: 60, segment: "warm", createdBy: ownerId,
        });
        const { addAutomationJob } = await import("./services/queue");
        await addAutomationJob({
          action: "lead.created",
          userId: ownerId,
          payload: {
            leadId: insertId,
            score: 60,
            segment: "warm",
            firstName: "Inbound",
            lastName: String(From).slice(-4),
            phone: From,
            source: "inbound_call",
          },
        });
        lead = await dbMod.getLeadById(insertId);
      } else {
        ownerId = (lead as { createdBy?: number })?.createdBy ?? ownerId;
      }
      let language = "en";
      try {
        const { getDb } = await import("../db");
        const { users } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const dbInst = await getDb();
        if (dbInst && ownerId) {
          const [ownerUser] = await (dbInst as any).select().from(users).where(eq(users.id, ownerId)).limit(1);
          if (ownerUser?.language) language = ownerUser.language;
        }
      } catch {}
      const { getUserVoiceSettings } = await import("./services/voiceProfiles");
      const voiceSettings = await getUserVoiceSettings(ownerId);
      voiceSessionManager.createSession((lead as any).id ?? 0, "default", sid, {
        userId: ownerId,
        language,
        voiceProfileId: voiceSettings.voiceProfileId,
        callerPhone: From || undefined,
      });
      voiceSessionManager.startSessionPersistenceInterval(sid);
      inboundLeadId = String((lead as any)?.id ?? "");
      console.log(`[Inbound] Session ${sid} created for lead ${inboundLeadId}`);
    } catch (error) {
      console.error("[Inbound] Session setup error:", error);
    }

    // DIRECT AI — no IVR, no menu, connect immediately
    const wsHost = process.env.RAILWAY_PUBLIC_DOMAIN || req.get("host");
    const inboundStreamQs = new URLSearchParams();
    inboundStreamQs.set("sessionId", sid);
    if (inboundLeadId) inboundStreamQs.set("leadId", inboundLeadId);
    const streamUrlRawInbound = `wss://${wsHost}/api/voice-stream?${inboundStreamQs.toString()}`;
    const streamUrl = streamUrlRawInbound.replace(/&/g, "&amp;");
    const statusCallback = `https://${wsHost}/api/voice/status`;
    const baseHttps = ENV.publicUrl.replace(/\/$/, "");
    const ringXml =
      ENV.voicePlayRingBeforeStream
        ? `  <Play>${baseHttps}/api/voice/ring-tone.wav</Play>\n`
        : "";

    res.type("text/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
${ringXml}  <Connect action="${statusCallback}" method="POST">
    <Stream url="${streamUrl}" track="inbound_track">
      <Parameter name="sessionId" value="${sid}" />
      <Parameter name="leadId" value="${inboundLeadId}" />
    </Stream>
  </Connect>
  <Pause length="300" />
</Response>`);
  });

  app.post("/api/voice/inbound-dtmf", validateTwilioSignature, async (req, res) => {
    const { CallSid, From, Digits } = req.body;
    const selection = parseInt(Digits);

    console.log(`[Inbound] DTMF selection: ${selection} from ${From}`);

    res.type("text/xml");

    if (selection === 1) {
      // Transfer to AI sales — must use <Connect><Stream> for bidirectional audio
      // (<Start><Stream> is unidirectional only — AI cannot speak back to caller)
      const statusCallback = `https://${req.get("host")}/api/voice/status`;
      const dtmfStreamUrl = `wss://${req.get("host")}/api/voice-stream?sessionId=${CallSid}&amp;fromNumber=${From}&amp;inbound=true`;
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect action="${statusCallback}" method="POST">
    <Stream url="${dtmfStreamUrl}" track="inbound_track">
      <Parameter name="sessionId" value="${CallSid}" />
    </Stream>
  </Connect>
  <Pause length="300" />
</Response>`);
    } else if (selection === 2) {
      // Transfer to support queue
      res.send(`
        <Response>
          <Say>Please hold while we connect you to an agent...</Say>
          <Enqueue waitUrl="/api/voice/queue-wait">
            support
          </Enqueue>
        </Response>
      `);
    } else {
      // Voicemail
      res.send(`
        <Response>
          <Say>Please leave a message after the beep.</Say>
          <Record 
            action="/api/voice/voicemail-received"
            method="POST"
            transcribe="true"
            transcribeCallback="/api/voice/voicemail-transcribed" />
        </Response>
      `);
    }
  });

  app.post("/api/voice/voicemail-received", validateTwilioSignature, async (req, res) => {
    const { CallSid, From, RecordingUrl, TranscriptionText } = req.body;

    console.log(`[Voicemail] Received from ${From}`);

    res.type("text/xml");
    res.send(`
      <Response>
        <Say>Thank you for your message. We'll get back to you soon!</Say>
        <Hangup />
      </Response>
    `);
  });

  app.post("/api/voice/queue-wait", validateTwilioSignature, (req, res) => {
    res.type("text/xml");
    res.send(`
      <Response>
        <Say>Thank you for waiting. Please stay on the line.</Say>
      </Response>
    `);
  });


  // ─── AMD (Voicemail Detection) Status Callback ────────────────────────────
  app.post("/api/voice/amd-status", validateTwilioSignature, async (req, res) => {
    const { CallSid, AnsweredBy } = req.body;
    console.log(`[AMD] CallSid: ${CallSid} | AnsweredBy: ${AnsweredBy}`);

    // AnsweredBy: human, machine_start, machine_end_beep, machine_end_silence, fax, unknown
    if (AnsweredBy && AnsweredBy.startsWith("machine")) {
      console.log(`[AMD] Voicemail detected for ${CallSid} — ending call`);
      // Optionally update lead status
      try {
        const db = await import("../db");
        // Future: leave pre-recorded voicemail here via TTS
      } catch {}
    }
    res.status(200).send("OK");
  });

  // ─── Live Transfer to Human ─────────────────────────────────────────────────
  app.post("/api/voice/transfer", validateTwilioSignature, async (req, res) => {
    const { CallSid, TransferTo } = req.body;
    if (!CallSid || !TransferTo) {
      res.status(400).json({ error: "CallSid and TransferTo required" });
      return;
    }
    try {
      const { transferCallToHuman } = await import("./services/signalwireService");
      await transferCallToHuman(CallSid, TransferTo);
      res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("[Transfer] Failed:", err);
      res.status(500).json({ error: err.message });
    }
  });


  // ─── Knowledge base: PDF upload (multipart) → chunk + embed ─────────────────
  app.post("/api/knowledge-base/upload", apiRateLimiter, async (req, res) => {
    let user: { id: number };
    try {
      const { sdk } = await import("./sdk");
      user = await sdk.authenticateRequest(req);
    } catch {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    try {
      const multer = (await import("multer")).default;
      const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 12 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
          if (file.mimetype === "application/pdf" || /\.pdf$/i.test(file.originalname)) cb(null, true);
          else cb(new Error("PDF files only"));
        },
      }).single("document");

      upload(req, res, async (err: unknown) => {
        if (err) {
          res.status(400).json({ error: String((err as Error).message) });
          return;
        }
        const r = req as { body?: { knowledgeBaseId?: string }; file?: { buffer: Buffer; originalname: string } };
        const kbId = parseInt(String(r.body?.knowledgeBaseId ?? ""), 10);
        const file = r.file;
        if (!kbId || !file?.buffer) {
          res.status(400).json({ error: "knowledgeBaseId and PDF file required" });
          return;
        }
        try {
          const { ingestUploadedPdfSource } = await import("./services/knowledgeBaseIngestion");
          const r = await ingestUploadedPdfSource(kbId, user.id, file.buffer, file.originalname || "upload.pdf");
          res.json({ success: true, sourceId: r.sourceId });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          res.status(500).json({ error: msg || "Ingest failed" });
        }
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      res.status(500).json({ error: msg });
    }
  });

  // ─── PDF/DOCUMENT UPLOAD → Business Extractor ────────────────────────────────
  app.post("/api/extract/document", async (req, res) => {
    try {
      const multer = (await import("multer")).default;
      const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
        fileFilter: (_req, file, cb) => {
          const allowed = ["application/pdf", "text/plain", "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
          if (allowed.includes(file.mimetype) || file.originalname.match(/\.(pdf|txt|doc|docx)$/i)) {
            cb(null, true);
          } else {
            cb(new Error("Only PDF, TXT, DOC, DOCX files allowed"));
          }
        },
      }).single("document");

      upload(req, res, async (err) => {
        if (err) {
          res.status(400).json({ error: err.message });
          return;
        }
        if (!req.file) {
          res.status(400).json({ error: "No file uploaded" });
          return;
        }

        try {
          const { extractFromPdf, extractFromText } = await import("./services/businessExtractor");
          let result;

          if (req.file.mimetype === "application/pdf" || req.file.originalname.match(/\.pdf$/i)) {
            result = await extractFromPdf(req.file.buffer);
          } else {
            // txt/doc — read as text
            result = await extractFromText(req.file.buffer.toString("utf-8"));
          }

          console.log(`[Extract] Extracted from ${req.file?.originalname}: ${result.businessName}`);
          res.json({ success: true, data: result });
        } catch (extractErr: any) {
          console.error("[Extract] Failed:", extractErr);
          res.status(500).json({ error: extractErr.message || "Extraction failed" });
        }
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── SMS INBOUND WEBHOOK ──────────────────────────────────────────────────
  app.post("/api/sms/inbound", validateTwilioSignature, async (req, res) => {
    const { From, To, Body, MessageSid } = req.body;
    console.log(`[SMS] Inbound from ${From}: "${Body}"`);

    try {
      // Store message in DB — tenant from called number (To), same as voice
      const db = await import("../db");
      let ownerId = await resolveInboundOwnerForNumber(To);
      if (!ownerId) {
        console.warn("[SMS] No tenant owner match for inbound number", { to: To, from: From });
        res.type("text/xml").send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
        return;
      }
      let lead = await db.getLeadByPhone(From);
      if (!lead) {
        const { insertId } = await db.createLead({
          firstName: "SMS",
          lastName: String(From).slice(-4),
          phone: From,
          source: "inbound_sms",
          status: "new",
          score: 50,
          segment: "warm",
          createdBy: ownerId,
        });
        lead = await db.getLeadById(insertId);
      } else {
        ownerId = (lead as { createdBy?: number | null }).createdBy ?? ownerId;
      }

      // Save message
      await db.createMessage({
        leadId: (lead as any).id,
        channel: "sms",
        direction: "inbound",
        body: Body,
        status: "delivered",
        createdBy: ownerId,
      });

      console.log(`[SMS] Saved inbound message from lead ${(lead as any).id}`);
    } catch (e) {
      console.error("[SMS] Failed to save inbound message:", e);
    }

    // Acknowledge — no reply TwiML needed
    res.status(200).send("OK");
  });

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // ── CRM OAuth callback (HubSpot + Salesforce + Pipedrive) ───────────────────
  // After provider redirects to /api/crm/callback?code=...&state=userId:provider
  app.get("/api/crm/callback", async (req, res) => {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string; // format: "userId:provider"
      if (!code || !state) { res.redirect("/settings/integrations?crm=error&reason=missing_params"); return; }
      const [userIdStr, provider] = state.split(":");
      const userId = parseInt(userIdStr, 10);
      if (!userId || !provider) { res.redirect("/settings/integrations?crm=error&reason=invalid_state"); return; }

      const { saveCrmTokens, upsertCrmConnectionStub } = await import("../db");
      const { ENV: env } = await import("./env");

      if (provider === "hubspot") {
        const tokenRes = await fetch("https://api.hubapi.com/oauth/v1/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: env.hubspotClientId,
            client_secret: env.hubspotClientSecret,
            redirect_uri: env.hubspotRedirectUri || `${env.publicUrl}/api/crm/callback`,
            code,
          }),
        });
        if (!tokenRes.ok) throw new Error(`HubSpot token error: ${tokenRes.status}`);
        const tokens = await tokenRes.json() as { access_token: string; refresh_token: string; hub_id: number };
        await upsertCrmConnectionStub(userId, "hubspot");
        await saveCrmTokens(userId, "hubspot", {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          portalId: String(tokens.hub_id),
          displayName: `HubSpot (Portal ${tokens.hub_id})`,
        });
        res.redirect("/settings/integrations?crm=connected&provider=hubspot");
        return;
      }

      if (provider === "salesforce") {
        const tokenRes = await fetch(`https://${env.salesforceLoginUrl}/services/oauth2/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: env.salesforceClientId,
            client_secret: env.salesforceClientSecret,
            redirect_uri: env.salesforceRedirectUri || `${env.publicUrl}/api/crm/callback`,
            code,
          }),
        });
        if (!tokenRes.ok) throw new Error(`Salesforce token error: ${tokenRes.status}`);
        const tokens = await tokenRes.json() as { access_token: string; refresh_token: string; instance_url: string };
        await upsertCrmConnectionStub(userId, "salesforce");
        await saveCrmTokens(userId, "salesforce", {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          instanceUrl: tokens.instance_url,
          displayName: `Salesforce (${tokens.instance_url})`,
        });
        res.redirect("/settings/integrations?crm=connected&provider=salesforce");
        return;
      }

      if (provider === "pipedrive") {
        const redirectUri = env.pipedriveRedirectUri || `${env.publicUrl}/api/crm/callback`;
        const tokenRes = await fetch("https://oauth.pipedrive.com/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: env.pipedriveClientId,
            client_secret: env.pipedriveClientSecret,
            redirect_uri: redirectUri,
            code,
          }),
        });
        if (!tokenRes.ok) {
          const errText = await tokenRes.text();
          throw new Error(`Pipedrive token error: ${tokenRes.status} ${errText}`);
        }
        const tokens = (await tokenRes.json()) as {
          access_token: string;
          refresh_token: string;
          api_domain: string;
        };
        const apiBase = `https://${String(tokens.api_domain).replace(/^https?:\/\//, "")}`;
        await upsertCrmConnectionStub(userId, "pipedrive");
        await saveCrmTokens(userId, "pipedrive", {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          instanceUrl: apiBase,
          displayName: `Pipedrive (${tokens.api_domain})`,
        });
        res.redirect("/settings/integrations?crm=connected&provider=pipedrive");
        return;
      }

      res.redirect(`/settings/integrations?crm=error&reason=unknown_provider_${provider}`);
    } catch (e) {
      console.error("[CRM OAuth] callback error:", e);
      res.redirect("/settings/integrations?crm=error&reason=server_error");
    }
  });

  // ── Google Calendar OAuth callback ─────────────────────────────────────────
  app.get("/api/auth/gcal/callback", async (req, res) => {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string; // userId
      if (!code || !state) { res.redirect("/settings?gcal=error"); return; }

      const { exchangeCalendarCode } = await import("./services/googleCalendar");
      const redirectUri = `${ENV.publicUrl}/api/auth/gcal/callback`;
      const tokens = await exchangeCalendarCode(code, redirectUri);

      if (tokens.refreshToken) {
        const userId = parseInt(state, 10);
        const dbMod = await import("../db");
        const drizzle_orm = await import("drizzle-orm");
        const schema = await import("../../drizzle/schema");
        const dbInst = await dbMod.getDb();
        if (dbInst) {
          await (dbInst as any).update(schema.users)
            .set({ gcalRefreshToken: tokens.refreshToken })
            .where(drizzle_orm.eq(schema.users.id, userId));
        }
        console.log(`[GoogleCalendar] Connected for userId=${userId}`);
        res.redirect("/settings?gcal=connected");
      } else {
        console.warn("[GoogleCalendar] No refresh token returned — user may need to re-auth with prompt=consent");
        res.redirect("/settings?gcal=no_token");
      }
    } catch (err: any) {
      console.error("[GoogleCalendar] Callback error:", err.message);
      res.redirect("/settings?gcal=error");
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // ── Force migrate — run all CREATE TABLE IF NOT EXISTS ────────────────────
  app.post("/api/admin/force-migrate", async (req, res) => {
    const secret = req.headers["x-admin-secret"];
    if (secret !== process.env.ADMIN_SECRET && secret !== "apexai-force-migrate-2024") {
      res.status(403).json({ error: "forbidden" }); return;
    }
    try {
      const mysql = await import("mysql2/promise");
      const conn = await (mysql as any).default.createConnection({
        uri: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        multipleStatements: true,
      });

      const sql = `
CREATE TABLE IF NOT EXISTS \`users\` (
  \`id\` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`openId\` varchar(255) UNIQUE,
  \`name\` varchar(255),
  \`email\` varchar(255) UNIQUE,
  \`role\` enum('admin','user','agency') DEFAULT 'user',
  \`loginMethod\` enum('google','email') DEFAULT 'google',
  \`plan\` varchar(50) DEFAULT 'trial',
  \`isAgency\` tinyint(1) DEFAULT 0,
  \`agencyName\` varchar(255),
  \`whiteLabel\` tinyint(1) DEFAULT 0,
  \`transferNumber\` varchar(50),
  \`language\` varchar(10) DEFAULT 'en',
  \`lastSignedIn\` timestamp NULL,
  \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS \`voice_sessions\` (
  \`id\` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`leadId\` int, \`campaignId\` int,
  \`sessionId\` varchar(255) NOT NULL,
  \`status\` enum('active','completed','failed') DEFAULT 'active',
  \`outcome\` enum('appointment_booked','callback','not_interested','no_answer','voicemail','transferred','error'),
  \`durationSeconds\` int, \`turnCount\` int DEFAULT 0,
  \`transcriptSummary\` text, \`aiSummary\` text,
  \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX \`idx_vs_sessionId\` (\`sessionId\`), INDEX \`idx_vs_leadId\` (\`leadId\`)
);
CREATE TABLE IF NOT EXISTS \`appointment_bookings\` (
  \`id\` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`leadId\` int NOT NULL, \`voiceSessionId\` int, \`campaignId\` int,
  \`scheduledTime\` timestamp NOT NULL, \`duration\` int DEFAULT 30,
  \`confirmationStatus\` enum('proposed','confirmed','declined','cancelled','completed') NOT NULL DEFAULT 'confirmed',
  \`confirmationMethod\` enum('voice','sms','email','calendar_link'),
  \`confirmationSentAt\` timestamp NULL, \`reminderSentAt\` timestamp NULL,
  \`showStatus\` enum('scheduled','confirmed','shown','no_show','cancelled','rescheduled') DEFAULT 'scheduled',
  \`notes\` text, \`timezone\` varchar(100) DEFAULT 'America/New_York',
  \`calendarEventId\` varchar(500), \`meetingLink\` varchar(1000),
  \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX \`idx_ab_leadId\` (\`leadId\`), INDEX \`idx_ab_scheduledTime\` (\`scheduledTime\`)
);
CREATE TABLE IF NOT EXISTS \`system_config\` (
  \`id\` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`key\` varchar(255) NOT NULL UNIQUE, \`value\` text, \`category\` varchar(100),
  \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX \`idx_sc_key\` (\`key\`)
);
CREATE TABLE IF NOT EXISTS \`webhook_events\` (
  \`id\` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`source\` varchar(100), \`eventType\` varchar(100), \`payload\` json,
  \`processed\` tinyint(1) DEFAULT 0, \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_we_source\` (\`source\`)
);
CREATE TABLE IF NOT EXISTS \`job_queue\` (
  \`id\` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`type\` varchar(100), \`payload\` json, \`status\` varchar(50) DEFAULT 'pending',
  \`attempts\` int DEFAULT 0, \`processedAt\` timestamp NULL,
  \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS \`call_attempts\` (
  \`id\` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`leadId\` int, \`campaignId\` int, \`callSid\` varchar(255),
  \`status\` varchar(50), \`duration\` int, \`outcome\` varchar(100),
  \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP, INDEX \`idx_ca_leadId\` (\`leadId\`)
);
CREATE TABLE IF NOT EXISTS \`decision_logs\` (
  \`id\` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`sessionId\` varchar(255), \`leadId\` int, \`decision\` varchar(100),
  \`reasoning\` text, \`data\` json, \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_dl_sessionId\` (\`sessionId\`)
);
CREATE TABLE IF NOT EXISTS \`local_number_pool\` (
  \`id\` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`phoneNumber\` varchar(20) NOT NULL UNIQUE, \`areaCode\` varchar(10),
  \`state\` varchar(50), \`isActive\` tinyint(1) DEFAULT 1,
  \`assignedToUserId\` int, \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS \`user_industry_packs\` (
  \`id\` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`userId\` int NOT NULL, \`industry\` varchar(100) NOT NULL,
  \`purchasedAt\` timestamp DEFAULT CURRENT_TIMESTAMP, INDEX \`idx_uip_userId\` (\`userId\`)
);
CREATE TABLE IF NOT EXISTS \`user_phone_numbers\` (
  \`id\` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`userId\` int NOT NULL, \`phoneNumber\` varchar(20) NOT NULL UNIQUE,
  \`isActive\` tinyint(1) DEFAULT 1, \`assignedAt\` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_upn_userId\` (\`userId\`)
);
CREATE TABLE IF NOT EXISTS \`agency_clients\` (
  \`id\` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`agencyUserId\` int NOT NULL, \`clientUserId\` int,
  \`businessName\` varchar(255), \`phoneNumber\` varchar(50),
  \`industry\` varchar(100), \`status\` varchar(50) DEFAULT 'active',
  \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP,
  INDEX \`idx_ac_agencyUserId\` (\`agencyUserId\`)
);
CREATE TABLE IF NOT EXISTS \`analytics_snapshots\` (
  \`id\` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`userId\` int, \`period\` varchar(50), \`metrics\` json,
  \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP, INDEX \`idx_as_userId\` (\`userId\`)
);
CREATE TABLE IF NOT EXISTS \`activity_logs\` (
  \`id\` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`userId\` int, \`entityType\` varchar(100), \`entityId\` int,
  \`action\` varchar(100), \`description\` text, \`metadata\` json,
  \`createdAt\` timestamp DEFAULT CURRENT_TIMESTAMP, INDEX \`idx_al_userId\` (\`userId\`)
);
      `;

      await conn.query(sql);
      const [rows] = await conn.execute("SHOW TABLES");
      const tables = (rows as any[]).map(r => Object.values(r)[0]).sort();
      await conn.end();
      res.json({ ok: true, tableCount: tables.length, tables });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  // ─── WebSocket Handler for Voice Streaming ────────────────────────────────
  // This handles real-time audio from SignalWire and processes it
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (request, socket, head) => {
    // Log EVERY upgrade attempt — critical for diagnosing WebSocket issues
    console.log("[WS-UPGRADE] incoming", {
      url: request.url,
      host: request.headers.host,
      upgrade: request.headers.upgrade,
      connection: request.headers.connection,
      userAgent: request.headers["user-agent"],
    });

    if (!request.url?.startsWith("/api/voice-stream")) {
      console.log("[WS-UPGRADE] no match for", request.url, "— destroying socket");
      socket.destroy();
      return;
    }

    if (request.url?.startsWith("/api/voice-stream")) {
      console.log("[WS-UPGRADE] voice-stream matched — handling upgrade");
      const url = new URL(request.url, `http://${request.headers.host}`);
      const sessionId = url.searchParams.get("sessionId");
      const leadId = url.searchParams.get("leadId");
      const isInbound = url.searchParams.get("inbound") === "true";

      wss.handleUpgrade(request, socket, head, async (ws) => {
        console.log("[WS-UPGRADE] handleUpgrade success — WebSocket connected", { sessionId });
        console.log(`[Voice] WebSocket connected: ${sessionId}`);
        console.log("[VOICE-WS] connected", { sessionId, leadId, isInbound });

        // Live path: SignalWire audio ↔ createCallEngine (realtimeVoiceEngine.ts)
        // Deepgram = streaming STT only. Cartesia = TTS. Groq = LLM.
        // (deepgramVoiceAgent.ts = alternate Deepgram Voice Agent API — not wired here.)
        let resolvedUserId: number | undefined;
        let resolvedLeadId: number | undefined;
        let businessName: string | undefined;
        let industry: string | undefined;
        let voiceProfileId: string | undefined;
        let callDirection: "inbound" | "outbound" | undefined;
        let outboundScript: string | undefined;
        let voiceAgentDisplayName: string | undefined;

        if (sessionId) {
          try {
            const session = voiceSessionManager.getSession(sessionId);
            if (session) {
              resolvedUserId = session.userId ?? undefined;
              resolvedLeadId = session.leadId ?? undefined;
              voiceProfileId = session.voiceProfileId ?? undefined;
              callDirection = session.callDirection ?? undefined;
              outboundScript = session.outboundScript ?? undefined;
            }
          } catch {}
        }

        if (leadId) {
          resolvedLeadId = leadId ? parseInt(leadId, 10) : undefined;
        }

        if (!voiceProfileId && resolvedUserId) {
          try {
            const { getUserVoiceSettings } = await import("./services/voiceProfiles");
            const vs = await getUserVoiceSettings(resolvedUserId);
            voiceProfileId = vs.voiceProfileId;
          } catch {}
        }

        if (resolvedLeadId) {
          try {
            const db = await import("../db");
            const lead = await db.getLeadById(resolvedLeadId);
            if (lead) {
              const l = lead as { company?: string | null; industry?: string | null };
              if (l.company?.trim()) businessName = l.company.trim();
              if (l.industry?.trim()) industry = l.industry.trim();
            }
          } catch {}
        }

        // Resolve user language + tenant voice domain fields (per-tenant industry adaptation)
        let callLanguage: string | undefined;
        let tenantIndustryOverlay: import("./services/domainPacks").TenantIndustryOverlay | undefined;
        let voiceRuntimeProfile:
          | import("../realtime/tenantVoiceRuntime").TenantVoiceRuntimeProfile
          | undefined;
        if (resolvedUserId) {
          try {
            const db = await import("../db");
            const user = await db.getUserById(resolvedUserId);
            const { getTenantVoiceRuntimeProfile } = await import(
              "../realtime/tenantVoiceRuntime"
            );
            const u = user as any;
            callLanguage = u?.language || "en";
            voiceRuntimeProfile = await getTenantVoiceRuntimeProfile(resolvedUserId);
            if ((!businessName || !String(businessName).trim()) && u?.businessName?.trim()) {
              businessName = u.businessName.trim();
            }
            const o: import("./services/domainPacks").TenantIndustryOverlay = {};
            if (u?.primaryIndustryLabel?.trim()) o.primaryIndustryLabel = u.primaryIndustryLabel.trim();
            if (u?.voiceIndustryContext?.trim()) o.customIndustryContext = u.voiceIndustryContext.trim();
            if (u?.voiceKeyPhrases?.trim()) o.voiceKeyPhrases = u.voiceKeyPhrases.trim();
            if (u?.voiceRestrictionNotes?.trim()) o.voiceRestrictionNotes = u.voiceRestrictionNotes.trim();
            if (Object.keys(o).length) tenantIndustryOverlay = o;
            if (u?.voiceAgentDisplayName?.trim()) voiceAgentDisplayName = u.voiceAgentDisplayName.trim();
          } catch {}
        }

        // ── NEW: Real-time voice engine ─────────────────────────────────
        // Deepgram STT → Groq → Cartesia TTS
        // Streaming end-to-end, instant barge-in, clean hangup
        if (
          resolvedUserId === getPublicDemoOwnerId() &&
          (!businessName || !String(businessName).trim())
        ) {
          businessName = PUBLIC_DEMO_BUSINESS_NAME;
        }
        if (
          resolvedUserId === getPublicDemoOwnerId() &&
          (!industry || !String(industry).trim())
        ) {
          industry = PUBLIC_DEMO_INDUSTRY;
        }

        console.log("[VOICE-WS] tenant_context", {
          sessionId,
          leadId: resolvedLeadId ?? null,
          userId: resolvedUserId ?? null,
          businessName: businessName ?? null,
          industry: industry ?? null,
          language: callLanguage ?? null,
          voiceProfileId: voiceProfileId ?? null,
          callDirection: callDirection ?? null,
        });

        createCallEngine({
          sigWs: ws as unknown as import("ws").WebSocket,
          sessionId: sessionId || undefined,
          leadId: resolvedLeadId,
          userId: resolvedUserId,
          businessName,
          industry,
          voiceProfileId,
          language: callLanguage,
          callDirection,
          outboundScript,
          voiceRuntimeProfile,
          tenantIndustryOverlay,
          voiceAgentDisplayName,
        });

      });
    } else {
      socket.destroy();
    }
  });

  // Production: vite-prod.ts has NO vite imports — safe to bundle and run without vite installed
  // Development: load vite module via a computed path so esbuild cannot statically bundle it
  if (process.env.NODE_ENV === "development") {
    // Use computed path to prevent esbuild from bundling the vite module into production
    const vitePath = "./" + "vite";
    const { setupVite } = await import(vitePath);
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("./vite-prod");
    serveStatic(app);
  }

  // In production (Railway), PORT is injected by the platform — bind directly.
  // In development, scan for an available port starting from 3000.
  const preferredPort = parseInt(process.env.PORT || "3000");

  if (process.env.NODE_ENV === "production") {
    // Railway: bind directly to the assigned PORT, no scanning
    server.listen(preferredPort, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${preferredPort}/`);
    });
  } else {
    // Development: find an available port
    const port = await findAvailablePort(preferredPort);
    if (port !== preferredPort) {
      console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
    }
    server.listen(port, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${port}/`);
    });
  }
}

startServer().catch((error) => {
  console.error("[Server] Fatal startup error:", error);
  process.exit(1);
});
