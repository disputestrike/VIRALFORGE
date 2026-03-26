/**
 * VOICEMAIL SERVICE — DB-backed voicemail storage
 */

import * as db from "../../db";

export async function storeVoicemail(data: {
  leadId: number;
  audioUrl: string;
  transcript?: string;
  duration: number;
}): Promise<{ voicemailId: string }> {
  // Store as a call recording with voicemail outcome
  const result = await db.createCallRecording({
    leadId: data.leadId,
    status: "completed",
    outcome: "voicemail",
    recordingUrl: data.audioUrl,
    transcript: data.transcript ?? null,
    duration: data.duration,
    calledAt: new Date(),
    scheduledAppointment: false,
  });

  const voicemailId = `vm_${result.insertId}`;
  console.log(`[Voicemail] Stored | leadId: ${data.leadId} | id: ${voicemailId} | duration: ${data.duration}s`);

  // Update lead status
  await db.updateLead(data.leadId, { status: "contacted" });
  await db.logActivity({
    entityType: "voicemail",
    entityId: data.leadId,
    action: "received",
    description: `Voicemail received from lead ${data.leadId}. Duration: ${data.duration}s`,
  });

  return { voicemailId };
}

export async function extractVoicemailAction(transcript: string): Promise<{ action: string }> {
  const lower = transcript.toLowerCase();
  if (lower.includes("call back") || lower.includes("call me")) return { action: "callback_requested" };
  if (lower.includes("not interested") || lower.includes("remove")) return { action: "opt_out" };
  if (lower.includes("appointment") || lower.includes("schedule")) return { action: "appointment_requested" };
  return { action: "follow_up" };
}

export async function getPendingVoicemails(): Promise<unknown[]> {
  return db.getCallRecordings({ limit: 20 }).then(r => r.filter((c: any) => c.outcome === "voicemail"));
}

export default { storeVoicemail, extractVoicemailAction, getPendingVoicemails };
