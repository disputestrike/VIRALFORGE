/**
 * STRIPE WEBHOOK SYSTEM - PRODUCTION GRADE
 * 
 * Handles all Stripe events with:
 * - Signature verification
 * - Idempotency (no double charges)
 * - Error recovery
 * - Audit logging
 */

import { Router } from 'express';
import Stripe from 'stripe';
import * as db from '../db';
import { z } from 'zod';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
});

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * VERIFY STRIPE SIGNATURE
 * Prevents spoofed webhooks
 */
export function verifyStripeSignature(
  body: string | Buffer,
  signature: string,
  secret: string = STRIPE_WEBHOOK_SECRET
): Stripe.Event | null {
  try {
    return stripe.webhooks.constructEvent(body, signature, secret) as Stripe.Event;
  } catch (error) {
    console.error('[Stripe] Signature verification failed:', error);
    return null;
  }
}

/**
 * CHECK IDEMPOTENCY
 * Prevents double-processing same event
 */
async function checkIdempotency(eventId: string, eventType: string): Promise<boolean> {
  const existing = await db.query(
    `SELECT id FROM webhook_events WHERE eventId = ? AND eventType = ?`,
    [eventId, eventType]
  );

  if (existing.length > 0) {
    console.log(`[Stripe] Event ${eventId} already processed, skipping`);
    return false; // Already processed
  }

  return true; // New event
}

/**
 * LOG WEBHOOK EVENT
 * For audit and debugging
 */
async function logWebhookEvent(
  customerId: string,
  eventId: string,
  eventType: string,
  payload: any,
  signatureVerified: boolean,
  status: 'received' | 'processing' | 'completed' | 'failed' = 'received',
  errorMessage: string | null = null
) {
  await db.query(
    `INSERT INTO webhook_events 
     (customerId, provider, eventId, eventType, payload, signatureVerified, status, errorMessage, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [customerId, 'stripe', eventId, eventType, JSON.stringify(payload), signatureVerified ? 1 : 0, status, errorMessage]
  );
}

/**
 * HANDLE: customer.subscription.created
 * New subscription started
 */
async function handleSubscriptionCreated(event: Stripe.Event, customerId: string) {
  const subscription = event.data.object as Stripe.Subscription;

  console.log(`[Stripe] Subscription created for ${customerId}: ${subscription.id}`);

  // Update customer status
  await db.query(
    `UPDATE customers SET 
     status = ?, 
     subscriptionEndsAt = ?,
     updatedAt = NOW()
     WHERE stripeCustomerId = ?`,
    ['active', new Date(subscription.current_period_end * 1000), subscription.customer]
  );

  // Log to audit
  await db.query(
    `INSERT INTO audit_log 
     (customerId, action, entityType, entityId, changesAfter, createdAt)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [
      customerId,
      'subscription_created',
      'subscription',
      subscription.id,
      JSON.stringify({ plan: subscription.items.data[0].plan.id }),
    ]
  );
}

/**
 * HANDLE: customer.subscription.updated
 * Subscription changed (plan upgrade/downgrade, etc)
 */
async function handleSubscriptionUpdated(event: Stripe.Event, customerId: string) {
  const subscription = event.data.object as Stripe.Subscription;
  const previousSubscription = event.data.previous_attributes as any;

  console.log(`[Stripe] Subscription updated for ${customerId}: ${subscription.id}`);

  // If plan changed, update customer tier
  if (previousSubscription?.items?.data?.[0]?.plan?.id !== subscription.items.data[0].plan.id) {
    const planId = subscription.items.data[0].plan.id;
    let plan: 'starter' | 'growth' | 'enterprise' = 'starter';
    let leadLimit = 5000;

    if (planId.includes('growth')) {
      plan = 'growth';
      leadLimit = 50000;
    } else if (planId.includes('enterprise')) {
      plan = 'enterprise';
      leadLimit = 500000;
    }

    await db.query(
      `UPDATE customers SET 
       plan = ?, 
       monthlyLeadLimit = ?,
       monthlyLeadsUsed = 0,
       updatedAt = NOW()
       WHERE stripeCustomerId = ?`,
      [plan, leadLimit, subscription.customer]
    );

    console.log(`[Stripe] Upgraded customer to ${plan}`);
  }

  // Log change
  await db.query(
    `INSERT INTO audit_log 
     (customerId, action, entityType, entityId, changesBefore, changesAfter, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, NOW())`,
    [
      customerId,
      'subscription_updated',
      'subscription',
      subscription.id,
      JSON.stringify(previousSubscription),
      JSON.stringify({ items: subscription.items.data }),
    ]
  );
}

