/**
 * SIGNALWIRE SERVICE — Voice Calls + SMS
 * Replaces Twilio. Uses SignalWire REST API (Twilio-compatible).
 *
 * Credentials (set in Railway Variables):
 *   SIGNALWIRE_PROJECT_ID  = 1f2c4e53-292d-4389-ba0c-5ff2fa07fb5e
 *   SIGNALWIRE_TOKEN       = PT4238c7e4...
 *   SIGNALWIRE_SPACE_URL   = apexai1.signalwire.com
 *   SIGNALWIRE_PHONE_NUMBER = +18336596005
 *   SIGNALWIRE_SIGNING_KEY = PSK_z6bSZsDasA1oENvdsNZ16bGu
 *
 * Cost: ~$0.003/min (vs Twilio $0.014/min — 4x cheaper)
 * thinQ LCR: add THINQ_ACCOUNT_ID + THINQ_AUTH_TOKEN later for $0.001-0.002/min
 */

import { ENV } from "../env";

// ── SignalWire client (Twilio-compatible REST API) ─────────────────────────
function getSignalWireClient() {
  if (!ENV.signalwireProjectId || !ENV.signalwireToken) {
    throw new Error(
      "SIGNALWIRE_PROJECT_ID and SIGNALWIRE_TOKEN are required. Add them to Railway Variables."
    );
  }
  const { RestClient } = require("@signalwire/compatibility-api");
  return new RestClient(ENV.signalwireProjectId, ENV.signalwireToken, {
    signalwireSpaceUrl: ENV.signalwireSpaceUrl,
  });
}

// ── Local presence: get best caller number for destination area code ───────
export async function getOptimalCallerNumber(destinationPhone: string): Promise<string> {
  const defaultNumber = ENV.signalwirePhoneNumber;
  if (!destinationPhone || !defaultNumber) return defaultNumber;

  try {
    // Extract area code from destination: +14155551234 → "415"
    const clean = destinationPhone.replace(/^\+1/, "");
    const areaCode = clean.substring(0, 3);

    // Look up matching number in local_number_pool table
    const db = await import("../../db");
    const result = await (db as any).getLocalNumberByAreaCode(areaCode);

    if (result?.phoneNumber) {
      console.log(`[SignalWire] Local presence: ${areaCode} → ${result.phoneNumber}`);
      await (db as any).updateLocalNumberLastUsed(result.phoneNumber);
      return result.phoneNumber;
    }
  } catch (err) {
    console.warn("[SignalWire] Local number lookup failed, using default:", err);
  }

  return defaultNumber;
}

// ── Outbound call ──────────────────────────────────────────────────────────
export async function initiateCall(data: {
  leadId: number;
  phoneNumber: string;
  campaignId?: number;
  sessionId?: string;
}): Promise<{ callSid: string; status: string }> {
  const client = getSignalWireClient();
  if (!ENV.signalwirePhoneNumber) throw new Error("SIGNALWIRE_PHONE_NUMBER is required");

  const sessionId = data.sessionId || `session_${Date.now()}`;
  const callerNumber = await getOptimalCallerNumber(data.phoneNumber);

  // Build webhook URL — same routes as before, no changes needed
  const baseUrl = ENV.publicUrl;

  const call = await client.calls.create({
    to: data.phoneNumber,
    from: callerNumber,
    url: `${baseUrl}/api/voice/start?leadId=${data.leadId}&sessionId=${sessionId}&campaignId=${data.campaignId || ""}`,
    statusCallback: `${baseUrl}/api/voice/status`,
    statusCallbackMethod: "POST",
    record: true,
    recordingStatusCallback: `${baseUrl}/api/voice/recording`,
  });

  console.log(`[SignalWire] Call initiated: ${call.sid} → ${data.phoneNumber} from ${callerNumber}`);
  return { callSid: call.sid, status: call.status };
}

// ── Outbound SMS ───────────────────────────────────────────────────────────
export async function sendSMS(data: {
  to: string;
  body: string;
}): Promise<{ messageSid: string; status: string }> {
  const client = getSignalWireClient();
  if (!ENV.signalwirePhoneNumber) throw new Error("SIGNALWIRE_PHONE_NUMBER is required");

  const fromNumber = await getOptimalCallerNumber(data.to);

  const message = await client.messages.create({
    body: data.body,
    from: fromNumber,
    to: data.to,
  });

  console.log(`[SignalWire] SMS sent: ${message.sid} → ${data.to}`);
  return { messageSid: message.sid, status: message.status };
}

// ── Webhook signature validation ──────────────────────────────────────────
export async function validateWebhookSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): Promise<boolean> {
  try {
    if (!ENV.signalwireToken) return false;
    // SignalWire uses same signature validation as Twilio
    const { RestClient } = require("@signalwire/compatibility-api");
    return RestClient.validateRequest(ENV.signalwireToken, signature, url, params);
  } catch {
    return false;
  }
}

// ── Call status handler ────────────────────────────────────────────────────
export async function handleCallStatus(callSid: string, status: string) {
  console.log(`[SignalWire] Call ${callSid} status: ${status}`);
  return { updated: true };
}

export default {
  initiateCall,
  sendSMS,
  handleCallStatus,
  validateWebhookSignature,
  getOptimalCallerNumber,
};

// ─── Answering Machine Detection (Voicemail) ─────────────────────────────────
export async function initiateCallWithAMD(data: {
  leadId: number;
  phoneNumber: string;
  campaignId?: number;
  voicemailMessage?: string; // if set, leaves VM instead of hanging up
}): Promise<{ callSid: string; status: string }> {
  const client = getSignalWireClient();
  if (!ENV.signalwirePhoneNumber) throw new Error("SIGNALWIRE_PHONE_NUMBER required");

  const baseUrl = ENV.publicUrl;
  const sessionId = `session_${Date.now()}`;
  const callerNumber = await getOptimalCallerNumber(data.phoneNumber);

  const call = await client.calls.create({
    to: data.phoneNumber,
    from: callerNumber,
    url: `${baseUrl}/api/voice/start?leadId=${data.leadId}&sessionId=${sessionId}&campaignId=${data.campaignId || ""}`,
    statusCallback: `${baseUrl}/api/voice/status`,
    statusCallbackMethod: "POST",
    machineDetection: "DetectMessageEnd", // AMD enabled
    machineDetectionTimeout: 8,
    asyncAmd: true,
    asyncAmdStatusCallback: `${baseUrl}/api/voice/amd-status`,
    asyncAmdStatusCallbackMethod: "POST",
    record: true,
    recordingStatusCallback: `${baseUrl}/api/voice/recording`,
  });

  console.log(`[SignalWire AMD] Call initiated: ${call.sid} → ${data.phoneNumber}`);
  return { callSid: call.sid, status: call.status };
}

// ─── Live Transfer to Human ───────────────────────────────────────────────────
export async function transferCallToHuman(callSid: string, transferTo: string): Promise<void> {
  const client = getSignalWireClient();
  const baseUrl = ENV.publicUrl;

  // Update call with new TwiML that dials the human
  await client.calls(callSid).update({
    twiml: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Please hold while I transfer you to one of our specialists.</Say>
  <Dial callerId="${ENV.signalwirePhoneNumber}" timeout="30">
    <Number>${transferTo}</Number>
  </Dial>
  <Say>I'm sorry, our team is unavailable right now. Please call back during business hours.</Say>
</Response>`,
  });

  console.log(`[SignalWire] Live transfer: ${callSid} → ${transferTo}`);
}
