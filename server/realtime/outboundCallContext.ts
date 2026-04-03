/**
 * Short-lived stash for outbound dial metadata (script, campaign) keyed by sessionId.
 * SignalWire `/api/voice/start` receives the same sessionId in the query — we attach context
 * before `calls.create` and consume it once when the webhook runs (cannot rely on long URLs).
 */
type OutboundStash = {
  script?: string;
  campaignId?: number;
  direction: "outbound";
};

const pending = new Map<string, OutboundStash>();
const TTL_MS = 15 * 60 * 1000;

export function stashOutboundCallContext(sessionId: string, data: { script?: string; campaignId?: number }): void {
  pending.set(sessionId, {
    direction: "outbound",
    script: data.script?.trim() || undefined,
    campaignId: data.campaignId,
  });
  setTimeout(() => pending.delete(sessionId), TTL_MS);
}

/** Consume and remove stashed outbound context (call once per session). */
export function takeOutboundCallContext(sessionId: string): OutboundStash | undefined {
  const v = pending.get(sessionId);
  if (v) pending.delete(sessionId);
  return v;
}
