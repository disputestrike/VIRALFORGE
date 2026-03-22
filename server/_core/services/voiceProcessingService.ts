/**
 * Voice Processing Service
 * 
 * Orchestrates the complete conversation flow:
 * Audio → Whisper (STT) → Claude (LLM) → ElevenLabs (TTS) → Audio
 * 
 * Also handles appointment detection and booking
 */

import { transcribeAudio } from "./sttService";
import { synthesizeSpeech, VOICES } from "./ttsService";
import { 
  generateConversationResponse, 
  proposeAppointmentTimes,
  confirmAndBookAppointment 
} from "./conversationEngine";
import * as voiceSessionManager from "./voiceSessionManager";

export async function processAudioMessage(
  callId: string,
  audioBuffer: Buffer,
  context: any
): Promise<Buffer> {
  try {
    console.log(`[VoiceProcessing] Starting audio processing for ${callId}`);

    // Step 1: Transcribe audio to text (WHISPER)
    console.log(`[VoiceProcessing] Step 1: Transcribing audio...`);
    let userText: string;
    try {
      userText = await transcribeAudio(audioBuffer);
    } catch (error) {
      console.error("[VoiceProcessing] Transcription failed:", error);
      userText = "[Unable to transcribe audio]";
    }

    console.log(`[VoiceProcessing] Transcribed: "${userText}"`);

    // Step 2: Add user message to session
    const session = voiceSessionManager.getSession(callId);
    if (session) {
      voiceSessionManager.addMessage(callId, {
        role: "user",
        content: userText,
      });
    }

    // Step 3: Check if this is appointment confirmation
    let aiResponseText = "";
    let appointmentBooked = false;

    if ((session as any)?.proposedSlots && (session as any).proposedSlots.length > 0) {
      // User may be confirming appointment
      const proposedSlots = (session as any).proposedSlots;
      
      // Simple heuristic: if they said yes/confirmed/works
      const confirmationIndicators = [
        'yes', 'yep', 'yeah', 'perfect', 'works', 'good', 'great',
        'sounds', 'confirms', 'tuesday', 'wednesday', 'thursday', 'friday',
        'monday', 'morning', 'afternoon', '1', '2', '3', 'first', 'second', 'third'
      ];
      
      const isConfirming = confirmationIndicators.some(word => 
        userText.toLowerCase().includes(word)
      );

      if (isConfirming) {
        // Extract which slot they want (default to first)
        const numberMatch = userText.match(/(\d)/);
        const slotIndex = numberMatch ? parseInt(numberMatch[1]) - 1 : 0;
        const selectedSlot = proposedSlots[slotIndex] || proposedSlots[0];

        // Book the appointment
        if (selectedSlot) {
          const bookResult = await confirmAndBookAppointment(
            callId,
            context.leadId || 0,
            selectedSlot,
            context.campaignId
          );

          if (bookResult.success) {
            aiResponseText = bookResult.message;
            appointmentBooked = true;
            console.log(`[VoiceProcessing] Appointment booked: ${bookResult.appointmentId}`);
          } else {
            aiResponseText = bookResult.message;
          }
        }
      }
    }

    // Step 4: Generate AI response if appointment not booked
    let aiResponse;
    if (!appointmentBooked) {
      console.log(`[VoiceProcessing] Step 2: Generating AI response...`);
      aiResponse = await generateConversationResponse(userText, {
        ...context,
        conversationHistory: session?.conversationHistory || [],
      });
      aiResponseText = aiResponse.text;

      // Step 4b: Check if AI wants to propose appointments
      if (aiResponse.suggestedNextAction === "book_appointment" && !appointmentBooked) {
        console.log(`[VoiceProcessing] AI wants to propose appointments`);
        const appointmentProposal = await proposeAppointmentTimes(
          callId,
          context.leadId || 0,
          context.campaignId
        );
        
        if (appointmentProposal.slots.length > 0) {
          aiResponseText = appointmentProposal.message;
          console.log(`[VoiceProcessing] Proposed ${appointmentProposal.slots.length} slots`);
        }
      }
    }

    console.log(`[VoiceProcessing] Generated: "${aiResponseText}"`);

    // Step 5: Add AI response to session
    if (session) {
      voiceSessionManager.addMessage(callId, {
        role: "assistant",
        content: aiResponseText,
      });

      // Update qualification if needed
      if (!appointmentBooked && aiResponse?.qualificationUpdate) {
        voiceSessionManager.updateLeadQualification(
          callId,
          aiResponse.qualificationUpdate
        );
      }

      // Update sentiment
      const sentiment = detectSentiment(userText);
      voiceSessionManager.updateSentiment(callId, sentiment);
    }

    // Step 6: Synthesize response to speech (ELEVENLABS)
    console.log(`[VoiceProcessing] Step 3: Synthesizing speech...`);
    let audioResponse: Buffer;
    try {
      audioResponse = await synthesizeSpeech(aiResponseText, VOICES.bella);
    } catch (error) {
      console.error("[VoiceProcessing] Synthesis failed:", error);
      audioResponse = Buffer.alloc(0);
    }

    console.log(
      `[VoiceProcessing] Synthesized: ${audioResponse.length} bytes`
    );

    // Step 7: Log the turn
    console.log(`[VoiceProcessing] Complete conversation turn`);
    console.log(`  User said: "${userText}"`);
    console.log(`  AI said: "${aiResponseText}"`);
    if (!appointmentBooked && aiResponse) {
      console.log(`  Intent: ${aiResponse.intent}`);
    }

    return audioResponse;
  } catch (error) {
    console.error("[VoiceProcessing] Fatal error:", error);
    return Buffer.alloc(0);
  }
}

/**
 * Detect sentiment from user input
 */
function detectSentiment(
  text: string
): "positive" | "neutral" | "negative" {
  const positive =
    /great|excellent|perfect|love|amazing|awesome|interested|yes|definitely|sounds good|works/i;
  const negative =
    /terrible|hate|awful|bad|problem|no thanks|not interested|pass|decline|can't/i;

  if (negative.test(text)) return "negative";
  if (positive.test(text)) return "positive";
  return "neutral";
}

/**
 * Check if user is likely to interrupt (high volume)
 */
export function detectUserInterruption(audioBuffer: Buffer): boolean {
  const view = new Uint8Array(audioBuffer);
  let sum = 0;

  for (let i = 0; i < view.length; i += 2) {
    const sample = (view[i] | (view[i + 1] << 8)) - 32768;
    sum += sample * sample;
  }

  const rms = Math.sqrt(sum / (view.length / 2));
  const threshold = 8000;

  return rms > threshold;
}

/**
 * Format conversation for logging
 */
export function formatConversationLog(
  callId: string,
  sessionData: any
): string {
  if (!sessionData) return "";

  return `
Call ID: ${callId}
Duration: ${Math.round(sessionData.duration / 1000)} seconds
Turns: ${sessionData.turnCount} (AI: ${sessionData.aiTurns}, User: ${sessionData.userTurns})
Lead Qualified: ${sessionData.leadQualified ? "Yes" : "No"}
Appointment Confirmed: ${sessionData.appointmentConfirmed ? "Yes" : "No"}
Sentiment: ${sessionData.sentiment}
  `;
}

export default {
  processAudioMessage,
  detectUserInterruption,
  detectSentiment,
  formatConversationLog,
};
