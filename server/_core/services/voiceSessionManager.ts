/**
 * VOICE SESSION MANAGER — In-memory sessions with DB persistence
 * Tracks live call state: conversation history, lead info, appointment state
 */

import * as db from "../../db";

export interface VoiceSession {
  sessionId: string;
  leadId: number;
  campaignId: string;
  userId?: number | null;
  callSid?: string;
  startTime: number;
  endTime?: number;
  status: "active" | "completed" | "failed";
  turnState: "idle" | "assistant_speaking" | "user_speaking" | "processing";
  greetingSent: boolean;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string; timestamp: number }>;
  proposedSlots: Array<{ time: Date; label: string }>;
  appointmentBooked: boolean;
  appointmentId?: number;
  outcome?: "interested" | "not_interested" | "callback" | "scheduled" | "voicemail" | "no_answer";
  sentiment?: "positive" | "neutral" | "negative";
  language?: string;
  voiceProfileId?: string;
  /** Other party's phone (inbound = caller From; outbound = callee To) — used to recover/create lead if leadId was 0 */
  callerPhone?: string | null;
  transcript: string;
  trace: Array<{ ts: number; event: string; data?: Record<string, unknown> }>;
  /** Last snapshot from realtime callPolicy (compliance / debugging). */
  voiceCallPolicy?: {
    mode: string;
    activeQuestion: string | null;
    conversationStage: string;
    lastIntent: string;
    extractedFacts: Record<string, string>;
  };
}

// In-memory session store (keyed by sessionId OR callSid)
const sessions = new Map<string, VoiceSession>();

export function createSession(
  leadId: number,
  campaignId: string,
  callSid?: string,
  options?: {
    userId?: number | null;
    language?: string;
    voiceProfileId?: string;
    callerPhone?: string | null;
  }
): VoiceSession {
  const sessionId = callSid || `session_${leadId}_${Date.now()}`;
  const session: VoiceSession = {
    sessionId,
    leadId,
    campaignId,
    userId: options?.userId ?? null,
    callSid,
    startTime: Date.now(),
    status: "active",
    turnState: "idle",
    greetingSent: false,
    conversationHistory: [],
    proposedSlots: [],
    appointmentBooked: false,
    transcript: "",
    language: options?.language ?? "en",
    voiceProfileId: options?.voiceProfileId,
    callerPhone: options?.callerPhone ?? null,
    trace: [],
  };
  sessions.set(sessionId, session);
  if (callSid && callSid !== sessionId) {
    sessions.set(callSid, session); // also index by callSid
  }
  traceEvent(sessionId, "session_created", {
    leadId,
    campaignId,
    userId: session.userId ?? null,
    language: session.language ?? "en",
    voiceProfileId: session.voiceProfileId ?? null,
  });
  console.log(`[VoiceSession] Created session ${sessionId} for lead ${leadId}`);
  return session;
}

export function getSession(sessionId: string): VoiceSession | null {
  return sessions.get(sessionId) ?? null;
}

export function addMessage(sessionId: string, role: "user" | "assistant", content: string): void {
  const session = sessions.get(sessionId);
  if (!session) {
    console.warn(`[VoiceSession] Session not found: ${sessionId}`);
    return;
  }
  session.conversationHistory.push({ role, content, timestamp: Date.now() });
  // Update running transcript
  const label = role === "user" ? "Lead" : "AI";
  session.transcript += `${label}: ${content}\n`;
}

export function updateSession(sessionId: string, updates: Partial<VoiceSession>): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  Object.assign(session, updates);
}

export function setTurnState(
  sessionId: string,
  turnState: VoiceSession["turnState"],
  data?: Record<string, unknown>
): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.turnState = turnState;
  traceEvent(sessionId, `turn_${turnState}`, data);
}

export function traceEvent(
  sessionId: string,
  event: string,
  data?: Record<string, unknown>
): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.trace.push({ ts: Date.now(), event, data });
  if (session.trace.length > 200) {
    session.trace = session.trace.slice(-200);
  }
}

export function completeSession(sessionId: string, outcome?: VoiceSession["outcome"]): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.status = "completed";
  session.endTime = Date.now();
  if (outcome) session.outcome = outcome;
  console.log(`[VoiceSession] Session ${sessionId} completed. Outcome: ${outcome}`);
}

export function endSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.status = "completed";
    session.endTime = Date.now();
    // Don't delete immediately — let persistence interval save it first
    setTimeout(() => {
      sessions.delete(sessionId);
      if (session.callSid) sessions.delete(session.callSid);
    }, 30000); // Keep for 30s after end
  }
}

// Track which sessions have already created a DB record (to avoid duplicates)
const sessionRecordingIds = new Map<string, number>();

