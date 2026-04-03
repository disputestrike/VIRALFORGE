/**
 * Outbound dial compliance (roadmap WS8) — quiet hours in **server local time**.
 * Set `TZ` on the host (e.g. `America/Chicago`) so hours match your market.
 *
 * Env: `VOICE_OUTBOUND_ALLOW_HOURS` — `8-21` = allow 08:00–20:59; `22-6` = overnight window.
 * Empty / unset = no restriction.
 */

export function parseAllowHoursWindow(raw: string | undefined): { start: number; end: number } | null {
  const s = raw?.trim();
  if (!s) return null;
  const parts = s.split("-");
  if (parts.length !== 2) return null;
  const start = parseInt(parts[0]!, 10);
  const end = parseInt(parts[1]!, 10);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start < 0 || start > 23 || end < 0 || end > 23) return null;
  return { start, end };
}

/** Returns true if current hour is inside [start,end) same-day, or [start,24)∪[0,end) if start > end. */
export function isHourInAllowWindow(hour: number, start: number, end: number): boolean {
  if (start === end) return true;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

/**
 * Throws if outbound dial is not allowed now. Call from `initiateCall` only.
 */
export function assertOutboundDialAllowed(allowHoursEnv: string | undefined): void {
  const win = parseAllowHoursWindow(allowHoursEnv);
  if (!win) return;
  const hour = new Date().getHours();
  if (!isHourInAllowWindow(hour, win.start, win.end)) {
    throw new Error(
      `[Outbound] Blocked: outside VOICE_OUTBOUND_ALLOW_HOURS (${allowHoursEnv}). Local hour=${hour}. Set TZ on server for correct timezone.`
    );
  }
}
