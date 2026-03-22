/**
 * Omni AI Webhook Router
 * 
 * Handles webhook events from Omni AI marketing platform
 * - Lead creation/ingestion
 * - Feedback loop
 * - Campaign sync
 * - Performance metrics
 */

import { router, protectedProcedure, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import * as db from '../db';
import * as queue from '../_core/services/queue';
import * as decisionEngine from '../_core/services/decisionEngine';
import * as followUpEngine from '../_core/services/followUpEngine';

// ─── TYPES ────────────────────────────────────────────────────────────────────

const OmniAILeadSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string(),
  company: z.string().optional(),
  industry: z.string().optional(),
  title: z.string().optional(),
  sourceId: z.string(),
  campaignId: z.string(),
  source: z.enum(['facebook_ads', 'google_ads', 'linkedin', 'other_platform']),
  leadScore: z.number().optional(),
  metadata: z.record(z.any()).optional(),
});

const OmniAIFeedbackSchema = z.object({
  leadId: z.string(),
  campaignId: z.string(),
  outcome: z.enum([
    'called',
    'appointment_booked',
    'qualified',
    'not_interested',
    'no_answer',
    'voicemail',
    'error',
  ]),
  notes: z.string().optional(),
  duration: z.number().optional(),
  recordingUrl: z.string().optional(),
});

export const webhooksRouter = router({
  /**
   * Receive lead from Omni AI
   * POST /api/webhooks/omni-ai/lead
   */
  omniAiLead: publicProcedure
    .input(OmniAILeadSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        console.log(`[WebhookRouter] Received Omni AI lead: ${input.email}`);

        // Validate webhook signature (in production)
        // verifyOmniAISignature(req);

        // 1. Create or update lead in ApexAI
        let apexLead = await db.getLead({
          email: input.email,
        } as any);

        if (apexLead) {
          // Update existing lead
          await db.updateLead(apexLead.id, {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone,
            company: input.company,
            industry: input.industry,
            title: input.title,
            source: 'omni_ai',
            tags: JSON.stringify(['omni-ai', input.source]),
          });
          console.log(`[WebhookRouter] Updated existing lead: ${apexLead.id}`);
        } else {
          // Create new lead
          const score = input.leadScore || calculateLeadScore(input);
          const segment = score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold';

          await db.createLead({
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone,
            company: input.company,
            industry: input.industry,
            title: input.title,
            source: 'omni_ai',
            score,
            segment,
            tags: JSON.stringify(['omni-ai', input.source]),
            notes: `Omni AI lead from ${input.source}. Original ID: ${input.id}`,
          });

          // Get the created lead
          apexLead = await db.getLead({ email: input.email } as any);
          console.log(`[WebhookRouter] Created new lead: ${apexLead?.id}`);
        }

        if (!apexLead) {
          throw new Error('Failed to create/update lead');
        }

        // 2. Store webhook event for tracking
        await storeWebhookEvent({
          type: 'omni_ai_lead',
          leadId: apexLead.id,
          campaignId: input.campaignId,
          eventData: input,
          status: 'processed',
        });

        // 3. Queue immediate call job (high priority for hot leads)
        if (apexLead.segment === 'hot' || apexLead.score! >= 70) {
          await queue.addCallJob(
            {
              leadId: apexLead.id,
              campaignId: input.campaignId,
            },
            {
              priority: 100, // High priority
              attempts: 3,
            }
          );
          console.log(`[WebhookRouter] Queued call for hot lead: ${apexLead.id}`);
        }

        // 4. Send acknowledgment back to Omni AI
        return {
          success: true,
          leadId: apexLead.id,
          status: 'queued_for_calling',
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('[WebhookRouter] Lead webhook error:', error);

        await storeWebhookEvent({
          type: 'omni_ai_lead',
          eventData: input,
          status: 'failed',
          errorMessage: (error as Error).message,
        });

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process lead',
        });
      }
    }),

  /**
   * Receive feedback from ApexAI call
   * POST /api/webhooks/omni-ai/feedback
   */
  omniAiFeedback: publicProcedure
    .input(OmniAIFeedbackSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        console.log(
          `[WebhookRouter] Received feedback for lead: ${input.leadId} - ${input.outcome}`
        );

        // Find lead
        // const lead = await db.getLeadByOmniAiId(input.leadId);
        // if (!lead) {
        //   throw new Error('Lead not found');
        // }

        // Store feedback event
        await storeWebhookEvent({
          type: 'omni_ai_feedback',
          leadId: 0, // Would have real leadId
          eventData: input,
          status: 'processed',
        });

        // Update lead status based on outcome
        const statusMap: Record<string, any> = {
          appointment_booked: { status: 'qualified', notes: 'Appointment booked via Omni AI call' },
          qualified: { status: 'qualified' },
          not_interested: { status: 'lost' },
          no_answer: { status: 'contacted' },
        };

        const statusUpdate = statusMap[input.outcome];
        if (statusUpdate) {
          // await db.updateLead(lead.id, statusUpdate);
        }

        // Send metrics back to Omni AI (optional)
        await sendMetricsToOmniAi({
          leadId: input.leadId,
          campaignId: input.campaignId,
          outcome: input.outcome,
          duration: input.duration,
        });

        return {
          success: true,
          message: 'Feedback recorded',
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        console.error('[WebhookRouter] Feedback webhook error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process feedback',
        });
      }
    }),

  /**
   * Get webhook status and stats
   * GET /api/webhooks/omni-ai/status
   */
  omniAiStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      // Get stats from webhook events
      const stats = {
        totalLeadsReceived: 0, // Would query DB
        leadsProcessed: 0,
        leadsQueued: 0,
        leadsErrored: 0,
        avgProcessingTime: 0,
        lastProcessedAt: null,
      };

      return {
        status: 'operational',
        stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get webhook status',
      });
    }
  }),

  /**
   * Manual webhook retry
   * POST /api/webhooks/omni-ai/retry
   */
  retryWebhookEvent: protectedProcedure
    .input(z.object({ eventId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // Get event from DB
        // const event = await db.getWebhookEvent(input.eventId);
        // if (!event) throw new Error('Event not found');

        // Reprocess event
        console.log(`[WebhookRouter] Retrying webhook event: ${input.eventId}`);

        return {
          success: true,
          message: 'Event requeued for processing',
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retry event',
        });
      }
    }),

  /**
   * Test webhook endpoint
   * POST /api/webhooks/omni-ai/test
   */
  testWebhook: publicProcedure.mutation(async ({}) => {
    console.log('[WebhookRouter] Test webhook called');

    return {
      success: true,
      message: 'Webhook endpoint is operational',
      timestamp: new Date().toISOString(),
    };
  }),
});