/** If leadId was missing, attach or create a lead from callerPhone so transcripts always have a DB home. */
async function ensureLeadIdForPersist(session: VoiceSession): Promise<boolean> {
  if (session.leadId > 0) return true;
  if (!session.userId || !session.callerPhone?.trim()) {
    console.warn(
      `[VoiceSession] Cannot persist — no leadId and no callerPhone/userId (session ${session.sessionId})`
    );
    return false;
  }
  try {
    const { getLeadByPhone, createLead } = await import("../../db");
    const { normalizeToE164US } = await import("../phoneE164");
    const raw = session.callerPhone.trim();
    const phone = normalizeToE164US(raw) || raw;
    let existing = await getLeadByPhone(phone);
    if (!existing && raw !== phone) {
      existing = await getLeadByPhone(raw);
    }
    const foundId = existing && typeof (existing as { id?: number }).id === "number" ? (existing as { id: number }).id : 0;
    if (foundId > 0) {
      session.leadId = foundId;
      console.log(`[VoiceSession] Recovered leadId ${session.leadId} from phone for persist`);
      return true;
    }
    const { insertId } = await createLead({
      firstName: "Voice",
      lastName: phone.replace(/\D/g, "").slice(-4) || "Call",
      phone,
      source: "voice_recovered",
      status: "new",
      score: 50,
      segment: "warm",
      createdBy: session.userId,
    });
    session.leadId = insertId;
    console.log(`[VoiceSession] Created lead ${insertId} from callerPhone for transcript persist`);
    return true;
  } catch (e) {
    console.error("[VoiceSession] ensureLeadIdForPersist failed:", e);
    return false;
  }
}

export async function persistSessionToDatabase(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;

  if (!session.leadId) {
    const ok = await ensureLeadIdForPersist(session);
    if (!ok) return;
  }

  // Only persist on completion — not on every interval tick during active calls
  // The interval is just a safety net for crashes; normal flow completes via completeSession
  if (session.status === "active" && !session.endTime) {
    // Session still active — skip intermediate writes to avoid duplicate rows
    return;
  }

  // Avoid creating duplicate rows for the same session
  if (sessionRecordingIds.has(sessionId)) {
    return; // Already persisted
  }

  try {
    const durationSeconds = session.endTime
      ? Math.floor((session.endTime - session.startTime) / 1000)
      : Math.floor((Date.now() - session.startTime) / 1000);

    let aiSummary: string | null = null;
    if (session.transcript?.trim()) {
      const { generateCallSummaryFromTranscript } = await import("./callSummaryService");
      aiSummary = await generateCallSummaryFromTranscript(session.transcript, session.outcome ?? undefined);
    }
    if (!aiSummary && session.conversationHistory.length > 0) {
      aiSummary = `${session.conversationHistory.length} turns. Outcome: ${session.outcome ?? "unknown"}`;
    }

    const { inferSentimentFromTranscript } = await import("./sentimentInfer");
    const sentiment =
      session.sentiment ?? inferSentimentFromTranscript(session.transcript);

    const result = await db.createCallRecording({
      leadId: session.leadId,
      campaignId: session.campaignId ? parseInt(session.campaignId) || undefined : undefined,
      duration: durationSeconds,
      status: session.status === "completed" ? "completed" : "failed",
      outcome: session.outcome ?? "no_answer",
      transcript: session.transcript || null,
      aiSummary,
      sentiment,
      scheduledAppointment: session.appointmentBooked,
      createdBy: session.userId ?? undefined,
      calledAt: new Date(session.startTime),
    });

    sessionRecordingIds.set(sessionId, result.insertId);

    if (session.userId) {
      const { emitZapierEvent } = await import("./zapierEmit");
      void emitZapierEvent(session.userId, "call.completed", {
        recordingId: result.insertId,
        leadId: session.leadId,
        campaignId: session.campaignId ? parseInt(session.campaignId, 10) || undefined : undefined,
        durationSeconds,
        outcome: session.outcome ?? "no_answer",
        status: session.status,
        aiSummary: aiSummary ?? undefined,
        scheduledAppointment: !!session.appointmentBooked,
      });
    }

    // Update lead status if outcome is known
    if (session.outcome === "scheduled" || session.appointmentBooked) {
      await db.updateLead(session.leadId, { status: "qualified" });
    } else if (session.outcome === "not_interested") {
      await db.updateLead(session.leadId, { status: "lost" });
    } else if (session.outcome === "interested" || session.outcome === "callback") {
      await db.updateLead(session.leadId, { status: "contacted" });
    }

    console.log(`[VoiceSession] Persisted session ${sessionId} → recordingId: ${result.insertId}`);
  } catch (error) {
    console.error(`[VoiceSession] Failed to persist session ${sessionId}:`, error);
  }
}

/** Periodically persist active sessions every 30s */
export function startSessionPersistenceInterval(sessionId: string): void {
  const interval = setInterval(async () => {
    const session = sessions.get(sessionId);
    if (!session || session.status === "completed") {
      clearInterval(interval);
      return;
    }
    await persistSessionToDatabase(sessionId);
  }, 30000);
}

export function getActiveSessions(): VoiceSession[] {
  return Array.from(sessions.values()).filter(s => s.status === "active");
}

export function getRecentSessions(limit = 20): VoiceSession[] {
  const deduped = new Map<string, VoiceSession>();
  for (const session of Array.from(sessions.values())) {
    deduped.set(session.sessionId, session);
  }
  return Array.from(deduped.values())
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, limit);
}

export default {
  createSession,
  getSession,
  addMessage,
  updateSession,
  completeSession,
  endSession,
  persistSessionToDatabase,
  startSessionPersistenceInterval,
  getActiveSessions,
  getRecentSessions,
};
