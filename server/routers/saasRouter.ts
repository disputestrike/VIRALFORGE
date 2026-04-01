/**
 * SAAS ROUTERS — billing wired to Stripe (Checkout + Customer Portal)
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import {
  createBillingPortalSession,
  createCheckoutSession,
  getBillingStatusForUser,
  getStripe,
} from "../_core/services/stripeBilling";

const customerRouter = router({
  create: publicProcedure
    .input(
      z.object({
        companyName: z.string().min(2),
        email: z.string().email(),
        phone: z.string(),
        industry: z.string(),
        plan: z.enum(["starter", "growth", "enterprise"]),
      })
    )
    .mutation(async ({ input }) => {
      return {
        customerId: `cust_${Date.now()}`,
        apiKey: `key_${Date.now()}`,
        plan: input.plan,
        monthlyLimit: 5000,
      };
    }),

  get: protectedProcedure.query(async () => {
    return {
      id: "cust_example",
      companyName: "Example Company",
      plan: "growth",
    };
  }),

  getUsage: protectedProcedure.query(async () => {
    return {
      leadsUsed: 0,
      leadsLimit: 50000,
      percentage: 0,
    };
  }),
});

const leadSourceRouter = router({
  connectGoogleAds: protectedProcedure
    .input(z.object({ refreshToken: z.string() }))
    .mutation(async () => {
      return { status: "connected", provider: "google_ads" };
    }),

  list: protectedProcedure.query(async () => {
    return [];
  }),
});

const dashboardRouter = router({
  stats: protectedProcedure
    .input(z.object({ dateRange: z.enum(["today", "week", "month", "year"]).default("month") }))
    .query(async () => {
      return {
        leads: 0,
        callsMade: 0,
        appointmentsBooked: 0,
        appointmentsShowed: 0,
        revenueGenerated: 0,
        showRate: 0,
        bookingRate: 0,
        callSuccessRate: 0,
      };
    }),
});

const billingRouter = router({
  /** Static plan labels for UI — real charges go through Stripe Checkout */
  pricing: publicProcedure.query(() => {
    return {
      plans: {
        starter: { name: "Starter", monthlyPrice: 99, leadsPerMonth: 5000 },
        growth: { name: "Growth", monthlyPrice: 299, leadsPerMonth: 50000 },
        enterprise: { name: "Enterprise", monthlyPrice: 999, leadsPerMonth: 500000 },
      },
    };
  }),

  status: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
    const s = await getBillingStatusForUser(ctx.user.id);
    if (!s) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    return s;
  }),

  createCheckoutSession: protectedProcedure
    .input(z.object({ tier: z.enum(["starter", "growth", "enterprise"]) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      if (!getStripe()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Stripe is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_* on Railway.",
        });
      }
      const result = await createCheckoutSession({
        userId: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        tier: input.tier,
      });
      if (!result.ok) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
      }
      return { url: result.url };
    }),

  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
    const cid = ctx.user.stripeCustomerId;
    if (!cid) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "No Stripe customer yet — subscribe once via Checkout first.",
      });
    }
    const result = await createBillingPortalSession(cid);
    if (!result.ok) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
    }
    return { url: result.url };
  }),

  /** Legacy shape — prefer `status` */
  currentInvoice: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
    const s = await getBillingStatusForUser(ctx.user.id);
    return {
      customerId: s?.stripeCustomerId ?? "unknown",
      amount: 299,
      status: s?.subscriptionStatus ?? "none",
    };
  }),
});

const leadsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async () => {
      return [];
    }),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async () => {
    return null;
  }),
});

export const saasRouter = router({
  customers: customerRouter,
  leadSources: leadSourceRouter,
  dashboard: dashboardRouter,
  billing: billingRouter,
  leads: leadsRouter,
});

export default saasRouter;
