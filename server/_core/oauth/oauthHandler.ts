/**
 * OAUTH INTEGRATION SYSTEM - PRODUCTION GRADE
 * 
 * Secure OAuth flows for:
 * - Google Ads
 * - Facebook Lead Forms
 * - Instagram Business
 * 
 * Features:
 * - State verification (CSRF protection)
 * - Token refresh
 * - Error recovery
 * - Token encryption in database
 */

import { Router } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import * as db from '../db';

const router = Router();

/**
 * ENCRYPTION HELPERS
 */
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY.padEnd(32)), iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decryptToken(encryptedToken: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedToken.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY.padEnd(32)), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * STATE MANAGEMENT (CSRF Protection)
 */
interface OAuthState {
  state: string;
  customerId: string;
  provider: string;
  createdAt: number;
  expiresAt: number;
}

const oauthStates = new Map<string, OAuthState>();

function generateState(customerId: string, provider: string): string {
  const state = crypto.randomBytes(32).toString('hex');
  const now = Date.now();

  oauthStates.set(state, {
    state,
    customerId,
    provider,
    createdAt: now,
    expiresAt: now + 15 * 60 * 1000, // 15 minutes
  });

  // Cleanup old states
  const expired = Array.from(oauthStates.entries()).filter(([_, s]) => s.expiresAt < now);
  expired.forEach(([key]) => oauthStates.delete(key));

  return state;
}

function verifyState(state: string): OAuthState | null {
  const oauthState = oauthStates.get(state);

  if (!oauthState || oauthState.expiresAt < Date.now()) {
    oauthStates.delete(state);
    return null;
  }

  oauthStates.delete(state); // Consume state
  return oauthState;
}

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE ADS OAUTH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * START GOOGLE OAUTH FLOW
 */
