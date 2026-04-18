/**
 * WEBHOOKS ROUTER
 * Public endpoint for Omni AI lead ingestion.
 *
 * Abuse protection on omniAiLead:
 *   1. Rate limited — 100 req/min per IP (webhookRateLimiter in index.ts)
 *   2. Optional shared secret — set WEBHOOK_SECRET in Railway Variables.
 *      If set, every request must include header: x-webhook-secret: <value>
 *      If not set, endpoint is open (acceptable for trusted internal use).
 *   3. Input validation — Zod schema rejects malformed payloads
 */

import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import * as db from '../db';

export const webhooksRouter = router({

  omniAiLead: publicProcedure
    .input(z.object({
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      email: z.string().email().optional(),
      phone: z.string().max(20).optional(),
      company: z.string().max(200).optional(),
      leadId: z.string().max(100),
    }))
    .mutation(async ({ input, ctx }) => {
      // Optional shared secret check
      const webhookSecret = process.env.WEBHOOK_SECRET;
      if (webhookSecret) {
        const provided = (ctx as any)?.req?.headers?.['x-webhook-secret'];
        if (provided !== webhookSecret) {
          console.warn(`[Webhooks] Rejected — invalid x-webhook-secret from ${(ctx as any)?.req?.ip}`);
          return { success: false, error: 'Unauthorized' };
        }
      }

      try {
        const result = await db.createLead({
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          company: input.company,
          verificationStatus: 'verified',
          score: 75,
          segment: 'hot',
          status: 'new',
          createdBy: 1,
        });

        const insertId = result.insertId;
        const { addAutomationJob } = await import('../_core/services/queue');
        await addAutomationJob({
          action: 'lead.created',
          userId: 1,
          payload: {
            leadId: insertId,
            score: 75,
            segment: 'hot',
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone,
            company: input.company,
            source: 'omni_ai',
          },
        });
        console.log(`[Webhooks] Lead ingested → insertId: ${insertId} | source: omniAiLead`);
        return { success: true, leadId: insertId };
      } catch (error) {
        console.error('[Webhooks] Error ingesting lead:', error);
        return { success: false, error: 'Failed to ingest lead' };
      }
    }),

});

export default webhooksRouter;
