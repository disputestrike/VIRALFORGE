/**
 * Google Calendar integration — connects user's calendar, creates events on appointment booking.
 *
 * ENV required:
 *   GCAL_CLIENT_ID      — OAuth client ID for calendar (can reuse login client or separate)
 *   GCAL_CLIENT_SECRET   — OAuth client secret
 *   (falls back to GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET if GCAL_ not set)
 */
import { google } from "googleapis";
import { ENV } from "../env";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

function getCalendarClientId(): string {
  return process.env.GCAL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "";
}
function getCalendarClientSecret(): string {
  return process.env.GCAL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";
}

function createOAuth2Client(redirectUri: string) {
  return new google.auth.OAuth2(
    getCalendarClientId(),
    getCalendarClientSecret(),
    redirectUri
  );
}

/** Generate the OAuth URL for a user to authorize Google Calendar access */
export function getCalendarAuthUrl(redirectUri: string, state: string): string {
  const client = createOAuth2Client(redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

/** Exchange the authorization code for tokens */
export async function exchangeCalendarCode(
  code: string,
  redirectUri: string
): Promise<{ refreshToken: string | null; accessToken: string | null }> {
  const client = createOAuth2Client(redirectUri);
  const { tokens } = await client.getToken(code);
  return {
    refreshToken: tokens.refresh_token ?? null,
    accessToken: tokens.access_token ?? null,
  };
}

/** Create a Google Calendar event using the user's stored refresh token */
export async function createCalendarEvent(opts: {
  refreshToken: string;
  summary: string;
  description?: string;
  startTime: Date;
  durationMinutes: number;
  attendeeEmail?: string;
  attendeePhone?: string;
  timezone?: string;
}): Promise<{ eventId: string; htmlLink: string } | null> {
  try {
    const client = createOAuth2Client("");
    client.setCredentials({ refresh_token: opts.refreshToken });

    const calendar = google.calendar({ version: "v3", auth: client });

    const startDate = new Date(opts.startTime);
    const endDate = new Date(startDate.getTime() + opts.durationMinutes * 60 * 1000);
    const tz = opts.timezone || "America/Chicago";

    const attendees: { email: string }[] = [];
    if (opts.attendeeEmail) {
      attendees.push({ email: opts.attendeeEmail });
    }

    const event = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: opts.summary,
        description: [
          opts.description || "",
          opts.attendeePhone ? `Phone: ${opts.attendeePhone}` : "",
          "Booked by ApexAI",
        ]
          .filter(Boolean)
          .join("\n"),
        start: { dateTime: startDate.toISOString(), timeZone: tz },
        end: { dateTime: endDate.toISOString(), timeZone: tz },
        attendees,
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 60 },
            { method: "popup", minutes: 15 },
          ],
        },
      },
      sendUpdates: attendees.length > 0 ? "all" : "none",
    });

    return {
      eventId: event.data.id || "",
      htmlLink: event.data.htmlLink || "",
    };
  } catch (err: any) {
    console.error("[GoogleCalendar] Failed to create event:", err.message);
    return null;
  }
}

/**
 * Generate a "Add to Google Calendar" link (no OAuth required — just a URL).
 * This is the fallback when the user hasn't connected their calendar.
 */
export function generateGcalAddLink(opts: {
  title: string;
  startTime: Date;
  durationMinutes: number;
  description?: string;
  location?: string;
}): string {
  const start = opts.startTime.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const endDate = new Date(opts.startTime.getTime() + opts.durationMinutes * 60 * 1000);
  const end = endDate.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${start}/${end}`,
    details: opts.description || "Booked by ApexAI",
  });
  if (opts.location) params.set("location", opts.location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function isCalendarConfigured(): boolean {
  return !!(getCalendarClientId() && getCalendarClientSecret());
}
