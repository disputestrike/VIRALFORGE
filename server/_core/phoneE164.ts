/**
 * Normalize US-style numbers for SignalWire SMS/voice (E.164).
 * Handles values like "+1 (833) 659-6005" from Railway.
 */
export function normalizeToE164US(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const d = t.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  if (d.length === 10) return `+1${d}`;
  if (t.startsWith("+") && d.length >= 10) return `+${d}`;
  return t.replace(/\s+/g, "");
}
