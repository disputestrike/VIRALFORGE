import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";

// Lazy-initialize Google OAuth client (only when needed)
let googleClient: OAuth2Client | null = null;

function getGoogleClient(): OAuth2Client {
  if (!googleClient) {
    if (!process.env.GOOGLE_CLIENT_ID) {
      console.warn("[Google Auth] GOOGLE_CLIENT_ID not configured - Google Auth will not work");
    }
    if (!process.env.GOOGLE_CLIENT_SECRET) {
      console.warn("[Google Auth] GOOGLE_CLIENT_SECRET not configured - Google Auth will not work");
    }

    googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID || "",
      process.env.GOOGLE_CLIENT_SECRET || "",
      `${process.env.RAILWAY_PUBLIC_DOMAIN ? 'https://' + process.env.RAILWAY_PUBLIC_DOMAIN : 'http://localhost:3000'}/api/auth/google/callback`
    );
  }
  return googleClient;
}

export function registerOAuthRoutes(app: Express) {
  // Google OAuth callback endpoint
  app.post("/api/auth/google/callback", async (req: Request, res: Response) => {
    const { credential } = req.body;

    if (!credential) {
      res.status(400).json({ error: "credential is required" });
      return;
    }

    try {
      // Get Google client (lazy-initialized)
      const client = getGoogleClient();

      if (!process.env.GOOGLE_CLIENT_ID) {
        res.status(500).json({ error: "Google authentication not configured" });
        return;
      }

      // Verify the Google ID token
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        res.status(400).json({ error: "Invalid token payload" });
        return;
      }

      const { sub: googleId, email, name, picture } = payload;

      if (!googleId || !email) {
        res.status(400).json({ error: "Missing required user info from Google" });
        return;
      }

      // Upsert user in database
      await db.upsertUser({
        openId: googleId,
        name: name || null,
        email: email || null,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // Create JWT session token
      const sessionToken = jwt.sign(
        {
          googleId,
          email,
          name,
          picture,
        },
        ENV.cookieSecret,
        { expiresIn: "1y" }
      );

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { 
        ...cookieOptions, 
        maxAge: ONE_YEAR_MS 
      });

      // Return success - frontend will redirect
      res.json({ success: true });
    } catch (error) {
      console.error("[Google Auth] Callback failed", error);
      res.status(401).json({ error: "Google authentication failed" });
    }
  });

  // Optional: Google login initiation endpoint
  app.get("/api/auth/google/login", (req: Request, res: Response) => {
    const scopes = [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];

    const authUrl = getGoogleClient().generateAuthUrl({
      access_type: "offline",
      scope: scopes,
    });

    res.json({ url: authUrl });
  });
}
