/**
 * STRIPE WEBHOOK HANDLER - SIMPLIFIED
 */

import { Router } from 'express';
import * as db from '../../db';

const router = Router();

export async function handleStripeWebhook(req: any, res: any) {
  console.log('[Stripe] Webhook received');
  return res.status(200).json({ received: true });
}

router.post('/webhooks/stripe', handleStripeWebhook);

export default router;
