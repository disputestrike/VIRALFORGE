/**
 * Voice Processing Service
 * 
 * Orchestrates the complete conversation flow:
 * Audio → Whisper (STT) → Claude (LLM) → ElevenLabs (TTS) → Audio
 */

import { transcribeAudio } from "./sttService";
import { synthesizeSpeech, VOICES } from "./ttsService";
import { generateConversationResponse } from "./conversationEngine";
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
      // Fallback response if transcription fails
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

    // Step 3: Generate AI response (CLAUDE)
    console.log(`[VoiceProcessing] Step 2: Generating AI response...`);
    const aiResponse = await generateConversationResponse(userText, {
      ...context,
      conversationHistory: session?.conversationHistory || [],
    });

    console.log(`[VoiceProcessing] Generated: "${aiResponse.text}"`);

    // Step 4: Add AI response to session
    if (session) {
      voiceSessionManager.addMessage(callId, {
        role: "assistant",
        content: aiResponse.text,
      });

      // Update qualification if needed
      if (aiResponse.qualificationUpdate) {
        voiceSessionManager.updateLeadQualification(
          callId,
          aiResponse.qualificationUpdate
        );
      }

      // Update sentiment
      const sentiment = detectSentiment(userText);
      voiceSessionManager.updateSentiment(callId, sentiment);
    }

    // Step 5: Synthesize response to speech (ELEVENLABS)
    console.log(`[VoiceProcessing] Step 3: Synthesizing speech...`);
    let audioResponse: Buffer;
    try {
      audioResponse = await synthesizeSpeech(aiResponse.text, VOICES.bella);
    } catch (error) {
      console.error("[VoiceProcessing] Synthesis failed:", error);
      // Fallback audio if synthesis fails
      audioResponse = Buffer.alloc(0);
    }

    console.log(
      `[VoiceProcessing] Synthesized: ${audioResponse.length} bytes`
    );

    // Step 6: Log the conversation turn
    console.log(`[VoiceProcessing] Complete conversation turn`);
    console.log(`  User said: "${userText}"`);
    console.log(`  AI said: "${aiResponse.text}"`);
    console.log(`  Intent: ${aiResponse.intent}`);

    return audioResponse;
  } catch (error) {
    console.error("[VoiceProcessing] Fatal error:", error);
    // Return silence on error
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
    /great|excellent|perfect|love|amazing|awesome|interested|yes|definitely/i;
  const negative =
    /terrible|hate|awful|bad|problem|no thanks|not interested|pass|decline/i;

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

  // Calculate RMS (root mean square) of audio samples
  for (let i = 0; i < view.length; i += 2) {
    const sample = (view[i] | (view[i + 1] << 8)) - 32768;
    sum += sample * sample;
  }

  const rms = Math.sqrt(sum / (view.length / 2));
  const threshold = 8000; // Adjust based on testing

  return rms > threshold;
}

/**
 * Format conversation for logging
 */
export function formatConversationLog(
  callId: string,
  sessionData: ReturnType<typeof voiceSessionManager.getSessionStats>
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
