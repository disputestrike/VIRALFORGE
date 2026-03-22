/**
 * Inbound Call Service
 * 
 * Handles incoming calls, IVR menu, DTMF routing
 * Routes callers to AI, human queue, or voicemail
 */

import * as db from '../../db';;
import * as queueService from "./queue";

export interface IVRRoute {
  selection: number;
  option: "sales" | "support" | "voicemail" | "billing";
  prompt: string;
  queueName?: string;
}

const DEFAULT_IVR_ROUTES: IVRRoute[] = [
  {
    selection: 1,
    option: "sales",
    prompt: "Sales and new business inquiries",
    queueName: "sales",
  },
  {
    selection: 2,
    option: "support",
    prompt: "Technical support",
    queueName: "support",
  },
  {
    selection: 3,
    option: "billing",
    prompt: "Billing and account inquiries",
    queueName: "billing",
  },
];

/**
 * Generate IVR menu prompt
 */
export function generateIVRMenu(): string {
  const options = DEFAULT_IVR_ROUTES.map(
    (route) => `${route.selection} for ${route.prompt}`
  ).join(", or ");

  return `Thank you for calling. ${options}. Press any key.`;
}

/**
 * Handle IVR selection and route call
 */
export async function handleIVRSelection(
  callSid: string,
  selection: number,
  fromNumber: string
): Promise<{
  action: "transfer_to_ai" | "transfer_to_queue" | "voicemail";
  context?: any;
}> {
  console.log(`[Inbound] IVR selection ${selection} from ${fromNumber}`);

  const route = DEFAULT_IVR_ROUTES.find((r) => r.selection === selection);

  if (!route) {
    return { action: "voicemail" };
  }

  if (route.option === "sales") {
    // Create or find inbound lead
    const lead = await createOrUpdateInboundLead(fromNumber, "sales_inquiry");

    console.log(`[Inbound] Routing to AI: Lead ${lead.id}`);

    return {
      action: "transfer_to_ai",
      context: {
        leadId: lead.id,
        leadName: lead.firstName,
        callType: "inbound_sales",
        routedFrom: "ivr_selection_1",
      },
    };
  }

  if (route.option === "support" || route.option === "billing") {
    // Route to human agent queue
    const lead = await createOrUpdateInboundLead(fromNumber, route.option);

    console.log(
      `[Inbound] Routing to queue: ${route.queueName} for lead ${lead.id}`
    );

    return {
      action: "transfer_to_queue",
      context: {
        leadId: lead.id,
        queueName: route.queueName,
        fromNumber,
      },
    };
  }

  // Default: voicemail
  return { action: "voicemail" };
}

/**
 * Create or update inbound lead
 */
async function createOrUpdateInboundLead(
  phoneNumber: string,
  inquiryType: string
): Promise<any> {
  // Check if lead exists
  let lead = await db.getLead({ phone: phoneNumber } as any);

  if (!lead) {
    // Create new inbound lead
    lead = await db.createLead({
      firstName: "Inbound",
      lastName: phoneNumber.slice(-4),
      phone: phoneNumber,
      source: "inbound_call",
      status: "new",
      score: 60, // Inbound = higher priority
      segment: "warm", // Inbound calls are warm leads
      tags: JSON.stringify(["inbound", inquiryType]),
    });

    console.log(`[Inbound] Created new lead: ${lead.id} from ${phoneNumber}`);
  } else {
    // Update last contact time
    await db.updateLead(lead.id, {
      lastContactedAt: new Date(),
    });
  }

  return lead;
}

/**
 * Record inbound call
 */
export async function recordInboundCall(
  callSid: string,
  fromNumber: string,
  toNumber: string,
  duration: number,
  disposition: "answered" | "voicemail" | "abandoned",
  transcription?: string,
  dtmfSelection?: number
): Promise<void> {
  console.log(`[Inbound] Recording call: ${callSid} from ${fromNumber}`);

  const lead = await createOrUpdateInboundLead(fromNumber, "general");

  // Store in database
  try {
    await db.query(
      `INSERT INTO inbound_calls 
        (callSid, inboundNumber, fromNumber, toNumber, duration, disposition, transcription, dtmfSelection, leadId) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        callSid,
        toNumber,
        fromNumber,
        toNumber,
        duration,
        disposition,
        transcription,
        dtmfSelection,
        lead.id,
      ]
    );
  } catch (error) {
    console.error("[Inbound] Error recording call:", error);
  }

  // If abandoned/voicemail, schedule callback
  if (disposition === "abandoned" || disposition === "voicemail") {
    console.log(`[Inbound] Scheduling callback for ${lead.id}`);

    await queueService.addRetryCallJob({
      leadId: lead.id,
      callType: "inbound_callback",
      originalCallSid: callSid,
      transcription,
    });
  }
}

/**
 * Handle voicemail transcription callback
 */
export async function handleVoicemailTranscription(
  callSid: string,
  transcription: string,
  recordingUrl: string
): Promise<void> {
  console.log(`[Inbound] Voicemail transcribed: ${transcription.substring(0, 50)}...`);

  // Find the call
  const [call] = await db.query(
    "SELECT leadId FROM inbound_calls WHERE callSid = ?",
    [callSid]
  );

  if (!call) return;

  // Update with transcription
  await db.query("UPDATE inbound_calls SET transcription = ?, recordingUrl = ? WHERE callSid = ?", [
    transcription,
    recordingUrl,
    callSid,
  ]);

  // Notify admin (in production, send email)
  console.log(
    `[Inbound] Voicemail from lead ${call.leadId}: ${transcription}`
  );

  // Queue callback
  await queueService.addRetryCallJob({
    leadId: call.leadId,
    callType: "voicemail_callback",
    voicemailTranscription: transcription,
  });
}

export default {
  generateIVRMenu,
  handleIVRSelection,
  recordInboundCall,
  handleVoicemailTranscription,
};