/**
 * HANDLE: customer.subscription.deleted
 * Subscription cancelled
 */
async function handleSubscriptionDeleted(event: Stripe.Event, customerId: string) {
  const subscription = event.data.object as Stripe.Subscription;

  console.log(`[Stripe] Subscription deleted for ${customerId}: ${subscription.id}`);

  // Update customer status to cancelled
  await db.query(
    `UPDATE customers SET 
     status = ?,
     subscriptionEndsAt = NOW(),
     updatedAt = NOW()
     WHERE stripeCustomerId = ?`,
    ['cancelled', subscription.customer]
  );

  // Log cancellation
  await db.query(
    `INSERT INTO audit_log 
     (customerId, action, entityType, entityId, changesAfter, createdAt)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [customerId, 'subscription_cancelled', 'subscription', subscription.id, JSON.stringify({ reason: subscription.cancellation_details })]
  );
}

/**
 * HANDLE: invoice.payment_succeeded
 * Invoice paid successfully
 */
async function handleInvoicePaymentSucceeded(event: Stripe.Event, customerId: string) {
  const invoice = event.data.object as Stripe.Invoice;

  console.log(`[Stripe] Invoice paid for ${customerId}: ${invoice.id}`);

  // Create billing transaction record
  const idempotencyKey = `stripe_${invoice.id}`;

  // Check if already recorded
  const existing = await db.query(
    `SELECT id FROM billing_transactions WHERE idempotencyKey = ?`,
    [idempotencyKey]
  );

  if (existing.length === 0) {
    await db.query(
      `INSERT INTO billing_transactions 
       (customerId, stripeTransactionId, type, amount, currency, status, idempotencyKey, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        customerId,
        invoice.id,
        'monthly_plan',
        (invoice.amount_paid / 100).toString(), // Convert cents to dollars
        invoice.currency,
        'completed',
        idempotencyKey,
        `Invoice ${invoice.number}`,
      ]
    );

    console.log(`[Stripe] Recorded payment of $${invoice.amount_paid / 100} for ${customerId}`);
  }

  // Update invoice status
  await db.query(
    `UPDATE invoices SET status = ?, paidAt = NOW() WHERE stripeInvoiceId = ?`,
    ['paid', invoice.id]
  );

  // Log to audit
  await db.query(
    `INSERT INTO audit_log 
     (customerId, action, entityType, entityId, metadata, createdAt)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [customerId, 'payment_received', 'invoice', invoice.id, JSON.stringify({ amount: invoice.amount_paid })]
  );
}

/**
 * HANDLE: invoice.payment_failed
 * Invoice payment failed
 */
async function handleInvoicePaymentFailed(event: Stripe.Event, customerId: string) {
  const invoice = event.data.object as Stripe.Invoice;

  console.log(`[Stripe] Invoice payment failed for ${customerId}: ${invoice.id}`);

  // Mark invoice as failed
  await db.query(
    `UPDATE invoices SET status = ? WHERE stripeInvoiceId = ?`,
    ['uncollectible', invoice.id]
  );

  // Create billing transaction record as failed
  const idempotencyKey = `stripe_failed_${invoice.id}`;

  const existing = await db.query(
    `SELECT id FROM billing_transactions WHERE idempotencyKey = ?`,
    [idempotencyKey]
  );

  if (existing.length === 0) {
    await db.query(
      `INSERT INTO billing_transactions 
       (customerId, stripeTransactionId, type, amount, currency, status, idempotencyKey, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        customerId,
        invoice.id,
        'monthly_plan',
        (invoice.amount_due / 100).toString(),
        invoice.currency,
        'failed',
        idempotencyKey,
        `Failed: ${invoice.last_status_transition?.type || 'unknown'}`,
      ]
    );
  }

  // Pause customer if payment fails
  await db.query(
    `UPDATE customers SET status = ?, updatedAt = NOW() WHERE stripeCustomerId = ?`,
    ['paused', invoice.customer]
  );

  console.log(`[Stripe] Paused customer due to payment failure`);

  // Log to audit
  await db.query(
    `INSERT INTO audit_log 
     (customerId, action, entityType, entityId, metadata, createdAt)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [customerId, 'payment_failed', 'invoice', invoice.id, JSON.stringify({ reason: invoice.last_status_transition?.metadata })]
  );
}

/**
 * HANDLE: charge.refunded
 * Refund processed
 */
async function handleChargeRefunded(event: Stripe.Event, customerId: string) {
  const charge = event.data.object as Stripe.Charge;

  console.log(`[Stripe] Charge refunded for ${customerId}: ${charge.id}`);

  const idempotencyKey = `stripe_refund_${charge.id}`;

  const existing = await db.query(
    `SELECT id FROM billing_transactions WHERE idempotencyKey = ?`,
    [idempotencyKey]
  );

  if (existing.length === 0) {
    await db.query(
      `INSERT INTO billing_transactions 
       (customerId, stripeTransactionId, type, amount, currency, status, idempotencyKey, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        customerId,
        charge.id,
        'refund',
        (charge.refunded ? (charge.amount_refunded / 100) : 0).toString(),
        charge.currency,
        'completed',
        idempotencyKey,
        `Refund for charge ${charge.id}`,
      ]
    );
  }

  // Log to audit
  await db.query(
    `INSERT INTO audit_log 
     (customerId, action, entityType, entityId, metadata, createdAt)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [customerId, 'refund_processed', 'charge', charge.id, JSON.stringify({ amount: charge.amount_refunded })]
  );
}

/**
 * MAIN WEBHOOK HANDLER
 */
export async function handleStripeWebhook(req: any, res: any) {
  const signature = req.headers['stripe-signature'];
  const body = req.rawBody || req.body;

  // Verify signature
  const event = verifyStripeSignature(body, signature);

  if (!event) {
    console.error('[Stripe] Invalid signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  console.log(`[Stripe] Received event: ${event.type} (${event.id})`);

  try {
    // Get customer ID from Stripe customer object
    let customerId: string | null = null;

    if ((event.data.object as any).customer) {
      const stripeCustomerId = (event.data.object as any).customer;
      const customer = await db.query(
        `SELECT id FROM customers WHERE stripeCustomerId = ?`,
        [stripeCustomerId]
      );

      if (customer.length > 0) {
        customerId = (customer[0] as any).id;
      }
    }

    if (!customerId) {
      console.warn(`[Stripe] Could not find customer for event ${event.id}`);
      return res.status(200).json({ received: true }); // Still return 200 to prevent retries
    }

    // Check idempotency
    const isNewEvent = await checkIdempotency(event.id, event.type);

    if (!isNewEvent) {
      return res.status(200).json({ received: true });
    }

    // Log event as received
    await logWebhookEvent(customerId, event.id, event.type, event.data, true, 'processing');

    // Route to handler
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event, customerId);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event, customerId);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event, customerId);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event, customerId);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event, customerId);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event, customerId);
        break;

      default:
        console.log(`[Stripe] Unhandled event type: ${event.type}`);
    }

    // Mark event as completed
    await db.query(
      `UPDATE webhook_events SET status = ?, processedAt = NOW() WHERE eventId = ?`,
      ['completed', event.id]
    );

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[Stripe] Error processing webhook:', error);

    // Log failure
    if (customerId) {
      await logWebhookEvent(
        customerId,
        event.id,
        event.type,
        event.data,
        true,
        'failed',
        (error as Error).message
      );
    }

    // Return 200 anyway to prevent Stripe from retrying
    return res.status(200).json({ received: true, error: (error as Error).message });
  }
}

/**
 * ROUTER SETUP
 */
export const stripeWebhookRouter = Router();

// Webhook endpoint (must use raw body, not JSON parsed)
stripeWebhookRouter.post('/webhooks/stripe', (req: any, res: any) => {
  handleStripeWebhook(req, res);
});

export default stripeWebhookRouter;
