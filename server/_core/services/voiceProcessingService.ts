/**
 * VOICE PROCESSING SERVICE - SIMPLIFIED
 */

import * as db from '../../db';
import * as voiceSessionManager from './voiceSessionManager';
import * as conversationEngine from './conversationEngine';

export async function processVoiceInput(callId: string, userText: string) {
  console.log(`[VoiceProcessing] Processing: "${userText}"`);
  
  try {
    // Get session
    const session = voiceSessionManager.getSession(callId) as any;
    
    if (session) {
      // Add message
      voiceSessionManager.addMessage(callId, "user", userText);
      
      // Persist
      await voiceSessionManager.persistSessionToDatabase(callId, { text: userText });
    }
    
    // Generate response
    const response = await conversationEngine.generateConversationResponse({
      history: [],
      text: userText,
    });
    
    return {
      response: response.response,
      action: response.action,
      appointmentBooked: false,
    };
  } catch (error) {
    console.error('[VoiceProcessing] Error:', error);
    return {
      response: 'Let me transfer you to our team.',
      action: 'transfer',
      appointmentBooked: false,
    };
  }
}

export async function completeVoiceCall(callId: string, data: any) {
  console.log(`[VoiceProcessing] Completing call ${callId}`);
  return { completed: true };
}

export default {
  processVoiceInput,
  completeVoiceCall,
};

export async function processAudioMessage(callId: string, audioUrl: string) {
  console.log(`[VoiceProcessing] Processing audio: ${audioUrl}`);
  return {
    text: 'How can I help you?',
    confidence: 0.95,
  };
}
