/**
 * Public HTTP API for embedded webchat (no cookie auth — uses widget publicKey).
 * CORS respects `webchat_widgets.allowedOrigins` when set; if empty, any origin is allowed (set origins for production).
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import * as db from "../db";

function parseOrigins(s: string | null | undefined): string[] {
  if (!s?.trim()) return [];
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}

export function isWebchatOriginAllowed(
  allowedOrigins: string | null | undefined,
  requestOrigin: string | undefined
): boolean {
  if (!requestOrigin) return true;
  const list = parseOrigins(allowedOrigins);
  if (list.length === 0) return true;
  const o = requestOrigin.replace(/\/$/, "").toLowerCase();
  return list.some((allowed) => {
    const a = allowed.replace(/\/$/, "").toLowerCase();
    return o === a || o.startsWith(a);
  });
}

function setCors(res: Response, origin: string | undefined, allowed: boolean) {
  if (!allowed) return;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

const leadBodySchema = z.object({
  key: z.string().min(64).max(64),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  message: z.string().max(4000).optional(),
});

export function registerWebchatPublicRoutes(app: Express) {
  app.options("/api/public/webchat/config", (req, res) => {
    const origin = req.headers.origin;
    setCors(res, origin, true);
    res.status(204).end();
  });

  app.options("/api/public/webchat/lead", (req, res) => {
    const origin = req.headers.origin;
    setCors(res, origin, true);
    res.status(204).end();
  });

  app.get("/api/public/webchat/config", async (req: Request, res: Response) => {
    const origin = req.headers.origin;
    const key = String(req.query.key ?? "").trim();
    const widget = await db.getWebchatWidgetByPublicKey(key);
    if (!widget) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (!isWebchatOriginAllowed(widget.allowedOrigins, origin)) {
      res.status(403).json({ error: "origin_not_allowed" });
      return;
    }
    setCors(res, origin, true);
    res.json({
      ok: true,
      name: widget.name,
      welcomeMessage: widget.welcomeMessage ?? "Hi! How can we help?",
      widgetId: widget.id,
    });
  });

  app.post("/api/public/webchat/lead", async (req: Request, res: Response) => {
    const origin = req.headers.origin;
    const parsed = leadBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const { key, firstName, lastName, email, phone, message } = parsed.data;
    const widget = await db.getWebchatWidgetByPublicKey(key);
    if (!widget) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (!isWebchatOriginAllowed(widget.allowedOrigins, origin)) {
      res.status(403).json({ error: "origin_not_allowed" });
      return;
    }
    setCors(res, origin, true);

    try {
      let score = 40;
      if (email) score += 15;
      if (phone) score += 15;
      score = Math.min(100, score);
      const segment = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
      const notes = message
        ? `Webchat (widget ${widget.id}): ${message}`
        : `Webchat lead (widget ${widget.id})`;

      const { insertId: leadId } = await db.createLead({
        firstName,
        lastName,
        email: email ?? null,
        phone: phone ?? null,
        source: "webchat",
        status: "new",
        score,
        segment,
        notes,
        createdBy: widget.userId,
      });

      await db.logActivity({
        userId: widget.userId,
        entityType: "lead",
        entityId: leadId,
        action: "created",
        description: `Webchat lead from widget "${widget.name}"`,
      });

      const { emitZapierEvent } = await import("./services/zapierEmit");
      void emitZapierEvent(widget.userId, "lead.created", {
        leadId,
        score,
        segment,
        firstName,
        lastName,
        source: "webchat",
      });

      const { runEmailSequencesForLeadCreated } = await import("./services/emailSequenceTrigger");
      void runEmailSequencesForLeadCreated(widget.userId, {
        id: leadId,
        firstName,
        lastName,
        email: email ?? null,
        phone: phone ?? null,
        company: null,
      }).catch((e) => console.warn("[EmailSequence] webchat:", e));

      res.status(201).json({ ok: true, leadId });
    } catch (e) {
      console.error("[webchat/lead]", e);
      res.status(500).json({ error: "server_error" });
    }
  });
}
