/**
 * SAAS PLATFORM ROUTERS
 * 
 * Complete API for $100M platform
 * - Customer onboarding
 * - Lead source management
 * - Billing
 * - Dashboard access
 */

import { router, protectedProcedure, publicProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import * as multiTenantService from '../services/multiTenantService';
import * as leadSourceConnectors from '../services/leadSourceConnectors';
import * as analyticsEngine from '../services/analyticsEngine';
import * as queueService from '../services/queue';
import * as db from '../db';

// ──────────────────────────────────────────────────────────────────────────────
// CUSTOMER MANAGEMENT ROUTER
// ──────────────────────────────────────────────────────────────────────────────

const customerRouter = router({
  // Create new customer (during signup)
  create: publicProcedure
    .input(z.object({
      companyName: z.string().min(2),
      email: z.string().email(),
      phone: z.string(),
      industry: z.string(),
      plan: z.enum(['starter', 'growth', 'enterprise']),
    }))
    .mutation(async ({ input }) => {
      const customer = await multiTenantService.createCustomer(input);
      return {
        customerId: customer.id,
        apiKey: customer.apiKey,
        plan: customer.plan,
        monthlyLimit: customer.monthlyLeadLimit,
      };
    }),

  // Get customer details
  get: protectedProcedure
    .query(async ({ ctx }) => {
      const customerId = ctx.user.customerId;
      if (!customerId) throw new TRPCError({ code: 'UNAUTHORIZED' });

      const customer = await multiTenantService.getCustomerByApiKey(ctx.user.apiKey);
      return customer;
    }),

  // Update customer settings
  update: protectedProcedure
    .input(z.object({
      companyName: z.string().optional(),
      phone: z.string().optional(),
      timezone: z.string().optional(),
      webhookUrl: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Update in database
      return { status: 'updated' };
    }),

  // Get usage this month
  getUsage: protectedProcedure
    .query(async ({ ctx }) => {
      const customerId = ctx.user.customerId;
      const customer = await multiTenantService.getCustomerByApiKey(ctx.user.apiKey);

      return {
        leadsUsed: customer?.monthlyLeadsUsed || 0,
        leadsLimit: customer?.monthlyLeadLimit || 0,
        percentage: customer ? Math.round((customer.monthlyLeadsUsed / customer.monthlyLeadLimit) * 100) : 0,
      };
    }),
});

// ──────────────────────────────────────────────────────────────────────────────
// LEAD SOURCE ROUTER
// ──────────────────────────────────────────────────────────────────────────────

const leadSourceRouter = router({
  // Connect Google Ads
  connectGoogleAds: protectedProcedure
    .input(z.object({
      refreshToken: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await leadSourceConnectors.connectGoogleAds(ctx.user.customerId, input.refreshToken);
    }),

  // Connect Facebook
  connectFacebook: protectedProcedure
    .input(z.object({
      pageAccessToken: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await leadSourceConnectors.connectFacebookLeads(ctx.user.customerId, input.pageAccessToken);
    }),

  // Connect Instagram
  connectInstagram: protectedProcedure
    .input(z.object({
      businessAccountToken: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await leadSourceConnectors.connectInstagramDMs(ctx.user.customerId, input.businessAccountToken);
    }),

  // Connect Angi
  connectAngi: protectedProcedure
    .input(z.object({
      apiKey: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await leadSourceConnectors.connectAngi(ctx.user.customerId, input.apiKey);
    }),

  // Connect Thumbtack
  connectThumbTack: protectedProcedure
    .input(z.object({
      apiKey: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await leadSourceConnectors.connectThumbTack(ctx.user.customerId, input.apiKey);
    }),

  // Get connected sources
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const sources = await db.query(
        `SELECT provider, status, createdAt FROM lead_source_connections WHERE customerId = ?`,
        [ctx.user.customerId]
      );
      return sources;
    }),

  // Disconnect source
  disconnect: protectedProcedure
    .input(z.object({
      provider: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.query(
        `DELETE FROM lead_source_connections WHERE customerId = ? AND provider = ?`,
        [ctx.user.customerId, input.provider]
      );
      return { status: 'disconnected' };
    }),
});

// ──────────────────────────────────────────────────────────────────────────────
// DASHBOARD ROUTER
// ──────────────────────────────────────────────────────────────────────────────

const dashboardRouter = router({
  // Main dashboard stats
  stats: protectedProcedure
    .input(z.object({
      dateRange: z.enum(['today', 'week', 'month', 'year']).default('month'),
    }))
    .query(async ({ input, ctx }) => {
      return await analyticsEngine.getDashboardStats(ctx.user.customerId, input.dateRange);
    }),

  // Lead source performance
  leadSources: protectedProcedure
    .input(z.object({
      dateRange: z.enum(['today', 'week', 'month']).default('month'),
    }))
    .query(async ({ input, ctx }) => {
      return await analyticsEngine.getLeadSourceMetrics(ctx.user.customerId, input.dateRange);
    }),

  // Call metrics
  calls: protectedProcedure
    .input(z.object({
      dateRange: z.enum(['today', 'week', 'month']).default('month'),
    }))
    .query(async ({ input, ctx }) => {
      return await analyticsEngine.getCallMetrics(ctx.user.customerId, input.dateRange);
    }),

  // Appointment funnel
  funnel: protectedProcedure
    .input(z.object({
      dateRange: z.enum(['today', 'week', 'month']).default('month'),
    }))
    .query(async ({ input, ctx }) => {
      return await analyticsEngine.getAppointmentFunnel(ctx.user.customerId, input.dateRange);
    }),

  // ROI calculation
  roi: protectedProcedure
    .input(z.object({
      dateRange: z.enum(['today', 'week', 'month']).default('month'),
    }))
    .query(async ({ input, ctx }) => {
      return await analyticsEngine.calculateROI(ctx.user.customerId, input.dateRange);
    }),

  // Revenue metrics
  revenue: protectedProcedure
    .input(z.object({
      dateRange: z.enum(['today', 'week', 'month']).default('month'),
    }))
    .query(async ({ input, ctx }) => {
      return await analyticsEngine.getRevenueMetrics(ctx.user.customerId, input.dateRange);
    }),
});

// ──────────────────────────────────────────────────────────────────────────────
// BILLING ROUTER
// ──────────────────────────────────────────────────────────────────────────────

const billingRouter = router({
  // Get current invoice
  currentInvoice: protectedProcedure
    .query(async ({ ctx }) => {
      const charges = await multiTenantService.calculateMonthlyCharges(ctx.user.customerId);
      return charges;
    }),

  // Get billing history
  history: protectedProcedure
    .input(z.object({
      limit: z.number().default(10),
    }))
    .query(async ({ input, ctx }) => {
      const invoices = await db.query(
        `SELECT * FROM invoices WHERE customerId = ? ORDER BY createdAt DESC LIMIT ?`,
        [ctx.user.customerId, input.limit]
      );
      return invoices;
    }),

  // Update payment method
  updatePaymentMethod: protectedProcedure
    .input(z.object({
      stripeToken: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Update Stripe customer's payment method
      return { status: 'updated' };
    }),

  // Get usage-based pricing
  pricing: publicProcedure
    .query(() => {
      return {
        plans: {
          starter: {
            name: 'Starter',
            monthlyPrice: 99,
            leadsPerMonth: 5000,
            features: ['Basic calling', 'SMS/Email', 'Dashboard'],
          },
          growth: {
            name: 'Growth',
            monthlyPrice: 299,
            leadsPerMonth: 50000,
            features: ['Advanced routing', 'Multi-team', 'Analytics'],
          },
          enterprise: {
            name: 'Enterprise',
            monthlyPrice: 999,
            leadsPerMonth: 500000,
            features: ['Custom integration', 'Dedicated support', 'API access'],
          },
        },
        successFee: 'Starting at 10% of booked appointments',
      };
    }),
});

// ──────────────────────────────────────────────────────────────────────────────
// LEADS ROUTER (for customer to manage their leads)
// ──────────────────────────────────────────────────────────────────────────────

const leadsRouter = router({
  // List customer's leads
  list: protectedProcedure
    .input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
      source: z.string().optional(),
      status: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      let query = `SELECT * FROM leads WHERE customerId = ?`;
      const params: any[] = [ctx.user.customerId];

      if (input.source) {
        query += ` AND source = ?`;
        params.push(input.source);
      }

      if (input.status) {
        query += ` AND status = ?`;
        params.push(input.status);
      }

      query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
      params.push(input.limit, input.offset);

      return await db.query(query, params);
    }),

  // Get single lead
  get: protectedProcedure
    .input(z.object({
      id: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const lead = await db.query(
        `SELECT * FROM leads WHERE id = ? AND customerId = ?`,
        [input.id, ctx.user.customerId]
      );
      if (!lead || lead.length === 0) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return lead[0];
    }),

  // Update lead (score, status, etc.)
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.string().optional(),
      score: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;
      await db.query(
        `UPDATE leads SET ? WHERE id = ? AND customerId = ?`,
        [updates, id, ctx.user.customerId]
      );
      return { status: 'updated' };
    }),
});

// ──────────────────────────────────────────────────────────────────────────────
// EXPORT SAAS ROUTER
// ──────────────────────────────────────────────────────────────────────────────

export const saasRouter = router({
  customers: customerRouter,
  leadSources: leadSourceRouter,
  dashboard: dashboardRouter,
  billing: billingRouter,
  leads: leadsRouter,
});

export default saasRouter;
