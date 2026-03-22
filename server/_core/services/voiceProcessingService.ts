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
import * as appointmentConfirmationDetector from "./appointmentConfirmationDetector";
import * as adminNotifications from "./adminNotificationService";
import { startSessionPersistenceInterval, persistSessionToDatabase } from "./voiceSessionManager";

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
      // FIX 6: Fallback if Whisper fails
      const fallbackMessage = "I'm having trouble hearing you. Could you repeat that?";
      try {
        const fallbackAudio = await synthesizeSpeech(fallbackMessage, VOICES.bella);
        return fallbackAudio;
      } catch (ttsError) {
        console.error("[VoiceProcessing] TTS fallback also failed:", ttsError);
        return Buffer.alloc(0);
      }
    }

    console.log(`[VoiceProcessing] Transcribed: "${userText}"`);

    // Step 2: Add user message to session and persist
    const session = voiceSessionManager.getSession(callId);
    if (session) {
      voiceSessionManager.addMessage(callId, {
        role: "user",
        content: userText,
      });
      
      // Start persistence interval on first message
      if (session.turnCount === 1) {
        startSessionPersistenceInterval(callId);
      }
      
      // Persist this turn
      await persistSessionToDatabase(callId);
    }

    // Step 3: FIX 5 - Check if this is appointment confirmation using SMART detector
    let aiResponseText = "";
    let appointmentBooked = false;

    if ((session as any)?.proposedSlots && (session as any).proposedSlots.length > 0) {
      // Use smart confirmation detector instead of naive keyword matching
      const confirmationResult = appointmentConfirmationDetector.detectAppointmentConfirmation(
        userText,
        {
          hasProposedSlots: true,
          lastAIMessage: session?.conversationHistory?.[session.conversationHistory.length - 1]?.content,
          waitingForTimeSelection: true,
        }
      );

      console.log(`[VoiceProcessing] Confirmation detection: confidence=${confirmationResult.confidence}, isConfirming=${confirmationResult.isConfirming}, reason=${confirmationResult.reason}`);

      // Only book if high confidence (0.7+)
      if (confirmationResult.isConfirming && confirmationResult.confidence >= 0.7) {
        const proposedSlots = (session as any).proposedSlots;
        const selectedIndex = confirmationResult.selectedSlotIndex !== undefined ? confirmationResult.selectedSlotIndex : 0;
        const selectedSlot = proposedSlots[selectedIndex];

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
            
            // Notify admin of successful booking
            try {
              await adminNotifications.notifyAppointmentBooked(
                session.leadName || `Lead ${context.leadId}`,
                context.leadEmail || '',
                selectedSlot,
                Date.now() - session.startTime,
                'high'
              );
            } catch (notifyError) {
              console.error("[VoiceProcessing] Failed to notify admin:", notifyError);
            }

            console.log(`[VoiceProcessing] Appointment booked: ${bookResult.appointmentId}`);
          } else {
            aiResponseText = bookResult.message;
          }
        }
      } else if (confirmationResult.isConfirming && confirmationResult.requiresExplicitConfirmation) {
        // Ambiguous - ask for confirmation
        aiResponseText = appointmentConfirmationDetector.generateConfirmationQuestion(
          confirmationResult,
          (session as any).proposedSlots.map((s: any) => ({
            time: s.toISOString(),
            display: s.toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            }),
          }))
        );
      }
    }

    // Step 4: Generate AI response if appointment not booked
    let aiResponse;
    if (!appointmentBooked && !aiResponseText) {
      console.log(`[VoiceProcessing] Step 2: Generating AI response...`);
      try {
        aiResponse = await generateConversationResponse(userText, {
          ...context,
          conversationHistory: session?.conversationHistory || [],
        });
        aiResponseText = aiResponse.text;

        // Check if AI wants to propose appointments
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
      } catch (claudeError) {
        console.error("[VoiceProcessing] Claude LLM failed:", claudeError);
        // FIX 6: Fallback if Claude times out
        aiResponseText = "I need a moment to think. Could you wait just a second?";
      }
    }

    console.log(`[VoiceProcessing] Generated: "${aiResponseText.substring(0, 50)}..."`);

    // Step 5: Add AI response to session and persist
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
      
      // Persist turn
      await persistSessionToDatabase(callId);
    }

    // Step 6: Synthesize response to speech (ELEVENLABS)
    console.log(`[VoiceProcessing] Step 3: Synthesizing speech...`);
    let audioResponse: Buffer;
    try {
      audioResponse = await synthesizeSpeech(aiResponseText, VOICES.bella);
    } catch (synthesisError) {
      console.error("[VoiceProcessing] Synthesis failed:", synthesisError);
      // FIX 6: Fallback if ElevenLabs down
      const fallbackMessage = "I'm experiencing technical difficulties. Let me transfer you to someone who can help.";
      try {
        audioResponse = await synthesizeSpeech(fallbackMessage, VOICES.bella);
      } catch (fallbackError) {
        console.error("[VoiceProcessing] All TTS failed:", fallbackError);
        audioResponse = Buffer.alloc(0);
      }
    }

    console.log(
      `[VoiceProcessing] Synthesized: ${audioResponse.length} bytes`
    );

    // Step 7: Final logging
    console.log(`[VoiceProcessing] Complete conversation turn`);
    console.log(`  User said: "${userText.substring(0, 50)}..."`);
    console.log(`  AI said: "${aiResponseText.substring(0, 50)}..."`);

    return audioResponse;
  } catch (error) {
    console.error("[VoiceProcessing] Fatal error:", error);
    
    // Try to notify admin of critical failure
    try {
      await adminNotifications.notifyCriticalError(
        'VoiceProcessing Fatal Error',
        (error as Error).message,
        { callId, context }
      );
    } catch (notifyError) {
      console.error("[VoiceProcessing] Failed to notify admin of error:", notifyError);
    }
    
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
