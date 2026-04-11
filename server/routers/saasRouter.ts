/**
 * SAAS ROUTERS — billing wired to Stripe (Checkout + Customer Portal)
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import {
  ENTERPRISE_PLAN,
  SELF_SERVE_PLANS,
  formatPlanLabel,
  getSelfServePlanByCheckoutTier,
  type CheckoutTier,
} from "../../shared/pricing";
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
        plan: z.enum(["starter", "growth", "scale", "enterprise"]),
      })
    )
    .mutation(async ({ input }) => {
      // Create as a lead for follow-up, real customer onboards via Google OAuth + Stripe
      const { createLead } = await import("../db");
      const normalizedPlan = input.plan === "scale" ? "enterprise" : input.plan;
      const { insertId } = await createLead({
        firstName: input.companyName,
        lastName: "Signup",
        email: input.email,
        phone: input.phone,
        industry: input.industry,
        source: `signup_${normalizedPlan}`,
        status: "new",
        score: 80,
        segment: "hot",
        createdBy: 1,
      });
      return { customerId: `cust_${insertId}`, leadId: insertId, plan: normalizedPlan };
    }),

  get: protectedProcedure.query(async ({ ctx }) => {
    const { getUserById } = await import("../db");
    const user = await getUserById(ctx.user.id);
    if (!user) throw new TRPCError({ code: "NOT_FOUND" });
    return {
      id: `cust_${user.id}`,
      companyName: (user as any).name ?? "My Company",
      plan: (user as any).plan ?? "starter",
      email: (user as any).email ?? "",
    };
  }),

  getUsage: protectedProcedure.query(async ({ ctx }) => {
    const { getGlobalMetrics } = await import("../db");
    const m = await getGlobalMetrics(ctx.user.id);
    const limit = 50000; // default plan limit
    return {
      leadsUsed: m.totalLeads ?? 0,
      leadsLimit: limit,
      percentage: limit > 0 ? Math.round(((m.totalLeads ?? 0) / limit) * 100) : 0,
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
    .query(async ({ ctx }) => {
      const { getGlobalMetrics, getDashboardBreakdown } = await import("../db");
      const m = await getGlobalMetrics(ctx.user.id);
      const bd = await getDashboardBreakdown(ctx.user.id);
      return {
        leads: m.totalLeads ?? 0,
        callsMade: bd.totalCalls ?? 0,
        appointmentsBooked: m.totalAppointments ?? 0,
        appointmentsShowed: 0, // tracked when appointment status updates
        revenueGenerated: m.totalRevenue ?? 0,
        showRate: (m.totalAppointments ?? 0) > 0 ? Math.round((0 / (m.totalAppointments ?? 1)) * 100) : 0,
        bookingRate: bd.totalCalls > 0 ? Math.round(((m.totalAppointments ?? 0) / bd.totalCalls) * 100) : 0,
        callSuccessRate: bd.totalCalls > 0 ? Math.round(((bd.callsByOutcome.find(o => o.outcome === "scheduled")?.count ?? 0) / bd.totalCalls) * 100) : 0,
      };
    }),
});

const billingRouter = router({
  /** Canonical pricing metadata — real charges go through Stripe Checkout */
  pricing: publicProcedure.query(() => {
    return {
      selfServePlans: SELF_SERVE_PLANS,
      enterprisePlan: ENTERPRISE_PLAN,
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
    const normalizedTier = ((s?.plan ?? "").toLowerCase() === "starter" || (s?.plan ?? "").toLowerCase() === "growth")
      ? ((s?.plan ?? "").toLowerCase() as CheckoutTier)
      : "enterprise";
    const amount = s?.plan && s.plan !== "trial"
      ? getSelfServePlanByCheckoutTier(normalizedTier).price
      : 0;
    return {
      customerId: s?.stripeCustomerId ?? "unknown",
      amount,
      status: s?.subscriptionStatus ?? "none",
      planLabel: formatPlanLabel(s?.plan ?? "trial"),
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
    .query(async ({ ctx, input }) => {
      const { getLeads } = await import("../db");
      return getLeads({ limit: input.limit, offset: input.offset, userId: ctx.user.id });
    }),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const { getLeadById } = await import("../db");
    return getLeadById(input.id) ?? null;
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
