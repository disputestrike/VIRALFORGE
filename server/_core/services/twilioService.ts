/**
 * TWILIO SERVICE — Real Outbound Calling + SMS
 * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */

import { ENV } from "../env";

function getTwilioClient() {
  if (!ENV.twilioAccountSid || !ENV.twilioAuthToken) {
    throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required. Add them to Railway Variables.");
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const twilio = require("twilio");
  return twilio(ENV.twilioAccountSid, ENV.twilioAuthToken);
}

export async function initiateCall(data: {
  leadId: number;
  phoneNumber: string;
  campaignId?: number;
  sessionId?: string;
}): Promise<{ callSid: string; status: string }> {
  const client = getTwilioClient();
  if (!ENV.twilioPhoneNumber) throw new Error("TWILIO_PHONE_NUMBER is required");

  const sessionId = data.sessionId || `session_${Date.now()}`;

  const call = await client.calls.create({
    to: data.phoneNumber,
    from: ENV.twilioPhoneNumber,
    url: `${ENV.publicUrl}/api/voice/start?leadId=${data.leadId}&sessionId=${sessionId}&campaignId=${data.campaignId || ""}`,
    statusCallback: `${ENV.publicUrl}/api/voice/status`,
    statusCallbackMethod: "POST",
    record: true,
    recordingStatusCallback: `${ENV.publicUrl}/api/voice/recording`,
  });

  console.log(`[Twilio] Call initiated: ${call.sid} → ${data.phoneNumber}`);
  return { callSid: call.sid, status: call.status };
}

export async function sendSMS(data: {
  to: string;
  body: string;
}): Promise<{ messageSid: string; status: string }> {
  const client = getTwilioClient();
  if (!ENV.twilioPhoneNumber) throw new Error("TWILIO_PHONE_NUMBER is required");

  const message = await client.messages.create({
    body: data.body,
    from: ENV.twilioPhoneNumber,
    to: data.to,
  });

  console.log(`[Twilio] SMS sent: ${message.sid} → ${data.to}`);
  return { messageSid: message.sid, status: message.status };
}

export async function handleCallStatus(callSid: string, status: string) {
  console.log(`[Twilio] Call ${callSid} status: ${status}`);
  return { updated: true };
}

export async function validateWebhookSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): Promise<boolean> {
  try {
    if (!ENV.twilioAuthToken) return false;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const twilio = require("twilio");
    return twilio.validateRequest(ENV.twilioAuthToken, signature, url, params);
  } catch {
    return false;
  }
}

export default { initiateCall, sendSMS, handleCallStatus, validateWebhookSignature };
