/**
 * End-to-end voice booking: DB row, customer SMS, optional email, owner alert,
 * and 24h / 2h reminders (BullMQ when Redis is set; direct send + setTimeout fallback otherwise).
 */

import * as db from "../../db";
import { ENV } from "../env";
import voiceSessionManager from "./voiceSessionManager";
import { addSmsJob, addEmailJob, getQueues } from "./queue";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Best-effort parse of LLM tool args (free-form date/time strings). */
export function parseVoiceAppointmentDateTime(dateStr?: string, timeStr?: string): Date {
  const d = (dateStr ?? "").trim();
  const t = (timeStr ?? "").trim();
  const combos = [`${d} ${t}`.trim(), d, t, `${t} ${d}`.trim()].filter(Boolean);
  for (const c of combos) {
    const ms = Date.parse(c);
    if (!Number.isNaN(ms)) return new Date(ms);
  }
  const lower = d.toLowerCase();
  const base = new Date();
  if (lower === "tomorrow") {
    base.setDate(base.getDate() + 1);
  } else if (lower === "today") {
    /* keep */
  } else if (!d && !t) {
    base.setDate(base.getDate() + 1);
  }
  const tm = t.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|am|pm)?/i);
  if (tm) {
    let h = parseInt(tm[1]!, 10);
    const m = tm[2] ? parseInt(tm[2], 10) : 0;
    const ap = (tm[3] || "").toLowerCase().replace(/\./g, "");
    if (ap.startsWith("p") && h < 12) h += 12;
    if (ap.startsWith("a") && h === 12) h = 0;
    base.setHours(h, m, 0, 0);
  } else {
    base.setHours(10, 0, 0, 0);
  }
  return base;
}

function formatBookingLineForSms(d: Date): string {
  const dayTime = d.toLocaleString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `You're booked for ${dayTime}. Reply here if needed.`;
}