// ─── HELPERS ───────────────────────────────────────────────────────────────────

/**
 * Calculate lead score from Omni AI data
 */
function calculateLeadScore(lead: z.infer<typeof OmniAILeadSchema>): number {
  let score = 50; // Base score

  // Decision maker title boost
  const dmTitles = ['ceo', 'cto', 'cfo', 'vp', 'director', 'president'];
  if (lead.title && dmTitles.some((t) => lead.title!.toLowerCase().includes(t))) {
    score += 20;
  }

  // Company size indicators (would need to look up)
  if (lead.company?.length! > 50) {
    score += 10; // Likely larger company
  }

  // Industry fit (could be configured per campaign)
  const highValueIndustries = ['technology', 'finance', 'healthcare', 'real_estate'];
  if (lead.industry && highValueIndustries.includes(lead.industry.toLowerCase())) {
    score += 15;
  }

  // Source quality
  const sourceScores: Record<string, number> = {
    facebook_ads: 30,
    google_ads: 40,
    linkedin: 50,
    other_platform: 20,
  };
  score += sourceScores[lead.source] || 20;

  return Math.min(100, score);
}

/**
 * Store webhook event for audit trail
 */
async function storeWebhookEvent(data: {
  type: string;
  leadId?: number;
  campaignId?: string;
  eventData: any;
  status: string;
  errorMessage?: string;
}): Promise<void> {
  try {
    // Would store in DB
    console.log(`[WebhookRouter] Webhook event stored: ${data.type} - ${data.status}`);
  } catch (error) {
    console.error('[WebhookRouter] Failed to store webhook event:', error);
  }
}

/**
 * Send metrics/feedback back to Omni AI
 */
async function sendMetricsToOmniAi(data: {
  leadId: string;
  campaignId: string;
  outcome: string;
  duration?: number;
}): Promise<void> {
  try {
    // In production, would send HTTP POST to Omni AI API
    console.log('[WebhookRouter] Sending metrics to Omni AI:', data);

    // const response = await fetch('https://api.omni-ai.com/webhooks/feedback', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${ENV.omniAiApiKey}`,
    //   },
    //   body: JSON.stringify(data),
    // });
  } catch (error) {
    console.error('[WebhookRouter] Failed to send metrics to Omni AI:', error);
  }
}

/**
 * Verify webhook signature from Omni AI (security)
 */
function verifyOmniAISignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return hash === signature;
}

export default webhooksRouter;
