import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

let googleClient: OAuth2Client | null = null;

function getGoogleClient(): OAuth2Client {
  if (!googleClient) {
    googleClient = new OAuth2Client(
      ENV.googleClientId,
      ENV.googleClientSecret,
      ENV.redirectUri
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

  const sessionToken = await sdk.createSessionToken({
    googleId,
    email,
    name: name || "",
    picture: picture || undefined,
  });

  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, {
    ...cookieOptions,
    maxAge: ONE_YEAR_MS,
  });

  console.log(`[Google Auth] Login success | openId: ${googleId} | email: ${email}`);
}

async function authenticateFromAuthCode(req: Request, res: Response, code: string): Promise<void> {
  const tokenResponse = await sdk.exchangeCodeForToken(code);
  const userInfo = await sdk.getUserInfo(tokenResponse.access_token);
  const openId = userInfo.id;

  if (!openId || !userInfo.email) {
    res.status(400).json({ error: "Missing required user info from Google" });
    return;
  }

  await handleGoogleUser(
    openId,
    userInfo.email,
    userInfo.name,
    userInfo.picture,
    req,
    res
  );
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/auth/google/login", (_req: Request, res: Response) => {
    const clientId = ENV.googleClientId || process.env.VITE_APP_ID || "";
    const redirectUri = ENV.redirectUri;

    if (!clientId) {
      res.status(503).json({ error: "Google OAuth not configured: missing GOOGLE_CLIENT_ID" });
      return;
    }
    if (!redirectUri) {
      res.status(503).json({ error: "Google OAuth not configured: missing REDIRECT_URI" });
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

  const handleCodeCallback = async (req: Request, res: Response) => {
    const { code, error: oauthError } = req.query as Record<string, string>;

    if (oauthError) {
      console.error("[OAuth] Google returned an error:", oauthError);
      res.redirect(`/?auth_error=${encodeURIComponent(oauthError)}`);
      return;
    }

    if (!code) {
      res.status(400).json({ error: "Missing authorization code" });
      return;
    }

    try {
      await authenticateFromAuthCode(req, res, code);
      res.redirect("/");
    } catch (error) {
      console.error("[OAuth] Callback failed:", error);
      res.redirect("/?auth_error=callback_failed");
    }
  };

  // Canonical callback path used by newer OAuth config.
  app.get("/api/auth/callback", handleCodeCallback);
  // Backward-compatible callback path used by older OAuth config.
  app.get("/api/auth/google/callback", handleCodeCallback);

  // Legacy one-tap credential POST and code-based POST callback support.
  app.post("/api/auth/google/callback", async (req: Request, res: Response) => {
    const body = req.body as { credential?: string; code?: string };

    try {
      if (body.credential) {
        if (!ENV.googleClientId) {
          res.status(500).json({ error: "Google authentication not configured" });
          return;
        }

        const ticket = await getGoogleClient().verifyIdToken({
          idToken: body.credential,
          audience: ENV.googleClientId,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.sub || !payload.email) {
          res.status(400).json({ error: "Invalid token payload" });
          return;
        }

        await handleGoogleUser(payload.sub, payload.email, payload.name, payload.picture, req, res);
        res.json({ success: true });
        return;
      }

      if (body.code) {
        await authenticateFromAuthCode(req, res, body.code);
        res.json({ success: true });
        return;
      }

      res.status(400).json({ error: "credential or code is required" });
    } catch (error) {
      console.error("[OAuth] POST callback failed:", error);
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ success: true });
  });
}
