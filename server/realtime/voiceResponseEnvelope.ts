/**
 * Optional Grok JSON envelope (roadmap WS5 / Phase 6) — when model returns JSON with spoken text only.
 * Enable with `VOICE_GROK_JSON_ENVELOPE=true` and system prompt instructing `{"spoken_text":"..."}`.
 */

export function tryExtractJsonSpokenText(fullText: string): string | null {
  const t = fullText.trim();
  if (!t.startsWith("{") && !t.includes('"spoken_text"')) return null;
  let candidate = t;
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence) candidate = fence[1]!.trim();
  try {
    const j = JSON.parse(candidate) as { spoken_text?: unknown };
    if (typeof j.spoken_text === "string" && j.spoken_text.trim()) {
      return j.spoken_text.trim();
    }
  } catch {
    /* not JSON */
  }
  return null;
}
