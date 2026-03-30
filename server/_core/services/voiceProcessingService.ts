/**
 * VOICE PROCESSING SERVICE
 * Full pipeline: Audio Buffer → STT → LLM → TTS → Audio Buffer
 */

import * as voiceSessionManager from "./voiceSessionManager";
import * as conversationEngine from "./conversationEngine";
import { transcribeAudio } from "./sttService";
import { synthesizeSpeech } from "./ttsService";
import { resolveVoiceProfile } from "./voiceProfiles";

/**
 * Process raw audio from a SignalWire media stream.
 * Returns audio buffer to send back over WebSocket.
 */
export async function processAudioMessage(
  sessionId: string,
  audioBuffer: Buffer
): Promise<{
  audioPayload: string;
  text: string;
  response: string;
  action: string;
  timings: { sttMs: number; classificationMs: number; llmMs: number; ttsMs: number };
}> {
  const session = voiceSessionManager.getSession(sessionId);
  const timings = {
    sttMs: 0,
    classificationMs: 0,
    llmMs: 0,
    ttsMs: 0,
  };

  // ── Step 1: STT (Speech to Text) ─────────────────────────────────────────
  let userText = "";
  try {
    const sttStartedAt = Date.now();
    userText = await transcribeAudio(audioBuffer);
    timings.sttMs = Date.now() - sttStartedAt;
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
      timings,
    };
  }

  // ── Step 2: Add to session history ───────────────────────────────────────
  if (session) {
    voiceSessionManager.addMessage(sessionId, "user", userText);
  }

  // ── Step 3: LLM (Generate Response via Universal Engine) ────────────────
  let aiResponse = "How can I help you today?";
  let action: string = "follow_up";

  try {
    const { getCallState, createCallState, updateCallState, generateResponse } = await Promise.all([
      import("./callStateManager"),
      import("./conversationEngine"),
    ]).then(([csm, ce]) => ({ ...csm, generateResponse: ce.generateResponse }));

    // Get or create universal call state
    let callState = getCallState(sessionId) || createCallState(sessionId, session?.leadId ?? null, "solar");

    const tLLM = Date.now();
    const result = await generateResponse(userText, callState);
    aiResponse = result.response;
    action = result.action ?? "follow_up";
    timings.classificationMs = result.timings?.classificationMs ?? 0;
    timings.llmMs = result.timings?.llmMs ?? (Date.now() - tLLM);

    // Persist updated state
    updateCallState(sessionId, result.updatedState);

    console.log(`[VoiceProcessing] LLM: "${aiResponse}" (${timings.llmMs}ms, stage: ${result.updatedState.stage}, mode: ${result.updatedState.responseMode})`);
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
    const tTTS = Date.now();
    const voiceProfile = await resolveVoiceProfile({
      userId: session?.userId,
      leadId: session?.leadId,
      explicitVoiceProfileId: session?.voiceProfileId,
    });
    const audioBuffer = await synthesizeSpeech(aiResponse, {
      voiceId: voiceProfile.externalVoiceId,
      provider: voiceProfile.provider === "other" ? undefined : voiceProfile.provider,
      speed: voiceProfile.speed,
      stability: voiceProfile.stability,
    });
    audioPayload = audioBuffer.toString("base64");
    timings.ttsMs = Date.now() - tTTS;
    console.log(`[VoiceProcessing] TTS: ${audioBuffer.length} bytes (${timings.ttsMs}ms)`);
  } catch (ttsError) {
    console.error("[VoiceProcessing] TTS failed:", ttsError);
    // No audio to send back — call will be silent on this turn
  }

  return {
    audioPayload,
    text: userText,
    response: aiResponse,
    action,
    timings,
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
