import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { OAuth2Client } from "google-auth-library";
import { sdk } from "./sdk";

let googleClient: OAuth2Client | null = null;

function getGoogleClient(): OAuth2Client {
  if (!googleClient) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      console.warn("[Google Auth] GOOGLE_CLIENT_ID not configured");
    }
    if (!process.env.GOOGLE_CLIENT_SECRET) {
      console.warn("[Google Auth] GOOGLE_CLIENT_SECRET not configured");
    }
    googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID || "",
      process.env.GOOGLE_CLIENT_SECRET || "",
      `${ENV.publicUrl}/api/auth/google/callback`
    );
  }
  return googleClient;
}

async function handleGoogleUser(
  googleId: string,
  email: string,
  name: string | undefined,
  picture: string | undefined,
  req: Request,
  res: Response
) {
  await db.upsertUser({
    openId: googleId,
    name: name || null,
    email: email || null,
    loginMethod: "google",
    lastSignedIn: new Date(),
  });

  // Use sdk.createSessionToken so jose signs it — compatible with sdk.authenticateRequest
  const sessionToken = await sdk.createSessionToken({ googleId, email, name: name || "", picture: picture || undefined });

  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, {
    ...cookieOptions,
    maxAge: ONE_YEAR_MS,
  });

  console.log(`[Google Auth] Login success | openId: ${googleId} | email: ${email}`);
  return sessionToken;
}

export function registerOAuthRoutes(app: Express) {

  // ── Flow 1: Google redirect flow (standard OAuth2) ────────────────────────
  // Step 1: Redirect user to Google consent screen
  app.get("/api/auth/google/login", (_req: Request, res: Response) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      res.status(503).json({ error: "Google OAuth not configured — add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to Railway Variables" });
      return;
    }
    const authUrl = getGoogleClient().generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ],
      prompt: "select_account",
    });
    res.redirect(authUrl);
  });

  // Step 2: Google redirects back here with ?code= (GET — this is what Google sends)
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const error = req.query.error as string;

    if (error) {
      console.error("[Google Auth] OAuth error:", error);
      res.redirect("/?auth_error=" + encodeURIComponent(error));
      return;
    }

    if (!code) {
      res.redirect("/?auth_error=missing_code");
      return;
    }

    try {
      const { tokens } = await getGoogleClient().getToken(code);
      const client = getGoogleClient();
      client.setCredentials(tokens);

      const ticket = await client.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID!,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.sub || !payload.email) {
        res.redirect("/?auth_error=invalid_token");
        return;
      }

      await handleGoogleUser(payload.sub, payload.email, payload.name, payload.picture, req, res);
      res.redirect("/");
    } catch (err) {
      console.error("[Google Auth] Callback GET failed:", err);
      res.redirect("/?auth_error=callback_failed");
    }
  });

  // ── Flow 2: Google Identity Services (one-tap / credential POST) ──────────
  // Used by the frontend Google button that posts a credential token directly
  app.post("/api/auth/google/callback", async (req: Request, res: Response) => {
    const { credential } = req.body;

    if (!credential) {
      res.status(400).json({ error: "credential is required" });
      return;
    }

    try {
      if (!process.env.GOOGLE_CLIENT_ID) {
        res.status(500).json({ error: "Google authentication not configured" });
        return;
      }

      const ticket = await getGoogleClient().verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.sub || !payload.email) {
        res.status(400).json({ error: "Invalid token payload" });
        return;
      }

      await handleGoogleUser(payload.sub, payload.email, payload.name, payload.picture, req, res);
      res.json({ success: true });
    } catch (error) {
      console.error("[Google Auth] Callback POST failed:", error);
      res.status(401).json({ error: "Google authentication failed" });
    }
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ success: true });
  });
}
