import type { Request } from "express";
import Stripe from "stripe";
import { ENV } from "../env";
import * as db from "../../db";

let stripeClient: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (stripeClient !== undefined) return stripeClient;
  if (!ENV.stripeSecretKey) {
    stripeClient = null;
    return null;
  }
  stripeClient = new Stripe(ENV.stripeSecretKey);
  return stripeClient;
}

function priceIdForTier(tier: "starter" | "growth" | "enterprise"): string {
  const map = {
    starter: ENV.stripePriceStarter,
    growth: ENV.stripePriceGrowth,
    enterprise: ENV.stripePriceEnterprise,
  };
  const id = map[tier];
  if (!id) {
    throw new Error(`Missing Stripe price id for tier "${tier}" — set STRIPE_PRICE_${tier.toUpperCase()} in Railway`);
  }
  return id;
}

function absoluteUrl(path: string): string {
  const base = ENV.publicUrl.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export async function ensureStripeCustomer(userId: number, email: string | null | undefined, name: string | null | undefined) {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");
  const user = await db.getUserById(userId);
  if (!user) throw new Error("User not found");
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    name: name ?? undefined,
    metadata: { userId: String(userId) },
  });
  await db.updateUserStripeBilling(userId, { stripeCustomerId: customer.id });
  return customer.id;
}

export async function createCheckoutSession(opts: {
  userId: number;
  email: string | null | undefined;
  name: string | null | undefined;
  tier: "starter" | "growth" | "enterprise";
}) {
  const stripe = getStripe();
  if (!stripe) {
    return { ok: false as const, error: "Stripe is not configured (set STRIPE_SECRET_KEY and price ids on Railway)." };
  }
  const customerId = await ensureStripeCustomer(opts.userId, opts.email, opts.name);
  const price = priceIdForTier(opts.tier);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: absoluteUrl(ENV.stripeCheckoutSuccessPath),
    cancel_url: absoluteUrl(ENV.stripeCheckoutCancelPath),
    client_reference_id: String(opts.userId),
    metadata: { userId: String(opts.userId), tier: opts.tier },
    subscription_data: {
      metadata: { userId: String(opts.userId), tier: opts.tier },
    },
  });

  if (!session.url) return { ok: false as const, error: "Stripe did not return a checkout URL" };
  return { ok: true as const, url: session.url };
}

export async function createBillingPortalSession(stripeCustomerId: string) {
  const stripe = getStripe();
  if (!stripe) {
    return { ok: false as const, error: "Stripe is not configured" };
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: absoluteUrl("/settings"),
  });
  return { ok: true as const, url: session.url };
}

export async function getBillingStatusForUser(userId: number) {
  const user = await db.getUserById(userId);
  if (!user) return null;
  return {
    stripeConfigured: ENV.stripeEnabled,
    stripeCustomerId: user.stripeCustomerId ?? null,
    subscriptionId: user.stripeSubscriptionId ?? null,
    subscriptionStatus: user.stripeSubscriptionStatus ?? null,
    plan: user.plan ?? "trial",
    pricesConfigured: {
      starter: !!ENV.stripePriceStarter,
      growth: !!ENV.stripePriceGrowth,
      enterprise: !!ENV.stripePriceEnterprise,
    },
  };
}

export async function handleStripeWebhook(req: Request): Promise<{ received: boolean; error?: string }> {
  const stripe = getStripe();
  if (!stripe || !ENV.stripeWebhookSecret) {
    return { received: false, error: "Stripe webhook not configured" };
  }
  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    return { received: false, error: "Missing stripe-signature" };
  }
  const raw = req.body;
  if (!Buffer.isBuffer(raw)) {
    return { received: false, error: "Expected raw body" };
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, ENV.stripeWebhookSecret);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { received: false, error: msg };
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = parseInt(session.metadata?.userId ?? session.client_reference_id ?? "0", 10);
        if (!userId) break;
        const subId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        const tier = session.metadata?.tier;
        const custId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer && typeof session.customer === "object" && "id" in session.customer
              ? (session.customer as { id: string }).id
              : null;
        await db.updateUserStripeBilling(userId, {
          stripeCustomerId: custId,
          stripeSubscriptionId: subId ?? null,
          stripeSubscriptionStatus: "active",
          plan: tier ?? undefined,
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const user = await db.findUserByStripeCustomerId(customerId);
        if (user) {
          await db.updateUserStripeBilling(user.id, {
            stripeSubscriptionId: sub.id,
            stripeSubscriptionStatus: sub.status,
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Stripe] webhook handler error:", msg);
    return { received: false, error: msg };
  }

  return { received: true };
}
