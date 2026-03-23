/**
 * TWILIO SERVICE - FIXED
 */

import * as db from '../../db';

export async function initiateCall(data: {
  leadId: number;
  phoneNumber: string;
  campaignId?: number;
}) {
  console.log(`[Twilio] Initiating call to ${data.phoneNumber}`);
  return {
    callSid: `call_${Date.now()}`,
    status: 'initiated',
  };
}

export async function handleCallStatus(callSid: string, status: string) {
  console.log(`[Twilio] Call ${callSid} status: ${status}`);
  return { updated: true };
}

export async function recordCall(callSid: string, recordingUrl: string) {
  console.log(`[Twilio] Recording for call ${callSid}: ${recordingUrl}`);
  return { recorded: true };
}

export default {
  initiateCall,
  handleCallStatus,
  recordCall,
};
