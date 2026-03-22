import "dotenv/config";
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
import * as voiceProcessingService from "./services/voiceProcessingService";

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
    await connection.end();
    console.log("[Migration] Migrations completed successfully");
  } catch (error) {
    console.error("[Migration] Migration failed:", error);
    // Don't crash the server — let it start even if migrations fail
    // The DB might already be up to date
  }
}

async function startServer() {
  // Run migrations before starting the server
  await runMigrations();

  // INTEGRATION: Initialize job queue and workers
  console.log("[Server] Initializing job queue and workers...");
  try {
    const { queues, redis } = await import("./_core/services/queue");
    const { Worker } = await import("bullmq");
    const { initiateCall } = await import("./_core/services/twilioService");

    // Call worker
    const callWorker = new Worker(
      "calls",
      async (job) => {
        console.log(`[CallWorker] Processing job ${job.id}: Lead ${job.data.leadId}`);
        try {
          const lead = await db.getLeadById(job.data.leadId);
          if (!lead?.phone) {
            throw new Error(`Lead ${job.data.leadId} has no phone number`);
          }

          const result = await initiateCall({
            leadId: lead.id,
            phoneNumber: lead.phone,
            campaignId: job.data.campaignId,
          });

          console.log(`[CallWorker] Call initiated for lead ${job.data.leadId}: ${result.callSid}`);
          return result;
        } catch (error) {
          console.error(`[CallWorker] Job ${job.id} failed:`, error);
          throw error;
        }
      },
      { connection: redis }
    );

    callWorker.on("completed", (job) => {
      console.log(`[CallWorker] Job ${job.id} completed`);
    });

    callWorker.on("failed", (job, err) => {
      console.error(`[CallWorker] Job ${job?.id} failed:`, err);
    });

    console.log("[Server] Job queue and call worker initialized");
  } catch (error) {
    console.warn("[Server] Job queue initialization warning:", error);
    // Don't crash if queue fails to initialize
  }

  const app = express();
  const server = createServer(app);

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Health check endpoint — must respond immediately, before any DB or auth checks
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
    });
  });

  // INTEGRATION: Voice webhook routes for Twilio callbacks
  app.post("/api/voice/start", (req, res) => {
    console.log("[Voice] Call started");
    const leadId = req.query.leadId as string;
    const sessionId = req.query.sessionId as string;

    // Respond with TwiML to start voice stream
    res.type("text/xml");
    res.send(`
      <Response>
        <Say>Connecting to agent...</Say>
        <Connect>
          <Stream url="wss://${req.get("host")}/api/voice-stream?sessionId=${sessionId}" />
        </Connect>
      </Response>
    `);
  });

  app.post("/api/voice/status", (req, res) => {
    console.log("[Voice] Status callback:", {
      CallSid: req.body.CallSid,
      CallStatus: req.body.CallStatus,
    });
    // Handle call status updates
    res.send("OK");
  });

  app.post("/api/voice/recording", (req, res) => {
    console.log("[Voice] Recording available:", req.body.RecordingUrl);
    // Handle recording callback
    res.send("OK");
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

  // ─── WebSocket Handler for Voice Streaming ────────────────────────────────
  // This handles real-time audio from Twilio and processes it
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (request, socket, head) => {
    if (request.url?.startsWith("/api/voice-stream")) {
      const url = new URL(request.url, `http://${request.headers.host}`);
      const sessionId = url.searchParams.get("sessionId");
      const leadId = url.searchParams.get("leadId");
      const isInbound = url.searchParams.get("inbound") === "true";

      console.log(`[Voice] WebSocket upgrade: ${sessionId} (inbound: ${isInbound})`);

      wss.handleUpgrade(request, socket, head, (ws) => {
        console.log(`[Voice] WebSocket connected: ${sessionId}`);

        let streamSid: string | null = null;
        const audioChunks: Buffer[] = [];

        ws.on("message", async (data: Buffer) => {
          try {
            const message = JSON.parse(data.toString());

            // Handle connection start
            if (message.event === "start") {
              streamSid = message.start.streamSid;
              console.log(`[Voice] Stream started: ${streamSid}`);

              // Create session if needed
              if (sessionId && !voiceSessionManager.getSession(sessionId)) {
                voiceSessionManager.createSession(
                  leadId ? parseInt(leadId) : 0,
                  sessionId,
                  ""
                );
              }

              return;
            }

            // Handle media (audio) packets
            if (message.event === "media") {
              const audioPayload = message.media.payload; // Base64
              const audioBuffer = Buffer.from(audioPayload, "base64");
              audioChunks.push(audioBuffer);

              // Process when we have enough audio (accumulate 1-2 seconds)
              const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
              if (totalLength > 16000) {
                // ~1 second at 16kHz
                const completeAudio = Buffer.concat(audioChunks);
                audioChunks.length = 0; // Clear for next batch

                // Get session
                const session = voiceSessionManager.getSession(sessionId || "");
                if (!session) {
                  console.error(`[Voice] Session not found: ${sessionId}`);
                  return;
                }

                // Process audio: STT → Claude → TTS
                try {
                  const responseAudio = await voiceProcessingService.processAudioMessage(
                    sessionId || "",
                    completeAudio,
                    {
                      leadId: session.leadId,
                      leadName: session.leadName || `Lead ${session.leadId}`,
                      conversationHistory: session.conversationHistory,
                      goal: { primary: isInbound ? "lead_qualification" : "appointment_setting" },
                    }
                  );

                  // Send response audio back through Twilio
                  if (responseAudio.length > 0) {
                    const responsePayload = responseAudio.toString("base64");

                    ws.send(
                      JSON.stringify({
                        event: "media",
                        streamSid: message.streamSid,
                        media: {
                          payload: responsePayload,
                        },
                      })
                    );

                    console.log(`[Voice] Sent response audio: ${responseAudio.length} bytes`);
                  }
                } catch (error) {
                  console.error("[Voice] Error processing audio:", error);
                }
              }
            }

            // Handle call stop
            if (message.event === "stop") {
              console.log(`[Voice] Stream stopped: ${streamSid}`);

              const session = voiceSessionManager.getSession(sessionId || "");
              if (session) {
                voiceSessionManager.completeSession(sessionId || "", {
                  aiSummary: `Call completed. Sentiment: ${session.sentiment}. Turns: ${session.turnCount}`,
                });
              }
            }
          } catch (error) {
            console.error("[Voice] Error processing WebSocket message:", error);
          }
        });

        ws.on("error", (error) => {
          console.error("[Voice] WebSocket error:", error);
        });

        ws.on("close", () => {
          console.log(`[Voice] WebSocket closed: ${sessionId}`);
          voiceSessionManager.endSession(sessionId || "");
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
