import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

export function registerOAuthRoutes(app: Express) {
  /**
   * GET /api/auth/google/login
   * Redirects the browser to Google's OAuth 2.0 consent screen.
   */
  app.get("/api/auth/google/login", (_req: Request, res: Response) => {
    const clientId = ENV.googleClientId || process.env.VITE_APP_ID || "";
    const redirectUri = ENV.redirectUri;

    if (!clientId) {
      res.status(500).json({ error: "Google OAuth not configured: missing client ID" });
      return;
    }
    if (!redirectUri) {
      res.status(500).json({ error: "Google OAuth not configured: missing REDIRECT_URI" });
      return;
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
      ].join(" "),
      access_type: "offline",
      prompt: "consent",
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  });

  /**
   * GET /api/auth/callback
   * Google redirects here with ?code=... after the user grants consent.
   * Exchanges the code for tokens, fetches user info, upserts the user in the
   * database, and sets a signed JWT session cookie.
   */
  app.get("/api/auth/callback", async (req: Request, res: Response) => {
    const { code, error: oauthError } = req.query as Record<string, string>;

    if (oauthError) {
      console.error("[OAuth] Google returned an error:", oauthError);
      res.status(400).json({ error: `Google OAuth error: ${oauthError}` });
      return;
    }

    if (!code) {
      res.status(400).json({ error: "Missing authorization code" });
      return;
    }

    try {
      // Exchange the authorization code for Google tokens
      const tokenResponse = await sdk.exchangeCodeForToken(code);

      // Fetch the authenticated user's profile
      const userInfo = await sdk.getUserInfo(tokenResponse.access_token);

      // Google's v2 userinfo endpoint returns `id` as the stable subject ID
      const openId = userInfo.id;

      if (!openId || !userInfo.email) {
        res.status(400).json({ error: "Missing required user info from Google" });
        return;
      }

      // Upsert user in the database
      await db.upsertUser({
        openId,
        name: userInfo.name || null,
        email: userInfo.email || null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // Create a signed JWT session token
      const sessionToken = await sdk.createSessionToken({
        googleId: openId,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      console.log(`[OAuth] User authenticated: ${userInfo.email}`);

      // Redirect to the app after successful login
      res.redirect("/");
    } catch (error) {
      console.error("[OAuth] Callback failed:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  /**
   * POST /api/auth/google/callback (legacy — kept for backwards compatibility)
   * Accepts a Google ID token (credential) from the Google Sign-In button and
   * creates a session without going through the authorization code flow.
   */
  app.post("/api/auth/google/callback", async (req: Request, res: Response) => {
    const { code } = req.body as { code?: string };

    if (!code) {
      res.status(400).json({ error: "code is required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code);
      const userInfo = await sdk.getUserInfo(tokenResponse.access_token);

      const openId = userInfo.id;

      if (!openId || !userInfo.email) {
        res.status(400).json({ error: "Missing required user info from Google" });
        return;
      }

      await db.upsertUser({
        openId,
        name: userInfo.name || null,
        email: userInfo.email || null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken({
        googleId: openId,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("[OAuth] POST callback failed:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });
}
