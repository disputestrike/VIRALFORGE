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
import { VoiceRealtimePipeline } from "./services/voiceRealtimePipeline";

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
    // Don't crash the server — let it start even if migrations fail
    // The DB might already be up to date
  }
}

async function ensureCriticalVoiceSchema(connection: any) {
  // Railway production has shown cases where the migration runner completes but
  // `leads.createdBy` still does not exist, which breaks inbound/outbound call
  // session setup. Verify it explicitly on boot.
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'leads'
       AND COLUMN_NAME = 'createdBy'`
  );
  const count = Number((rows as Array<{ count: number }>)[0]?.count ?? 0);
  if (count > 0) return;

  console.warn("[Migration] leads.createdBy missing after migration run - applying fallback ALTER TABLE");
  await connection.execute("ALTER TABLE leads ADD COLUMN createdBy INT DEFAULT NULL");
  await connection.execute("CREATE INDEX idx_leads_created_by ON leads(createdBy)");
  console.log("[Migration] Added fallback leads.createdBy column and index");
}

async function startServer() {
  // Run migrations before starting the server
  await runMigrations();

  // ── Feature flags — logged on every startup ───────────────
  console.log("[ApexAI] Starting with feature flags:");
  console.log(`  Database:   ✅ (DATABASE_URL set)`);
  console.log(`  Redis/Queue: ${ENV.queueEnabled ? "✅ BullMQ + Redis" : "⚠️  In-memory fallback (set REDIS_URL)"}`);
  console.log(`  Google Auth: ${ENV.googleClientId ? "✅ enabled" : "❌ disabled (set GOOGLE_CLIENT_ID)"}`);
  console.log(`  Voice/SMS:   ${ENV.voiceEnabled ? "✅ SignalWire ready" : "⚠️  disabled (set SIGNALWIRE_PROJECT_ID)"}`);
  console.log(`  Email:       ${ENV.emailEnabled ? "✅ Resend ready" : "⚠️  disabled (set RESEND_API_KEY)"}`);
  console.log(`  STT:         ${ENV.sttEnabled ? "✅ Whisper ready" : "⚠️  disabled (set OPENAI_API_KEY)"}`);
  console.log(`  TTS:         ${ENV.ttsEnabled ? "✅ ElevenLabs ready" : "⚠️  disabled (set ELEVENLABS_API_KEY)"}`);
  console.log(`  AI/LLM:      ${ENV.aiEnabled ? "✅ ready" : "⚠️  disabled (set BUILT_IN_FORGE_API_KEY)"}`);
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
    const callWorker = new Worker(
      "calls",
      async (job) => {
        console.log(`[CallWorker] ▶ QUEUED→PROCESSING | jobId: ${job.id} | leadId: ${job.data.leadId}`);
        const dbMod = await import("../db");
        try {
          const lead = await dbMod.getLeadById(job.data.leadId);
          if (!lead?.phone) {
            throw new Error(`Lead ${job.data.leadId} has no phone number`);
          }

          const l = lead as any;
          const result = await initiateCall({
            leadId: l.id as number,
            phoneNumber: l.phone as string,
            campaignId: job.data.campaignId,
          });

          await dbMod.updateLead(l.id as number, { status: "contacted" });
          await dbMod.logActivity({
            userId: (l.createdBy as number | undefined) ?? undefined,
            entityType: "call",
            entityId: l.id as number,
            action: "initiated",
            description: `Outbound call initiated for ${l.firstName} ${l.lastName}`,
            metadata: { callSid: (result as any).callSid, campaignId: job.data.campaignId },
          });

          console.log(`[CallWorker] ✅ PROCESSING→COMPLETED | jobId: ${job.id} | callSid: ${result.callSid} | leadId: ${lead.id}`);
          return result;
        } catch (error) {
          await dbMod.updateLead(job.data.leadId, { status: "contacted" }).catch(() => {});
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
        const { phone, type, leadName, scheduledTime, msgId } = job.data;
        console.log(`[SMSWorker] ▶ QUEUED→PROCESSING | jobId: ${job.id} | type: ${type} | phone: ${phone} | leadId: ${job.data.leadId} | msgId: ${msgId || "none"}`);
        const dbMod = await import("../db");
        try {
          const { default: swService } = await import("./services/signalwireService");

          let message = "";
          if (type === "appointment_confirmation") {
            message = `Hi ${leadName || "there"}! Your appointment is confirmed for ${scheduledTime || "your scheduled time"}. Reply STOP to cancel.`;
          } else if (type === "appointment_reminder") {
            message = `Reminder ${leadName || "there"}: Your appointment is ${scheduledTime || "coming up"}. See you soon!`;
          } else if (type === "follow_up") {
            message = `Hi ${leadName || "there"}! Following up on our call. Still interested? Reply YES or let me know how I can help.`;
          } else if (type === "no_show_followup") {
            message = `Hi ${leadName || "there"}, we missed you at your appointment. Would you like to reschedule?`;
          } else {
            message = `Hi ${leadName || "there"}, this is a message from ApexAI.`;
          }

          const result = await swService.sendSMS({ to: phone, body: message });

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
          const resend = new Resend(process.env.RESEND_API_KEY);

          const { email, type, leadName, scheduledTime, calendarLink } = job.data;
          const SENDER_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL || "noreply@apexai.com";
          const SENDER_NAME = process.env.RESEND_FROM_NAME || process.env.FROM_NAME || "ApexAI";

          let subject = "";
          let html = "";

          if (type === "appointment_confirmation") {
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
            from: `${SENDER_NAME} <${SENDER_EMAIL}>`,
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

    console.log("[Server] SMS and Email workers initialized");
    } // end if(redisConnection)
  } catch (error) {
    console.warn("[Server] Job queue initialization warning:", error);
    // Don't crash if queue fails to initialize
  }

  const app = express();
  const server = createServer(app);

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
        sms:      ENV.smsEnabled    ? "ready (signalwire)"  : "disabled — add SIGNALWIRE_PROJECT_ID",
        email:    ENV.emailEnabled  ? "ready"  : "disabled — add RESEND_API_KEY",
        stt:      ENV.sttEnabled    ? "ready"  : "disabled — add OPENAI_API_KEY",
        tts:      ENV.ttsEnabled    ? "ready"  : "disabled — add ELEVENLABS_API_KEY",
        ai:       ENV.aiEnabled     ? "ready"  : "disabled — add BUILT_IN_FORGE_API_KEY",
      },
    });
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

    console.log(`[Voice] Call started: ${CallSid} from ${From}`);

    // Create session and lead if inbound
    try {
      if (From) {
        const db = await import("../db");
        const outboundLeadId = leadId ? parseInt(leadId, 10) : null;
        let lead: any = outboundLeadId ? await db.getLeadById(outboundLeadId) : null;
        let ownerId = lead?.createdBy ?? null;

        // Look up which user owns the called number (To) for proper tenant assignment
        if (!ownerId) {
          ownerId = To ? await db.getUserIdByPhoneNumber(To) : 1;
        }

        // Load owner's settings (transfer number, language)
        let ownerSettings: { transferNumber?: string; language?: string } = {};
        try {
          const { getDb } = await import("../db");
          const { users } = await import("../../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          const dbInst = await getDb();
          if (dbInst && ownerId) {
            const [ownerUser] = await (dbInst as any).select().from(users).where(eq(users.id, ownerId)).limit(1);
            if (ownerUser) ownerSettings = { transferNumber: ownerUser.transferNumber, language: ownerUser.language || "en" };
          }
        } catch {}

        // Inbound calls create/find lead by caller phone. Outbound calls use explicit leadId.
        if (!lead) {
          lead = await db.getLeadByPhone(From);
        }
        if (!lead) {
          lead = await db.createLead({
            firstName: "Inbound",
            lastName: From.slice(-4),
            phone: From,
            source: "inbound_call",
            status: "new",
            score: 60,
            segment: "warm",
            createdBy: ownerId ?? 1,
          }) as any;
        }
        const vm = await import("./services/voiceSessionManager");
        const { getUserVoiceSettings } = await import("./services/voiceProfiles");
        const voiceSettings = ownerId ? await getUserVoiceSettings(ownerId) : { voiceProfileId: "cartesia-sarah-sales" };
        if (!vm.getSession(sessionId)) {
          vm.createSession((lead as any).id ?? 0, "default", sessionId, {
            userId: ownerId ?? 1,
            language: ownerSettings.language || "en",
            voiceProfileId: voiceSettings.voiceProfileId,
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
    const streamUrl = `wss://${wsHost}/api/voice-stream`;
    console.log("[Voice] Stream URL:", streamUrl);
    console.log("[Voice] Session ID:", sid);
    // <Connect><Stream> is required for bidirectional audio (per SignalWire official example)
    // <Start><Stream> is unidirectional only — cannot send AI audio back to caller
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${streamUrl}">
      <Parameter name="sessionId" value="${sid}" />
      <Parameter name="leadId" value="${leadId}" />
    </Stream>
  </Connect>
</Response>`);
  });

  app.post("/api/voice/status", validateTwilioSignature, (req, res) => {
    console.log("[Voice] Status callback:", {
      CallSid: req.body.CallSid,
      CallStatus: req.body.CallStatus,
    });
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
        // Download recording and transcribe with Whisper
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

  app.post("/api/voice/inbound", validateTwilioSignature, async (req, res) => {
    const { CallSid, From, To } = req.body;
    console.log(`[Inbound] Call received from ${From}`);

    // FIX 6: Create or find lead from incoming phone number
    try {
      const db = await import("../db");
      let lead = await db.getLeadByPhone(From);

      if (!lead) {
        // Create new inbound lead
        const newLead = await db.createLead({
          firstName: "Inbound",
          lastName: From.slice(-4), // Last 4 digits of phone
          phone: From,
          source: "inbound_call",
          status: "new",
          score: 60, // Inbound = warm lead
          segment: "warm",
          createdBy: 1, // System: assigned to account owner of this number
        });
        lead = newLead as any;
        console.log(`[Inbound] Created new lead ${(lead as any).id} from ${From}`);
      }

      // Create voice session bound to CallSid
      const session = voiceSessionManager.createSession((lead as any).id ?? 0, "default", CallSid);
      console.log(`[Inbound] Created session ${CallSid} for lead ${(lead as any)?.id}`);
      
      // Start persistence interval
      voiceSessionManager.startSessionPersistenceInterval(CallSid);
    } catch (error) {
      console.error("[Inbound] Error setting up inbound call:", error);
    }

    res.type("text/xml");

    // Play IVR menu
    const ivrMenu = `Thank you for calling ApexAI. Press 1 for sales, 2 for support, or 3 to leave a voicemail.`;
    res.send(`
      <Response>
        <Say>${ivrMenu}</Say>
        <Gather 
          numDigits="1"
          action="/api/voice/inbound-dtmf"
          method="POST"
          timeout="10">
          <Say>Please make a selection.</Say>
        </Gather>
        <Redirect method="POST">/api/voice/inbound</Redirect>
      </Response>
    `);
  });

  app.post("/api/voice/inbound-dtmf", validateTwilioSignature, async (req, res) => {
    const { CallSid, From, Digits } = req.body;
    const selection = parseInt(Digits);

    console.log(`[Inbound] DTMF selection: ${selection} from ${From}`);

    res.type("text/xml");

    if (selection === 1) {
      // Transfer to AI sales
      const dtmfStreamUrl = `wss://${req.get("host")}/api/voice-stream?sessionId=${CallSid}&amp;fromNumber=${From}&amp;inbound=true`;
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Start>
    <Stream url="${dtmfStreamUrl}" />
  </Start>
  <Say>Connecting you to our AI sales agent now.</Say>
  <Pause length="60" />
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
      // Store message in DB
      const db = await import("../db");
      let lead = await db.getLeadByPhone(From);
      if (!lead) {
        lead = await db.createLead({
          firstName: "SMS",
          lastName: From.slice(-4),
          phone: From,
          source: "inbound_sms",
          status: "new",
          score: 50,
          segment: "warm",
          createdBy: 1, // System: assigned to account owner of this number
        }) as any;
      }

      // Save message
      await db.createMessage({
        leadId: (lead as any).id,
        channel: "sms",
        direction: "inbound",
        body: Body,
        status: "delivered",
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

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // ── Cerebras Pool Status ──────────────────────────────────────────────────
  app.get("/api/cerebras/pool-status", async (_req, res) => {
    try {
      const { getCerebrasPoolStatus } = await import("./services/llmRouter");
      res.json({ ok: true, pool: getCerebrasPoolStatus() });
    } catch (e: any) {
      res.json({ ok: false, pool: [], error: e.message });
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

      wss.handleUpgrade(request, socket, head, (ws) => {
        console.log("[WS-UPGRADE] handleUpgrade success — WebSocket connected", { sessionId });
        console.log(`[Voice] WebSocket connected: ${sessionId}`);
        console.log("[VOICE-WS] connected", { sessionId, leadId, isInbound });
        (ws as any)._voicePipeline = new VoiceRealtimePipeline({
          socket: ws as any,
          requestSessionId: sessionId,
          requestLeadId: leadId,
          logger: console,
        });

        let streamSid: string | null = null;
        const audioChunks: Buffer[] = [];
        let silenceTimer: NodeJS.Timeout | null = null;
        let isProcessing = false;
        let isSpeaking = false; // true while AI is playing audio
        let lastResponseTime = 0; // debounce LLM calls

        const processAudio = async () => {
          if (isProcessing || audioChunks.length === 0) return;
          if (isSpeaking) {
            // AI still speaking — skip processing but KEEP the buffer
            // Caller may be speaking — we'll process it when AI finishes
            return;
          }
          // Debounce — don't respond faster than 1 second after AI finishes
          if (Date.now() - lastResponseTime < 1000) return;

          const totalLength = audioChunks.reduce((sum, c) => sum + c.length, 0);
          if (totalLength < 4800) return; // need at least 600ms of audio

          isProcessing = true;
          const completeAudio = Buffer.concat(audioChunks);
          audioChunks.length = 0;

          // Use resolved session ID from Parameter tags or fallback to URL param
          const activeSessionId = (ws as any)._sessionId || sessionId || "";
          const activeLeadId = (ws as any)._leadId || leadId;

          console.log(`[Voice] Processing ${completeAudio.length} bytes | session: ${activeSessionId}`);

          // Ensure session exists
          if (activeSessionId && !voiceSessionManager.getSession(activeSessionId)) {
            voiceSessionManager.createSession(
              activeLeadId ? parseInt(activeLeadId) : 0,
              "default",
              activeSessionId
            );
          }

          try {
            const audioResult = await voiceProcessingService.processAudioMessage(
              activeSessionId, completeAudio
            );
            const responsePayload = (audioResult as any)?.audioPayload || "";
            const sttText = (audioResult as any)?.text || "";
            const aiText = (audioResult as any)?.response || "";
            console.log(`[Voice] STT: "${sttText}" → AI: "${aiText}"`);

            if (responsePayload && streamSid) {
              // Clear queued audio, mark AI as speaking, send response
              ws.send(JSON.stringify({ event: "clear", streamSid }));
              isSpeaking = true;
              lastResponseTime = Date.now();
              ws.send(JSON.stringify({
                event: "media",
                streamSid: streamSid,
                media: { payload: responsePayload },
              }));
              // Send mark — SignalWire sends back "mark" event when audio finishes playing
              // This is the CORRECT way to know when AI finished speaking
              const markName = `done_${Date.now()}`;
              ws.send(JSON.stringify({ event: "mark", streamSid, mark: { name: markName } }));
              // Safety fallback timer in case mark event doesn't arrive
              const audioBytes = Math.ceil(responsePayload.length * 3 / 4);
              const speakDurationMs = Math.ceil(audioBytes / 8) + 2000; // generous buffer
              setTimeout(() => {
                if (isSpeaking) {
                  isSpeaking = false;
                  audioChunks.length = 0;
                  console.log(`[Voice] Speaking fallback timeout fired`);
                }
              }, speakDurationMs);
              console.log(`[Voice] ✅ Sent AI audio (~${Math.ceil(audioBytes/8000)}s speech)`);
            } else if (!responsePayload) {
              console.log(`[Voice] ⚠️ No audio — STT empty or TTS failed`);
            }
          } catch (err) {
            console.error("[Voice] Processing error:", err);
          }
          isProcessing = false;
        };

        ws.on("message", async (data: Buffer) => {
          if ((ws as any)._voicePipeline) {
            await (ws as any)._voicePipeline.handleRawMessage(data);
            return;
          }
          try {
            const message = JSON.parse(data.toString());

            if (message.event === "start") {
              streamSid = message.start.streamSid;
              const customParams = message.start.customParameters || {};
              const resolvedSessionId = customParams.sessionId || sessionId || streamSid;
              const resolvedLeadId = customParams.leadId || leadId;

              // Detailed start event logging per reviewer recommendations
              console.log("[VOICE-WS] start event received", {
                streamSid,
                callSid: message.start?.callSid,
                customParameters: customParams,
                resolvedSessionId,
                resolvedLeadId,
              });

              if (!resolvedSessionId) {
                console.error("[VOICE-WS] CRITICAL: missing sessionId in start event — closing");
                ws.close();
                return;
              }

              if (!voiceSessionManager.getSession(resolvedSessionId)) {
                voiceSessionManager.createSession(
                  resolvedLeadId ? parseInt(resolvedLeadId) : 0,
                  "default",
                  resolvedSessionId
                );
              }
              (ws as any)._sessionId = resolvedSessionId;
              (ws as any)._leadId = resolvedLeadId;
              console.log(`[Voice] Stream started: ${streamSid} | session: ${resolvedSessionId}`);

              // Send AI greeting through the stream
              try {
                const { synthesizeSpeech } = await import("./services/ttsService");
                const greetingAudio = await synthesizeSpeech(
                  "Hello, thank you for calling ApexAI. How can I help you today?"
                );
                const greetPayload = greetingAudio.toString("base64");
                isSpeaking = true;
                lastResponseTime = Date.now();
                ws.send(JSON.stringify({
                  event: "media",
                  streamSid,
                  media: { payload: greetPayload },
                }));
                const greetAudioBytes = Math.ceil(greetPayload.length * 3 / 4);
                const greetDuration = Math.ceil(greetAudioBytes / 8) + 1500;
                ws.send(JSON.stringify({ event: "mark", streamSid, mark: { name: `greet_${Date.now()}` } }));
                setTimeout(() => { if (isSpeaking) { isSpeaking = false; } }, greetDuration);
                console.log("[Voice] ✅ Sent greeting audio");
              } catch (e) {
                console.error("[Voice] Greeting error:", e);
              }
              return;
            }

            if (message.event === "media") {
              // Log first media packet for diagnostics
              if (audioChunks.length === 0) {
                const payloadBytes = message.media?.payload
                  ? Buffer.from(message.media.payload, "base64").length : 0;
                console.log("[VOICE-WS] first media packet", {
                  track: message.media?.track,
                  chunk: message.media?.chunk,
                  timestamp: message.media?.timestamp,
                  payloadBytes,
                });
              }

              // Only process inbound audio (caller's voice)
              if (message.media.track === "outbound") return;

              // BARGE-IN: if AI is speaking and caller speaks, stop AI
              // But only after AI has been speaking for at least 1.5 seconds
              // This prevents background noise from cutting off the AI mid-sentence
              if (isSpeaking && (Date.now() - lastResponseTime > 1500)) {
                const audioBuffer = Buffer.from(message.media.payload, "base64");
                const nonSilenceBytes = Array.from(audioBuffer).filter(b => b !== 0xFF && b !== 0x7F).length;
                if (nonSilenceBytes > audioBuffer.length * 0.6) {
                  console.log("[Voice] BARGE-IN detected — stopping AI audio");
                  ws.send(JSON.stringify({ event: "clear", streamSid }));
                  isSpeaking = false;
                  audioChunks.length = 0; // clear any buffered audio
                }
              }

              const audioBuffer = Buffer.from(message.media.payload, "base64");
              audioChunks.push(audioBuffer);

              // Reset silence timer — process after 800ms of no new audio
              if (silenceTimer) clearTimeout(silenceTimer);
              silenceTimer = setTimeout(processAudio, 600); // 600ms silence = end of speech

              // Also process if we have 3+ seconds of audio
              const totalLength = audioChunks.reduce((sum, c) => sum + c.length, 0);
              if (totalLength > 24000) {
                if (silenceTimer) clearTimeout(silenceTimer);
                await processAudio();
              }
            }

            // Handle mark event — SignalWire confirms audio playback finished
            if (message.event === "mark") {
              console.log(`[Voice] Playback complete: ${message.mark?.name}`);
              isSpeaking = false; // Now safe to listen and respond
              // Don't clear buffer — caller may have spoken during AI playback
              // If they did, process it now
              if (audioChunks.length > 0) {
                const total = audioChunks.reduce((s, c) => s + c.length, 0);
                if (total > 4800) {
                  console.log(`[Voice] Processing buffered caller speech (${total} bytes)`);
                  processAudio();
                } else {
                  audioChunks.length = 0; // too short, just noise
                }
              }
            }

            // Handle call stop
            if (message.event === "stop") {
              console.log(`[Voice] Stream stopped: ${streamSid}`);
              voiceSessionManager.completeSession(sessionId || "");
            }
          } catch (error) {
            console.error("[Voice] Error processing WebSocket message:", error);
          }
        });

        ws.on("error", (error) => {
          if ((ws as any)._voicePipeline) {
            (ws as any)._voicePipeline.handleError(error);
            return;
          }
          console.error("[VOICE-WS] error", error);
        });

        ws.on("close", (code, reason) => {
          if ((ws as any)._voicePipeline) {
            (ws as any)._voicePipeline.handleClose(code, reason?.toString());
            return;
          }
          console.log("[VOICE-WS] closed", {
            code,
            reason: reason?.toString(),
            sessionId: (ws as any)._sessionId || sessionId,
          });
          voiceSessionManager.endSession((ws as any)._sessionId || sessionId || "");
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

startServer().catch(console.error);
