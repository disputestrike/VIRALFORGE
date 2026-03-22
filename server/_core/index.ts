import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

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
