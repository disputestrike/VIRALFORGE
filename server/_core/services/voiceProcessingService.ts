/**
 * VOICE PROCESSING SERVICE
 * Full pipeline: Audio Buffer → STT → LLM → TTS → Audio Buffer
 */

import * as voiceSessionManager from "./voiceSessionManager";
import * as conversationEngine from "./conversationEngine";
import { transcribeAudio } from "./sttService";
import { synthesizeSpeech } from "./ttsService";
import * as db from "../../db";

/**
 * Process raw audio from a Twilio media stream.
 * Returns audio buffer to send back over WebSocket.
 */
export async function processAudioMessage(
  sessionId: string,
  audioBuffer: Buffer
): Promise<{ audioPayload: string; text: string; response: string; action: string }> {
  const session = voiceSessionManager.getSession(sessionId);

  // ── Step 1: STT (Speech to Text) ─────────────────────────────────────────
  let userText = "";
  try {
    userText = await transcribeAudio(audioBuffer);
    console.log(`[VoiceProcessing] STT: "${userText}"`);
  } catch (sttError) {
    console.error("[VoiceProcessing] STT failed:", sttError);
    // Fallback: keep conversation going
    userText = "";
  }

  if (!userText.trim()) {
    // No speech detected — send silence or brief acknowledgment
    return {
      audioPayload: "",
      text: "",
      response: "",
      action: "continue",
    };
  }

  // ── Step 2: Add to session history ───────────────────────────────────────
  if (session) {
    voiceSessionManager.addMessage(sessionId, "user", userText);
  }

  // ── Step 3: LLM (Generate Response) ──────────────────────────────────────
  let aiResponse = "How can I help you today?";
  let action: string = "follow_up";

  try {
    const lead = session?.leadId ? await db.getLeadById(session.leadId) : null;
    const result = await conversationEngine.generateConversationResponse({
      history: session?.conversationHistory.slice(-6) ?? [], // Last 6 turns for context
      text: userText,
      leadName: lead ? `${lead.firstName} ${lead.lastName}` : undefined,
      industry: lead?.industry ?? undefined,
    });

    aiResponse = result.response;
    action = result.action ?? "follow_up";

    console.log(`[VoiceProcessing] LLM: "${aiResponse}" (action: ${action})`);
  } catch (llmError) {
    console.error("[VoiceProcessing] LLM failed:", llmError);
    aiResponse = "Let me transfer you to one of our team members. Please hold.";
    action = "transfer";
  }

  // ── Step 4: Add AI response to session ───────────────────────────────────
  if (session) {
    voiceSessionManager.addMessage(sessionId, "assistant", aiResponse);

    // Handle appointment booking action
    if (action === "book_appointment" || action === "propose_times") {
      const times = await conversationEngine.proposeAppointmentTimes(session.leadId);
      if (times.times.length > 0) {
        voiceSessionManager.updateSession(sessionId, { proposedSlots: times.times });
        const slotLabels = times.times.map(t => t.label).join(", or ");
        aiResponse = `I have these times available: ${slotLabels}. Which works best for you?`;
        voiceSessionManager.addMessage(sessionId, "assistant", aiResponse);
      }
    }

    if (action === "end_call" || action === "transfer") {
      voiceSessionManager.completeSession(
        sessionId,
        action === "transfer" ? "callback" : "not_interested"
      );
      await voiceSessionManager.persistSessionToDatabase(sessionId);
    }
  }

  // ── Step 5: TTS (Text to Speech) ─────────────────────────────────────────
  let audioPayload = "";
  try {
    const audioBuffer = await synthesizeSpeech(aiResponse);
    audioPayload = audioBuffer.toString("base64");
    console.log(`[VoiceProcessing] TTS: ${audioBuffer.length} bytes`);
  } catch (ttsError) {
    console.error("[VoiceProcessing] TTS failed:", ttsError);
    // No audio to send back — call will be silent on this turn
  }

  return {
    audioPayload,
    text: userText,
    response: aiResponse,
    action,
  };
}

export async function completeVoiceCall(
  sessionId: string,
  data: { outcome?: voiceSessionManager.VoiceSession["outcome"]; callSid?: string }
): Promise<{ completed: boolean }> {
  const session = voiceSessionManager.getSession(sessionId);
  if (session) {
    voiceSessionManager.completeSession(sessionId, data.outcome);
    await voiceSessionManager.persistSessionToDatabase(sessionId);
    voiceSessionManager.endSession(sessionId);
  }
  return { completed: true };
}

export default { processAudioMessage, completeVoiceCall };
