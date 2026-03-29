/**
 * Production static file serving — NO vite imports.
 * This file is safe to bundle for production.
 */
import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    console.error(`Could not find build directory: ${distPath}`);
  }

  app.use(express.static(distPath));

  // Handle plain HTTP GET on voice-stream
  // SignalWire may do a plain HTTP validation before WebSocket upgrade
  // Return 200 OK so SignalWire proceeds to upgrade
  app.get("/api/voice-stream", (req, res) => {
    console.log("[VOICE-STREAM-HTTP] Plain HTTP hit on voice-stream — returning 200 to allow upgrade", {
      upgrade: req.headers.upgrade,
      connection: req.headers.connection,
      userAgent: req.headers["user-agent"],
    });
    res.status(200).send("OK");
  });

  // SPA fallback — NEVER catch /api/ or /webhooks/ routes
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/webhooks/")) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