router.get('/oauth/google-ads/authorize', (req, res) => {
  const customerId = req.query.customerId as string;

  if (!customerId) {
    return res.status(400).json({ error: 'customerId required' });
  }

  const state = generateState(customerId, 'google_ads');

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: `${process.env.APP_URL}/api/oauth/google-ads/callback`,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/adwords',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

/**
 * HANDLE GOOGLE OAUTH CALLBACK
 */
router.get('/oauth/google-ads/callback', async (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const error = req.query.error as string;

  if (error) {
    console.error(`[OAuth] Google error: ${error}`);
    return res.redirect(`/settings/lead-sources?error=google_oauth_failed`);
  }

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state' });
  }

  // Verify state
  const oauthState = verifyState(state);

  if (!oauthState) {
    console.error('[OAuth] Invalid or expired state');
    return res.status(400).json({ error: 'Invalid state' });
  }

  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.APP_URL}/api/oauth/google-ads/callback`,
    });

    const accessToken = tokenResponse.data.access_token;
    const refreshToken = tokenResponse.data.refresh_token;
    const expiresIn = tokenResponse.data.expires_in;

    console.log(`[OAuth] Google Ads connected for customer ${oauthState.customerId}`);

    // Store encrypted tokens
    const encryptedRefreshToken = encryptToken(refreshToken);
    const encryptedAccessToken = encryptToken(accessToken);

    await db.query(
      `INSERT INTO lead_source_connections 
       (customerId, provider, accessToken, refreshToken, expiresAt, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND), ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
       accessToken = ?, refreshToken = ?, expiresAt = DATE_ADD(NOW(), INTERVAL ? SECOND), status = ?`,
      [
        oauthState.customerId,
        'google_ads',
        encryptedAccessToken,
        encryptedRefreshToken,
        expiresIn,
        'connected',
        encryptedAccessToken,
        encryptedRefreshToken,
        expiresIn,
        'connected',
      ]
    );

    // Log to audit
    await db.query(
      `INSERT INTO audit_log 
       (customerId, action, entityType, entityId, createdAt)
       VALUES (?, ?, ?, ?, NOW())`,
      [oauthState.customerId, 'lead_source_connected', 'google_ads', 'google_ads']
    );

    return res.redirect('/settings/lead-sources?connected=google_ads');
  } catch (error) {
    console.error('[OAuth] Google token exchange failed:', error);
    return res.redirect(`/settings/lead-sources?error=google_token_exchange_failed`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// FACEBOOK OAUTH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * START FACEBOOK OAUTH FLOW
 */
router.get('/oauth/facebook/authorize', (req, res) => {
  const customerId = req.query.customerId as string;

  if (!customerId) {
    return res.status(400).json({ error: 'customerId required' });
  }

  const state = generateState(customerId, 'facebook_leads');

  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID || '',
    redirect_uri: `${process.env.APP_URL}/api/oauth/facebook/callback`,
    scope: 'pages_manage_metadata,leads_retrieval,instagram_basic,instagram_manage_messages',
    state,
    response_type: 'code',
  });

  res.redirect(`https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`);
});

/**
 * HANDLE FACEBOOK OAUTH CALLBACK
 */
router.get('/oauth/facebook/callback', async (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const error = req.query.error as string;

  if (error) {
    console.error(`[OAuth] Facebook error: ${error}`);
    return res.redirect(`/settings/lead-sources?error=facebook_oauth_failed`);
  }

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state' });
  }

  const oauthState = verifyState(state);

  if (!oauthState) {
    console.error('[OAuth] Invalid or expired state');
    return res.status(400).json({ error: 'Invalid state' });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.get('https://graph.instagram.com/v18.0/oauth/access_token', {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: `${process.env.APP_URL}/api/oauth/facebook/callback`,
        code,
      },
    });

    const accessToken = tokenResponse.data.access_token;

    console.log(`[OAuth] Facebook connected for customer ${oauthState.customerId}`);

    // Store encrypted token
    const encryptedToken = encryptToken(accessToken);

    await db.query(
      `INSERT INTO lead_source_connections 
       (customerId, provider, accessToken, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
       accessToken = ?, status = ?`,
      [oauthState.customerId, 'facebook_leads', encryptedToken, 'connected', encryptedToken, 'connected']
    );

    // Log to audit
    await db.query(
      `INSERT INTO audit_log 
       (customerId, action, entityType, entityId, createdAt)
       VALUES (?, ?, ?, ?, NOW())`,
      [oauthState.customerId, 'lead_source_connected', 'facebook_leads', 'facebook_leads']
    );

    return res.redirect('/settings/lead-sources?connected=facebook');
  } catch (error) {
    console.error('[OAuth] Facebook token exchange failed:', error);
    return res.redirect(`/settings/lead-sources?error=facebook_token_exchange_failed`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// INSTAGRAM BUSINESS OAUTH
// ─────────────────────────────────────────────────────────────────────────────

/**
 * START INSTAGRAM OAUTH FLOW
 */
router.get('/oauth/instagram/authorize', (req, res) => {
  const customerId = req.query.customerId as string;

  if (!customerId) {
    return res.status(400).json({ error: 'customerId required' });
  }

  const state = generateState(customerId, 'instagram_dms');

  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID || '',
    redirect_uri: `${process.env.APP_URL}/api/oauth/instagram/callback`,
    scope: 'instagram_business_basic,instagram_business_manage_messages',
    state,
    response_type: 'code',
  });

  res.redirect(`https://api.instagram.com/oauth/authorize?${params.toString()}`);
});

/**
 * HANDLE INSTAGRAM OAUTH CALLBACK
 */
router.get('/oauth/instagram/callback', async (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const error = req.query.error as string;

  if (error) {
    console.error(`[OAuth] Instagram error: ${error}`);
    return res.redirect(`/settings/lead-sources?error=instagram_oauth_failed`);
  }

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state' });
  }

  const oauthState = verifyState(state);

  if (!oauthState) {
    return res.status(400).json({ error: 'Invalid state' });
  }

  try {
    const tokenResponse = await axios.post('https://graph.instagram.com/v18.0/oauth/access_token', {
      client_id: process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: `${process.env.APP_URL}/api/oauth/instagram/callback`,
      code,
    });

    const accessToken = tokenResponse.data.access_token;

    console.log(`[OAuth] Instagram connected for customer ${oauthState.customerId}`);

    const encryptedToken = encryptToken(accessToken);

    await db.query(
      `INSERT INTO lead_source_connections 
       (customerId, provider, accessToken, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
       accessToken = ?, status = ?`,
      [oauthState.customerId, 'instagram_dms', encryptedToken, 'connected', encryptedToken, 'connected']
    );

    await db.query(
      `INSERT INTO audit_log 
       (customerId, action, entityType, entityId, createdAt)
       VALUES (?, ?, ?, ?, NOW())`,
      [oauthState.customerId, 'lead_source_connected', 'instagram_dms', 'instagram_dms']
    );

    return res.redirect('/settings/lead-sources?connected=instagram');
  } catch (error) {
    console.error('[OAuth] Instagram token exchange failed:', error);
    return res.redirect(`/settings/lead-sources?error=instagram_token_exchange_failed`);
  }
});

/**
 * REFRESH TOKEN HELPER
 * Called when token expires
 */
export async function refreshGoogleAdsToken(customerId: string): Promise<string | null> {
  try {
    const connection = await db.query(
      `SELECT refreshToken FROM lead_source_connections WHERE customerId = ? AND provider = 'google_ads'`,
      [customerId]
    );

    if (!connection || connection.length === 0) {
      return null;
    }

    const encryptedRefreshToken = (connection[0] as any).refreshToken;
    const refreshToken = decryptToken(encryptedRefreshToken);

    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const newAccessToken = tokenResponse.data.access_token;
    const expiresIn = tokenResponse.data.expires_in;

    const encryptedAccessToken = encryptToken(newAccessToken);

    await db.query(
      `UPDATE lead_source_connections 
       SET accessToken = ?, expiresAt = DATE_ADD(NOW(), INTERVAL ? SECOND)
       WHERE customerId = ? AND provider = 'google_ads'`,
      [encryptedAccessToken, expiresIn, customerId]
    );

    console.log(`[OAuth] Refreshed Google Ads token for ${customerId}`);
    return newAccessToken;
  } catch (error) {
    console.error('[OAuth] Token refresh failed:', error);
    return null;
  }
}

export default router;
