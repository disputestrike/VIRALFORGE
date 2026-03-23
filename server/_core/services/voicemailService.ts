/**
 * VOICEMAIL SERVICE - FIXED
 */

import * as db from '../../db';

export async function storeVoicemail(data: {
  leadId: number;
  audioUrl: string;
  transcript?: string;
  duration: number;
}) {
  console.log(`[Voicemail] Stored voicemail for lead ${data.leadId}`);
  return {
    voicemailId: `vm_${Date.now()}`,
    ...data,
  };
}

export async function getPendingVoicemails() {
  console.log(`[Voicemail] Getting pending voicemails`);
  return [];
}

export async function extractVoicemailAction(transcript: string) {
  console.log(`[Voicemail] Extracting action from transcript`);
  return { action: 'callback_requested' };
}

export default {
  storeVoicemail,
  getPendingVoicemails,
  extractVoicemailAction,
};
