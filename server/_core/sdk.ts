import { COOKIE_NAME } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

export type SessionPayload = {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
};

export type GoogleTokenResponse = {
  access_token: string;
  id_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  refresh_token?: string;
};

export type GoogleUserInfo = {
  id: string;
  sub?: string;
  email: string;
  name: string;
  picture?: string;
  verified_email?: boolean;
};

class SDK {
  constructor() {
    console.log("[Auth] Google OAuth 2.0 initialized");
  }

  /**
   * Exchange an authorization code for Google OAuth tokens.
   * Calls https://oauth2.googleapis.com/token with the app's credentials.
   */
  async exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
    const clientId = ENV.googleClientId || process.env.VITE_APP_ID || "";
    const clientSecret = ENV.googleClientSecret;
    const redirectUri = ENV.redirectUri;

    if (!clientSecret) {
      throw new Error("[OAuth] GOOGLE_CLIENT_SECRET is not configured");
    }
    if (!redirectUri) {
      throw new Error("[OAuth] REDIRECT_URI is not configured");
    }

    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[OAuth] Token exchange failed:", errorBody);
      throw new Error(`[OAuth] Token exchange failed: ${response.status} ${errorBody}`);
    }

    return response.json() as Promise<GoogleTokenResponse>;
  }

  /**
   * Fetch the authenticated user's profile from Google using an access token.
   * Uses the Google userinfo endpoint and normalises the `sub` field to `id`.
   */
  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[OAuth] getUserInfo failed:", errorBody);
      throw new Error(`[OAuth] Failed to fetch user info: ${response.status} ${errorBody}`);
    }

    const data = (await response.json()) as GoogleUserInfo;

    // Normalise: v2 returns `id`, but ensure `sub` is also populated for
    // callers that may check either field.
    if (!data.id && data.sub) {
      data.id = data.sub;
    }

    return data;
  }

  /**
   * Authenticate a request by verifying the JWT session cookie.
   */
  async authenticateRequest(req: Request): Promise<User> {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      throw new ForbiddenError("Missing authentication cookie");
    }

    const cookies = parseCookieHeader(cookieHeader);
    const sessionToken = cookies[COOKIE_NAME];

    if (!sessionToken) {
      throw new ForbiddenError("Missing session token");
    }

    let payload: SessionPayload;
    try {
      const secret = new TextEncoder().encode(ENV.cookieSecret);
      const verified = await jwtVerify<SessionPayload>(sessionToken, secret);
      payload = verified.payload;
    } catch (error) {
      console.error("[Auth] JWT verification failed:", error);
      throw new ForbiddenError("Invalid session token");
    }

    if (!payload.googleId || !payload.email) {
      throw new ForbiddenError("Invalid token payload");
    }

    const user = await db.getUserByOpenId(payload.googleId);
    if (!user) {
      throw new ForbiddenError("User not found");
    }

    const disabled = await db.isUserDisabled(user.id);
    if (disabled) {
      throw new ForbiddenError("Account disabled by admin");
    }

    return user;
  }

  /**
   * Create a signed JWT session token from a Google user payload.
   */
  async createSessionToken(payload: SessionPayload): Promise<string> {
    const secret = new TextEncoder().encode(ENV.cookieSecret);

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1y")
      .sign(secret);

    return token;
  }
}

// Export singleton
export const sdk = new SDK();
