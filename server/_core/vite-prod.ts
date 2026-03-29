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

  // Return 426 for WebSocket endpoint hit via plain HTTP
  // This prevents Railway CDN / any proxy from serving HTML there
  app.get("/api/voice-stream", (req, res) => {
    console.log("[VOICE-STREAM-HTTP] Plain HTTP hit on voice-stream — returning 426", {
      headers: req.headers,
    });
    res.status(426).set("Upgrade", "websocket").send("Upgrade Required");
  });

  // SPA fallback — NEVER catch /api/ or /webhooks/ routes
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/") || req.path.startsWith("/webhooks/")) {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
