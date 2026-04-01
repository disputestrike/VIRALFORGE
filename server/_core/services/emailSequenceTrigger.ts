/**
 * Fires `email_sequences` rows when a lead is created (e.g. triggerEvent `lead.created`).
 * Queues Resend sends via existing BullMQ email worker.
 */
import * as db from "../../db";
import * as queueService from "./queue";

const LEAD_CREATED = "lead.created";

/** Exported for unit tests — replaces `{{field}}` placeholders. */
export function applyEmailSequenceTemplate(template: string, vars: Record<string, string>): string {
  let s = template;
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(`{{${k}}}`).join(v);
  }
  return s;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type LeadCreatedEmailPayload = {
  id: number;
  firstName: string;
  lastName: string;
  email?: string | null;
  company?: string | null;
  phone?: string | null;
};

export async function runEmailSequencesForLeadCreated(
  tenantUserId: number,
  lead: LeadCreatedEmailPayload
): Promise<void> {
  const email = lead.email?.trim();
  if (!email) return;

  const rows = await db.listActiveEmailSequencesByTrigger(tenantUserId, LEAD_CREATED);
  if (!rows.length) return;

  const vars: Record<string, string> = {
    firstName: lead.firstName ?? "",
    lastName: lead.lastName ?? "",
    company: lead.company ?? "",
    email,
    phone: lead.phone ?? "",
  };

  for (const seq of rows) {
    const bodyRaw = applyEmailSequenceTemplate(seq.bodyTemplate, vars);
    const bodyHtml = `<div style="font-family:system-ui,sans-serif;line-height:1.5">${escapeHtml(bodyRaw).replace(/\n/g, "<br/>")}</div>`;
    const subject = escapeHtml(seq.name).slice(0, 200);

    await queueService.addEmailJob({
      leadId: lead.id,
      email,
      type: "sequence",
      leadName: `${lead.firstName} ${lead.lastName}`.trim() || "there",
      customSubject: subject,
      customHtml: bodyHtml,
    });
  }
}
