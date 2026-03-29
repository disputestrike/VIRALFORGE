/**
 * Production static file serving — NO vite imports.
 * This file is safe to bundle for production.
 */
import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // In production Docker, dist/public is at the same level as dist/index.js
  // __dirname for ESM is import.meta.dirname
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // Fall through to index.html for client-side routing
  // IMPORTANT: Exclude /api/* routes so WebSocket upgrades work correctly
  app.use("*", (req, res) => {
    if (req.originalUrl.startsWith("/api/") || req.originalUrl.startsWith("/webhooks/")) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
