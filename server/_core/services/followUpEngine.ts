/**
 * FOLLOW UP ENGINE — Real multi-channel follow-up sequencing
 * Queues SMS/email/call jobs via BullMQ
 */

import * as queueService from "./queue";
import * as db from "../../db";

export interface FollowUpStep {
  action: "sms" | "email" | "call";
  delayMs: number;
  templateType: "follow_up" | "appointment_reminder" | "appointment_confirmation";
}

const DEFAULT_SEQUENCE: FollowUpStep[] = [
  { action: "sms",   delayMs: 0,           templateType: "follow_up" },
  { action: "email", delayMs: 3_600_000,   templateType: "follow_up" },       // 1 hour
  { action: "sms",   delayMs: 86_400_000,  templateType: "follow_up" },       // 1 day
  { action: "call",  delayMs: 172_800_000, templateType: "follow_up" },       // 2 days
];

export async function scheduleFollowUp(
  leadId: number,
  action: string,
  delayMs: number
): Promise<{ scheduled: boolean; jobId?: string }> {
  const lead = await db.getLeadById(leadId);
  if (!lead) return { scheduled: false };

  if (action === "sms" && lead.phone) {
    const job = await queueService.addSmsJob({
      leadId,
      phone: lead.phone,
      type: "follow_up",
      leadName: `${lead.firstName} ${lead.lastName}`,
      delay: delayMs,
    });
    console.log(`[FollowUp] SMS scheduled | leadId: ${leadId} | jobId: ${job.jobId} | delay: ${delayMs}ms`);
    return { scheduled: true, jobId: job.jobId };
  }

  if (action === "email" && lead.email) {
    const job = await queueService.addEmailJob({
      leadId,
      email: lead.email,
      type: "follow_up",
      leadName: `${lead.firstName} ${lead.lastName}`,
      delay: delayMs,
    });
    console.log(`[FollowUp] Email scheduled | leadId: ${leadId} | jobId: ${job.jobId} | delay: ${delayMs}ms`);
    return { scheduled: true, jobId: job.jobId };
  }

  if (action === "call") {
    const job = await queueService.addCallJob({ leadId, delay: delayMs } as any);
    console.log(`[FollowUp] Call scheduled | leadId: ${leadId} | jobId: ${job.jobId} | delay: ${delayMs}ms`);
    return { scheduled: true, jobId: job.jobId };
  }

  return { scheduled: false };
}

export function getFollowUpSequence(_leadId: number): FollowUpStep[] {
  return DEFAULT_SEQUENCE;
}

export async function executeFollowUpSequence(leadId: number): Promise<{ queued: number }> {
  const sequence = getFollowUpSequence(leadId);
  let queued = 0;
  for (const step of sequence) {
    const result = await scheduleFollowUp(leadId, step.action, step.delayMs);
    if (result.scheduled) queued++;
  }
  console.log(`[FollowUp] Sequence queued for lead ${leadId}: ${queued} jobs`);
  return { queued };
}

export async function executeFollowUp(leadId: number): Promise<{ executed: boolean }> {
  await scheduleFollowUp(leadId, "sms", 0);
  return { executed: true };
}

export default {
  scheduleFollowUp,
  getFollowUpSequence,
  executeFollowUpSequence,
  executeFollowUp,
};
