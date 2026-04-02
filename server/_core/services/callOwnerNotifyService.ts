/**
 * When a live call ends (realtimeVoiceEngine), notify the tenant owner:
 * - SMS to users.transferNumber: summary + start of transcript
 * - Email to users.email (if RESEND_API_KEY): full transcript HTML
 *
 * Legacy VoiceRealtimePipeline had sendCallSummaryToOwner; production uses createCallEngine only,
 * so this service wires the same expectation for the current stack.
 */
import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { users } from "../../../drizzle/schema";
import { ENV } from "../env";
import voiceSessionManager from "./voiceSessionManager";

const notified = new Set<string>();

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function notifyOwnerAfterVoiceCall(sessionId: string): Promise<void> {
  if (notified.has(sessionId)) return;

  const session = voiceSessionManager.getSession(sessionId);
  if (!session?.userId) return;
  const history = session.conversationHistory ?? [];
  if (history.length === 0) return;

  notified.add(sessionId);

  try {
    const db = await getDb();
    if (!db) return;

    const [owner] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    if (!owner) return;

    const callerLines = history.filter((m) => m.role === "user").map((m) => m.content);
    const first = callerLines[0] || "";
    const last = callerLines[callerLines.length - 1] || "";
    const transcript = session.transcript?.trim() || "";

    const bookingLine =
      session.appointmentBooked && session.appointmentId
        ? `✅ Appointment booked (id ${session.appointmentId})`
        : null;
    const summaryBlock = [
      `📞 ApexAI — call ended`,
      bookingLine,
      `Turns: ${history.length}`,
      first ? `First: "${first.slice(0, 120)}${first.length > 120 ? "…" : ""}"` : null,
      last && last !== first ? `Last: "${last.slice(0, 120)}${last.length > 120 ? "…" : ""}"` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const smsBody = `${summaryBlock}\n\n--- Transcript ---\n${transcript.slice(0, 900)}${
      transcript.length > 900 ? "… Full text emailed / in dashboard." : ""
    }`;

    const phone = owner.transferNumber?.trim();
    if (phone) {
      const { sendSMS } = await import("./signalwireService");
      await sendSMS({ to: phone, body: smsBody });
      console.log(`[CallOwnerNotify] SMS sent to owner (user ${session.userId})`);
    } else {
      console.warn(`[CallOwnerNotify] No transferNumber — SMS skipped (user ${session.userId})`);
    }

    const email = owner.email?.trim();
    if (email && ENV.resendApiKey && transcript.length > 0) {
      const { Resend } = await import("resend");
      const resend = new Resend(ENV.resendApiKey);
      await resend.emails.send({
        from: ENV.resendFromHeader,
        to: email,
        subject: session.appointmentBooked
          ? `Call + booking — ${new Date(session.startTime).toLocaleString()}`
          : `Call transcript — ${new Date(session.startTime).toLocaleString()}`,
        html: `<p style="font-family:system-ui,sans-serif;color:#333">Full transcript:</p><pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px">${escapeHtml(transcript)}</pre>`,
      });
      console.log(`[CallOwnerNotify] Email transcript sent`);
    }
  } catch (e) {
    console.warn("[CallOwnerNotify] failed:", e instanceof Error ? e.message : String(e));
  }
}
