/**
 * INBOUND SERVICE - FIXED
 */

export async function handleInboundCall(phoneNumber: string) {
  console.log(`[Inbound] Handling call from ${phoneNumber}`);
  return {
    menu: 'main',
    message: 'Hello! Press 1 for sales, 2 for support',
  };
}

export async function handleDTMF(digit: string, sessionId: string) {
  console.log(`[Inbound] DTMF: ${digit} for session ${sessionId}`);
  
  switch (digit) {
    case '1':
      return { action: 'transfer_to_ai', queue: 'sales' };
    case '2':
      return { action: 'transfer_to_queue', queue: 'support' };
    case '3':
      return { action: 'record_voicemail' };
    default:
      return { action: 'invalid_input' };
  }
}

export async function handleVoicemail(phoneNumber: string, audioUrl: string) {
  console.log(`[Inbound] Voicemail from ${phoneNumber}: ${audioUrl}`);
  return { status: 'recorded' };
}

export default {
  handleInboundCall,
  handleDTMF,
  handleVoicemail,
};
