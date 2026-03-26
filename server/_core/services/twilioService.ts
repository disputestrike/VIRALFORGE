/**
 * TWILIO SERVICE — Real Outbound Calling + SMS
 * Requires: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required");
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const twilio = require("twilio");
  return twilio(accountSid, authToken);
}

export async function initiateCall(data: {
  leadId: number;
  phoneNumber: string;
  campaignId?: number;
  sessionId?: string;
}): Promise<{ callSid: string; status: string }> {
  const client = getTwilioClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) throw new Error("TWILIO_PHONE_NUMBER is required");

  const baseUrl = process.env.PUBLIC_URL || process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : "https://apexai-production-d567.up.railway.app";

  const sessionId = data.sessionId || `session_${Date.now()}`;

  const call = await client.calls.create({
    to: data.phoneNumber,
    from: fromNumber,
    url: `${baseUrl}/api/voice/start?leadId=${data.leadId}&sessionId=${sessionId}&campaignId=${data.campaignId || ""}`,
    statusCallback: `${baseUrl}/api/voice/status`,
    statusCallbackMethod: "POST",
    record: true,
    recordingStatusCallback: `${baseUrl}/api/voice/recording`,
  });

  console.log(`[Twilio] Call initiated: ${call.sid} → ${data.phoneNumber}`);
  return { callSid: call.sid, status: call.status };
}

export async function sendSMS(data: {
  to: string;
  body: string;
}): Promise<{ messageSid: string; status: string }> {
  const client = getTwilioClient();
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!fromNumber) throw new Error("TWILIO_PHONE_NUMBER is required");

  const message = await client.messages.create({
    body: data.body,
    from: fromNumber,
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
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) return false;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const twilio = require("twilio");
    return twilio.validateRequest(authToken, signature, url, params);
  } catch {
    return false;
  }
}

export default { initiateCall, sendSMS, handleCallStatus, validateWebhookSignature };
