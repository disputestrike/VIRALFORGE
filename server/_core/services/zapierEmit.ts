/**
 * POST JSON to the tenant's Zapier catch hook when events occur.
 * Respects optional `events` CSV on `zapier_webhooks` (empty = all listed events).
 */
import { getZapierWebhook } from "../../db";

const KNOWN_EVENTS = new Set(["call.completed", "lead.created"]);

/** If filter is empty, emit all known events. Otherwise require exact match. */
export function eventAllowed(filter: string | null | undefined, event: string): boolean {
  if (!filter?.trim()) return KNOWN_EVENTS.has(event);
  const allowed = new Set(
    filter
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  return allowed.has(event);
}

export async function emitZapierEvent(
  userId: number,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const row = await getZapierWebhook(userId);
    if (!row?.targetUrl || row.isActive === false) return;
    if (!eventAllowed(row.events ?? null, event)) return;

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(row.targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        sentAt: new Date().toISOString(),
        payload,
      }),
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!res.ok) console.warn(`[Zapier] ${event} → HTTP ${res.status}`);
  } catch (e) {
    console.warn("[Zapier] emit failed:", (e as Error).message);
  }
}
