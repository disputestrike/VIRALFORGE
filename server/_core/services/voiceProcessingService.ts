/**
 * Voice Processing Service — Full pipeline per turn
 * Audio → STT → LLM Router (Claude) → TTS → Audio
 * 
 * Context fix: conversation history is loaded from voiceSessionManager
 * and passed fully to the LLM on every turn.
 */

import * as voiceSessionManager from "./voiceSessionManager";
import { transcribeAudio } from "./sttService";
import { synthesizeSpeech } from "./ttsService";
import { resolveVoiceProfile } from "./voiceProfiles";
import { routedLLMCall } from "./llmRouter";

// ── Voice-optimized system prompt ─────────────────────────────────────────────
const VOICE_SYSTEM_PROMPT = `You are a professional AI sales assistant on a live phone call.

CRITICAL VOICE RULES:
- Have a real conversation: usually 2–5 short sentences per turn. Do not default to one terse line every time — it sounds broken. Stay concise vs a lecture.
- Spoken language only — no markdown, no lists, no bullet points.
- Start with a brief acknowledgment when the caller says something emotional or complex.
- Ask only ONE main question at a time unless they asked several things.
- If caller gives objection, handle it calmly with enough substance, then ask one question.
- If caller wants to book, confirm the appointment clearly.
- If caller is angry or frustrated, slow down and acknowledge first.
- Never say "as an AI" or mention the underlying model vendor.
- Sound warm, human, and direct.

GOAL: Qualify the lead, handle objections, book appointments.`;

// ── Main processing function ──────────────────────────────────────────────────

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
  const timings = { sttMs: 0, classificationMs: 0, llmMs: 0, ttsMs: 0 };
  const session = voiceSessionManager.getSession(sessionId);

  // ── Step 1: STT ───────────────────────────────────────────────────────────
  let userText = "";
  try {
    const t0 = Date.now();
    const language = session?.language || "en";
    userText = await transcribeAudio(audioBuffer, language);
    timings.sttMs = Date.now() - t0;
    console.log(`[Voice] STT (${timings.sttMs}ms): "${userText}"`);
  } catch (err) {
    console.error("[Voice] STT failed:", err);
    return { audioPayload: "", text: "", response: "", action: "continue", timings };
  }

  if (!userText.trim()) {
    return { audioPayload: "", text: "", response: "", action: "continue", timings };
  }

  // ── Step 2: Add to session history ────────────────────────────────────────
  if (session) {
    voiceSessionManager.addMessage(sessionId, "user", userText);
  }

  // ── Step 3: Build conversation context ───────────────────────────────────
  // CONTEXT FIX: load full conversation history from session, not callStateManager
  const conversationHistory = session?.conversationHistory ?? [];
  const objectionCount = conversationHistory
    .filter(m => m.role === "user" && isObjection(m.content))
    .length;

  // Build messages for LLM — last 8 turns max for speed
  const recentHistory = conversationHistory.slice(-8);
  const messages = [
    { role: "system" as const, content: buildSystemPrompt(session) },
    ...recentHistory.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  // ── Step 4: LLM (Cerebras primary / Claude or Groq fallback) ────────────────────────────
  let aiResponse = "How can I help you today?";
  let action = "follow_up";
  const t1 = Date.now();

  try {
    const result = await routedLLMCall(
      messages,
      userText,
      recentHistory,
      objectionCount
    );
    aiResponse = sanitizeForSpeech(result.text);
    timings.llmMs = result.latencyMs;
    timings.classificationMs = Date.now() - t1 - result.latencyMs;

    // Extract action if present in response
    action = extractAction(aiResponse, userText);

    console.log(`[Voice] LLM:${result.route} (${result.latencyMs}ms): "${aiResponse.slice(0, 80)}"`);
  } catch (err) {
    console.error("[Voice] LLM failed:", err);
    aiResponse = "Let me connect you with someone who can help. Please hold.";
    action = "transfer";
  }

  // ── Step 5: Add AI response to history ───────────────────────────────────
  if (session) {
    voiceSessionManager.addMessage(sessionId, "assistant", aiResponse);

    if (action === "end_call" || action === "transfer") {
      voiceSessionManager.completeSession(sessionId, action === "transfer" ? "callback" : "not_interested");
      await voiceSessionManager.persistSessionToDatabase(sessionId);
    }
  }

  // ── Step 6: TTS ───────────────────────────────────────────────────────────
  let audioPayload = "";
  try {
    const t2 = Date.now();
    const voiceProfile = await resolveVoiceProfile({
      userId: session?.userId,
      leadId: session?.leadId,
      explicitVoiceProfileId: session?.voiceProfileId,
    }).catch(() => ({
      externalVoiceId: "694f9389-aac1-45b6-b726-9d9369183238",
      provider: "cartesia" as const,
      speed: undefined,
      stability: undefined,
    }));

    const audio = await synthesizeSpeech(aiResponse, {
      voiceId: voiceProfile.externalVoiceId,
      provider: (voiceProfile as any).provider === "other" ? undefined : (voiceProfile as any).provider,
      speed: (voiceProfile as any).speed,
      stability: (voiceProfile as any).stability,
    });
    audioPayload = audio.toString("base64");
    timings.ttsMs = Date.now() - t2;
    console.log(`[Voice] TTS (${timings.ttsMs}ms): ${audio.length} bytes`);
  } catch (err) {
    console.error("[Voice] TTS failed:", err);
  }

  return { audioPayload, text: userText, response: aiResponse, action, timings };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSystemPrompt(session: any): string {
  const parts = [VOICE_SYSTEM_PROMPT];

  if (session?.leadId) {
    parts.push(`\nThis is an outbound call to a lead.`);
  } else {
    parts.push(`\nThis is an inbound call.`);
  }

  if (session?.language && session.language !== "en") {
    const LANG: Record<string, string> = {
      es: "Spanish", fr: "French", de: "German", pt: "Portuguese",
      it: "Italian", nl: "Dutch", zh: "Mandarin Chinese", ja: "Japanese", ko: "Korean",
    };
    const lang = LANG[session.language] || session.language;
    parts.push(`\nIMPORTANT: Respond ONLY in ${lang}.`);
  }

  return parts.join("");
}

function isObjection(text: string): boolean {
  const t = text.toLowerCase();
  return [
    "too expensive", "not interested", "call me later", "send me",
    "is this legit", "stop calling", "remove me", "not now", "scam",
    "don't trust", "already have", "busy",
  ].some(k => t.includes(k));
}

function extractAction(response: string, userText: string): string {
  const r = response.toLowerCase();
  const u = userText.toLowerCase();
  if (u.includes("transfer") || u.includes("speak to") || u.includes("real person")) return "transfer";
  if (r.includes("transfer you") || r.includes("connect you with")) return "transfer";
  if (r.includes("goodbye") || r.includes("take care") || r.includes("have a good")) return "end_call";
  if (r.includes("book") || r.includes("schedule") || r.includes("appointment")) return "book_appointment";
  return "follow_up";
}

function sanitizeForSpeech(text: string): string {
  return text
    .replace(/\*+/g, "")
    .replace(/[_#`>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