function formatReminderTime(d: Date): string {
  return d.toLocaleString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

async function resolveLeadIdForBooking(
  leadId: number,
  userId: number | undefined,
  callerPhone: string | null | undefined,
  toolPhone: string | undefined
): Promise<number> {
  if (leadId > 0) return leadId;
  const { normalizeToE164US } = await import("../phoneE164");
  const raw = (toolPhone || callerPhone || "").trim();
  if (!raw || !userId) return 0;
  const phone = normalizeToE164US(raw) || raw;
  try {
    let existing = await db.getLeadByPhone(phone);
    if (!existing && raw !== phone) existing = await db.getLeadByPhone(raw);
    const id = existing && typeof (existing as { id?: number }).id === "number" ? (existing as { id: number }).id : 0;
    if (id > 0) return id;
    const { insertId } = await db.createLead({
      firstName: "Voice",
      lastName: phone.replace(/\D/g, "").slice(-4) || "Book",
      phone,
      source: "voice_booking",
      status: "new",
      score: 60,
      segment: "warm",
      createdBy: userId,
    });
    return insertId;
  } catch {
    return 0;
  }
}

export type VoiceBookingToolArgs = {
  name?: string;
  phone?: string;
  date?: string;
  time?: string;
  service?: string;
  notes?: string;
};

export async function finalizeVoiceAppointmentBooking(opts: {
  leadId: number;
  userId: number | undefined;
  sessionId: string | undefined;
  callerPhone?: string | null;
  businessName?: string;
  toolArgs: VoiceBookingToolArgs;
  transcriptSnippet?: string;
}): Promise<{
  insertId: number;
  scheduledTime: Date;
  leadId: number;
  calendarLink: string | null;
  calendarEventId: string | null;
} | null> {
  const a = opts.toolArgs;
  const scheduledTime = parseVoiceAppointmentDateTime(a.date, a.time);

  let leadId = await resolveLeadIdForBooking(
    opts.leadId,
    opts.userId,
    opts.callerPhone,
    a.phone?.trim()
  );
  if (leadId <= 0) {
    console.warn("[VoiceBooking] No leadId — cannot persist appointment");
    return null;
  }

  const namePart = (a.name || "").trim();
  const phonePart = (a.phone || "").trim();
  const servicePart = (a.service || "").trim();
  const notesPart = (a.notes || "").trim();
  const notes = [
    "Voice AI booking",
    namePart ? `Name: ${namePart}` : null,
    phonePart ? `Phone: ${phonePart}` : null,
    servicePart ? `Service: ${servicePart}` : null,
    notesPart ? `Notes: ${notesPart}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  let insertId: number;
  try {
    const row = await db.createManualAppointment({
      leadId,
      scheduledTime,
      duration: 30,
      notes,
      timezone: "America/New_York",
    });
    insertId = row.insertId;
  } catch (e) {
    console.error("[VoiceBooking] createManualAppointment failed:", e);
    return null;
  }

  try {
    const first = namePart.split(/\s+/)[0] || undefined;
    await db.updateLead(leadId, {
      ...(first ? { firstName: first } : {}),
      ...(phonePart ? { phone: phonePart } : {}),
      status: "qualified",
    });
  } catch (e) {
    console.warn("[VoiceBooking] updateLead:", e);
  }

  await db.logActivity({
    userId: opts.userId,
    entityType: "appointment",
    entityId: insertId,
    action: "booked",
    description: `Voice booking lead ${leadId} @ ${scheduledTime.toISOString()}`,
  });

  if (opts.sessionId) {
    voiceSessionManager.updateSession(opts.sessionId, {
      appointmentBooked: true,
      appointmentId: insertId,
      outcome: "scheduled",
    });
  }

  const lead = await db.getLeadById(leadId);
  const l = lead as Record<string, unknown> | null;
  const ownerUser = opts.userId ? await db.getUserById(opts.userId) : null;
  let calendarEventId: string | null = null;
  let calendarLink: string | null = null;
  try {
    const { createCalendarEvent, generateGcalAddLink } = await import(
      "./googleCalendar"
    );
    const businessLabel = (opts.businessName || "ApexAI").trim();
    const appointmentTitle = `${businessLabel} appointment`;
    const calendarDescription = [
      namePart ? `Name: ${namePart}` : null,
      phonePart ? `Phone: ${phonePart}` : null,
      servicePart ? `Service: ${servicePart}` : null,
      notesPart ? `Notes: ${notesPart}` : null,
      opts.transcriptSnippet
        ? `Transcript excerpt: ${opts.transcriptSnippet.slice(0, 1200)}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const refreshToken = (ownerUser as { gcalRefreshToken?: string | null } | null)
      ?.gcalRefreshToken;
    if (refreshToken) {
      const event = await createCalendarEvent({
        refreshToken,
        summary: appointmentTitle,
        description: calendarDescription,
        startTime: scheduledTime,
        durationMinutes: 30,
        attendeeEmail: typeof l?.email === "string" ? l.email : undefined,
        attendeePhone: phonePart || (typeof l?.phone === "string" ? l.phone : undefined),
        timezone: "America/New_York",
      });
      calendarEventId = event?.eventId || null;
      calendarLink = event?.htmlLink || null;
    }

    if (!calendarLink) {
      calendarLink = generateGcalAddLink({
        title: appointmentTitle,
        startTime: scheduledTime,
        durationMinutes: 30,
        description: calendarDescription,
      });
    }
  } catch (e) {
    console.warn("[VoiceBooking] Calendar wiring failed:", e);
  }

  const smsTo = phonePart || (l?.phone as string) || opts.callerPhone?.trim() || "";
  const customerSms = formatBookingLineForSms(scheduledTime);
  const queues = await getQueues();
  const hasRedis = !!queues;

  if (smsTo) {
    try {
      const { sendSMS } = await import("./signalwireService");
      if (hasRedis) {
        await addSmsJob({
          leadId,
          phone: smsTo,
          type: "appointment_confirmation",
          leadName: namePart || (l?.firstName as string) || "there",
          scheduledTime: formatReminderTime(scheduledTime),
          userId: opts.userId,
          body: customerSms,
        });
      } else {
        await sendSMS({ to: smsTo, body: customerSms, userId: opts.userId });
        console.log("[VoiceBooking] Customer SMS sent (direct - no REDIS_URL)");
      }
    } catch (e) {
      console.error("[VoiceBooking] Customer SMS failed:", e);
    }
  }

  const leadEmail = (l?.email as string)?.trim();
  if (leadEmail && ENV.resendApiKey) {
    const formattedTime = formatReminderTime(scheduledTime);
    try {
      if (hasRedis) {
        await addEmailJob({
          leadId,
          email: leadEmail,
          type: "appointment_confirmation",
          leadName: namePart || (l?.firstName as string) || "there",
          scheduledTime: scheduledTime.toISOString(),
          calendarLink: calendarLink ?? undefined,
        });
      } else {
        const { Resend } = await import("resend");
        const resend = new Resend(ENV.resendApiKey);
        await resend.emails.send({
          from: ENV.resendFromHeader,
          to: leadEmail,
          subject: `Appointment confirmed - ${formattedTime}`,
          html: `<p>Hi ${escapeHtml(namePart || "there")},</p><p>Your appointment is confirmed for <strong>${escapeHtml(formattedTime)}</strong>.</p>${calendarLink ? `<p><a href="${escapeHtml(calendarLink)}">Add it to your calendar</a></p>` : ""}<p>We look forward to speaking with you.</p>`,
        });
        console.log("[VoiceBooking] Customer email sent (direct)");
      }
    } catch (e) {
      console.error("[VoiceBooking] Customer email failed:", e);
    }
  }

  if (opts.userId && ENV.resendApiKey) {
    try {
      const ownerEmail = (ownerUser as { email?: string | null } | null)?.email?.trim();
      if (ownerEmail) {
        const biz = opts.businessName || "Your business";
        const subj = `New voice booking - ${namePart || "Caller"} - ${formatReminderTime(scheduledTime)}`;
        const html = `<h2>Voice AI booking</h2>
<p><strong>Business:</strong> ${escapeHtml(biz)}</p>
<p><strong>When:</strong> ${escapeHtml(formatReminderTime(scheduledTime))}</p>
<p><strong>Lead ID:</strong> ${leadId} | <strong>Appointment ID:</strong> ${insertId}</p>
<p><strong>Name:</strong> ${escapeHtml(namePart || "-")}<br/>
<strong>Phone:</strong> ${escapeHtml(phonePart || String(l?.phone || "-"))}<br/>
<strong>Service:</strong> ${escapeHtml(servicePart || "-")}</p>
<p><strong>Notes:</strong> ${escapeHtml(notesPart || notes)}</p>
${calendarLink ? `<p><strong>Calendar:</strong> <a href="${escapeHtml(calendarLink)}">${escapeHtml(calendarLink)}</a></p>` : ""}
${calendarEventId ? `<p><strong>Calendar event ID:</strong> ${escapeHtml(calendarEventId)}</p>` : ""}
${opts.transcriptSnippet ? `<p><strong>Transcript excerpt:</strong></p><pre style="white-space:pre-wrap">${escapeHtml(opts.transcriptSnippet.slice(0, 4000))}</pre>` : ""}`;
        const { Resend } = await import("resend");
        const resend = new Resend(ENV.resendApiKey);
        await resend.emails.send({
          from: ENV.resendFromHeader,
          to: ownerEmail,
          subject: subj,
          html,
        });
        console.log("[VoiceBooking] Owner internal email sent");
      }
    } catch (e) {
      console.error("[VoiceBooking] Owner email failed:", e);
    }
  }

  const tAppt = scheduledTime.getTime();
  const now = Date.now();
  const ms24h = tAppt - 24 * 3600 * 1000 - now;
  const ms2h = tAppt - 2 * 3600 * 1000 - now;
  const fullFmt = formatReminderTime(scheduledTime);

  const reminderPhone =
    smsTo || String(l?.phone || "").trim() || (opts.callerPhone || "").trim();

  const scheduleReminder = async (delayMs: number, label: string) => {
    if (delayMs < 60_000) return;
    if (!reminderPhone) return;
    const body =
      label === "24h"
        ? `Reminder: your appointment is in 24 hours (${fullFmt}). Reply here if needed.`
        : `Reminder: your appointment is in 2 hours (${fullFmt}). Reply here if needed.`;
    try {
      if (hasRedis) {
        await addSmsJob({
          leadId,
          phone: reminderPhone,
          type: "appointment_reminder",
          leadName: namePart || (l?.firstName as string) || "there",
          scheduledTime: fullFmt,
          userId: opts.userId,
          delay: delayMs,
          body,
        });
      } else {
        const { sendSMS } = await import("./signalwireService");
        const cap = Math.min(delayMs, 2147483647);
        setTimeout(() => {
          sendSMS({ to: reminderPhone, body, userId: opts.userId }).catch((err) =>
            console.error(`[VoiceBooking] ${label} reminder failed:`, err)
          );
        }, cap);
        console.log(`[VoiceBooking] ${label} reminder scheduled (setTimeout ${cap}ms)`);
      }
    } catch (e) {
      console.error(`[VoiceBooking] Reminder ${label}:`, e);
    }
  };

  await scheduleReminder(ms24h, "24h");
  await scheduleReminder(ms2h, "2h");

  return { insertId, scheduledTime, leadId, calendarLink, calendarEventId };
}
