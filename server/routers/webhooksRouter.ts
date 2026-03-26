/**
 * WEBHOOKS ROUTER
 * Public endpoints for:
 * - Omni AI lead ingestion
 * - Runtime test runner (creates lead + campaign + queues job, no auth needed)
 */

import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import * as db from '../db';
import * as queueService from '../_core/services/queue';
import * as decisionEngine from '../_core/services/decisionEngine';

export const webhooksRouter = router({

  // ── Omni AI lead ingestion ─────────────────────────────────
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

  // ── Runtime test runner ────────────────────────────────────
  // Creates a lead + campaign + contact assignment + queues SMS job
  // Proves full execution pipeline without requiring browser login
  runTest: publicProcedure
    .input(z.object({
      secret: z.string(), // basic protection against random calls
    }))
    .mutation(async ({ input }) => {
      if (input.secret !== 'apexai-runtime-test-2026') {
        return { success: false, error: 'Invalid secret' };
      }

      const timestamp = new Date().toISOString();
      const results: Record<string, unknown> = { timestamp };

      try {
        // Step 1: Create test lead
        console.log('[TestRunner] Step 1: Creating test lead...');
        const leadResult = await db.createLead({
          firstName: 'Test',
          lastName: `Runner-${Date.now()}`,
          email: `test-${Date.now()}@apexai-test.com`,
          phone: '+15551234567',
          company: 'ApexAI Test Corp',
          source: 'test_runner',
          score: 80,
          segment: 'hot',
          status: 'new',
          verificationStatus: 'verified',
        });
        const leadId = leadResult.insertId;
        results.lead = { insertId: leadId, status: 'created' };
        console.log(`[TestRunner] ✅ Lead created → insertId: ${leadId}`);

        // Step 2: Create test campaign
        console.log('[TestRunner] Step 2: Creating test campaign...');
        const campaignResult = await db.createCampaign({
          name: `Test Campaign ${Date.now()}`,
          description: 'Automated runtime test',
          channels: 'sms',
          status: 'active',
        });
        const campaignId = campaignResult.insertId;
        results.campaign = { insertId: campaignId, status: 'created' };
        console.log(`[TestRunner] ✅ Campaign created → insertId: ${campaignId}`);

        // Step 3: Assign lead to campaign
        console.log('[TestRunner] Step 3: Assigning lead to campaign...');
        await db.addContactToCampaign(campaignId, leadId);
        results.contact = { leadId, campaignId, status: 'assigned' };
        console.log(`[TestRunner] ✅ Lead ${leadId} assigned to campaign ${campaignId}`);

        // Step 4: Create message record
        console.log('[TestRunner] Step 4: Creating message record...');
        const msgResult = await db.createMessage({
          leadId,
          campaignId,
          channel: 'sms' as const,
          body: `Hi Test Runner, this is a runtime test message from ApexAI. Timestamp: ${timestamp}`,
          status: 'queued',
        });
        const msgId = msgResult.insertId;
        results.message = { insertId: msgId, status: 'queued' };
        console.log(`[TestRunner] ✅ Message created → insertId: ${msgId} | status: queued`);

        // Step 5: Queue SMS job
        console.log('[TestRunner] Step 5: Queueing SMS job...');
        const smsJob = await queueService.addSmsJob({
          leadId,
          phone: '+15551234567',
          type: 'follow_up',
          leadName: 'Test Runner',
        });
        results.job = { jobId: smsJob.jobId, status: smsJob.status };
        console.log(`[TestRunner] ✅ SMS job queued → jobId: ${smsJob.jobId} | status: ${smsJob.status}`);

        // Step 6: Run decision engine on the lead
        console.log('[TestRunner] Step 6: Running decision engine...');
        const lead = await db.getLeadById(leadId);
        const decision = await decisionEngine.decideLeadAction(lead!);
        results.decision = decision;
        console.log(`[TestRunner] ✅ Decision: ${decision.action} | reason: ${decision.reason}`);

        // Step 7: Log activity
        await db.logActivity({
          entityType: 'test',
          entityId: leadId,
          action: 'runtime_test_completed',
          description: `Runtime test completed. Lead: ${leadId}, Campaign: ${campaignId}, Message: ${msgId}, Job: ${smsJob.jobId}`,
        });

        console.log(`[TestRunner] ✅ ALL STEPS COMPLETE | lead:${leadId} campaign:${campaignId} msg:${msgId} job:${smsJob.jobId}`);

        return {
          success: true,
          results,
          summary: {
            leadId,
            campaignId,
            messageId: msgId,
            jobId: smsJob.jobId,
            jobStatus: smsJob.status,
            decision: decision.action,
          },
        };

      } catch (error) {
        const msg = (error as Error).message;
        console.error(`[TestRunner] ❌ FAILED: ${msg}`);
        return { success: false, error: msg, results };
      }
    }),
});

export default webhooksRouter;
