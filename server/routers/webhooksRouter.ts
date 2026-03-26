/**
 * WEBHOOKS ROUTER
 * Public endpoint for Omni AI lead ingestion.
 * All other operations require authentication.
 */

import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import * as db from '../db';

export const webhooksRouter = router({

  // ── Omni AI lead ingestion (public — called by Omni AI platform) ──────────
  omniAiLead: publicProcedure
    .input(z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      leadId: z.string(),
    }))
    .mutation(async ({ input }) => {
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
        });

        const insertId = result.insertId;
        console.log(`[Webhooks] Lead ingested → insertId: ${insertId}`);
        return { success: true, leadId: insertId };
      } catch (error) {
        console.error('[Webhooks] Error ingesting lead:', error);
        return { success: false, error: 'Failed to ingest lead' };
      }
    }),

});

export default webhooksRouter;
