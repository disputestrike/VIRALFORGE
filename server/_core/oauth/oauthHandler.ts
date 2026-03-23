/**
 * OAUTH HANDLER - FIXED
 * Placeholder implementation
 */

import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

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
    expiresAt: now + 15 * 60 * 1000,
  });

  return state;
}

function verifyState(state: string): OAuthState | null {
  const oauthState = oauthStates.get(state);

  if (!oauthState || oauthState.expiresAt < Date.now()) {
    oauthStates.delete(state);
    return null;
  }

  oauthStates.delete(state);
  return oauthState;
}

router.get('/oauth/google-ads/authorize', (req, res) => {
  const customerId = req.query.customerId as string;
  if (!customerId) {
    return res.status(400).json({ error: 'customerId required' });
  }
  const state = generateState(customerId, 'google_ads');
  // TODO: Redirect to Google OAuth
  res.json({ status: 'oauth_flow_started', provider: 'google_ads' });
});

router.get('/oauth/facebook/authorize', (req, res) => {
  const customerId = req.query.customerId as string;
  if (!customerId) {
    return res.status(400).json({ error: 'customerId required' });
  }
  const state = generateState(customerId, 'facebook_leads');
  // TODO: Redirect to Facebook OAuth
  res.json({ status: 'oauth_flow_started', provider: 'facebook_leads' });
});

router.get('/oauth/instagram/authorize', (req, res) => {
  const customerId = req.query.customerId as string;
  if (!customerId) {
    return res.status(400).json({ error: 'customerId required' });
  }
  const state = generateState(customerId, 'instagram_dms');
  // TODO: Redirect to Instagram OAuth
  res.json({ status: 'oauth_flow_started', provider: 'instagram_dms' });
});

export async function refreshGoogleAdsToken(customerId: string): Promise<string | null> {
  console.log(`[OAuth] Token refresh requested for ${customerId}`);
  return null;
}

export default router;
