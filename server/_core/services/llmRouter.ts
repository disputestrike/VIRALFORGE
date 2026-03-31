/**
 * LLM Router — Cerebras-first for voice/SMS-style routing helpers
 * Default: all traffic uses the Cerebras key pool (rotation + cooldown).
 * Revert: set LLM_ALLOW_ANTHROPIC_FALLBACK=true and ANTHROPIC_API_KEY.
 *
 * chooseRoute() remains for analytics / future tuning; routedLLMCall does not
 * send traffic to Claude unless fallback is enabled.
 */

import Anthropic from "@anthropic-ai/sdk";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LLMRoute = "fast" | "smart";

export interface RouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  text: string;
  route: LLMRoute;
  latencyMs: number;
}

// ── Routing Logic ─────────────────────────────────────────────────────────────

const OBJECTION_KEYWORDS = [
  "too expensive", "cost too much", "not interested", "call me later",
  "send me something", "is this legit", "who are you", "how did you get my number",
  "i already have", "stop calling", "remove me", "do not call", "busy right now",
  "not now", "don't trust", "scam", "rip off", "compare", "what makes you different",
  "why should i", "prove it", "show me proof", "i need to think", "call back",
];

const COMPLEX_KEYWORDS = [
  "how does this work", "tell me more", "walk me through", "explain",
  "guarantee", "contract", "commitment", "how long", "what happens if",
  "integration", "implementation", "customiz", "specific",
];

export function chooseRoute(
  transcript: string,
  turnHistory: Array<{ role: string; content: string }>,
  objectionCount: number
): LLMRoute {
  const t = transcript.toLowerCase();

  // Always smart if prior objections in this call
  if (objectionCount > 0) return "smart";

  // Objection detected
  if (OBJECTION_KEYWORDS.some(k => t.includes(k))) return "smart";

  // Complex sales question
  if (COMPLEX_KEYWORDS.some(k => t.includes(k))) return "smart";

  // Long response = complex
  if (transcript.length > 150) return "smart";

  // Multiple questions
  if ((transcript.match(/\?/g) ?? []).length >= 2) return "smart";

  // Negative sentiment signals
  if (/\b(angry|upset|frustrated|annoyed|ridiculous|terrible|awful|hate)\b/i.test(transcript)) {
    return "smart";
  }

  return "fast";
}

// ── Cerebras Key Pool — round-robin + cooldown on rate limit ─────────────────

interface KeySlot {
  key: string;
  index: number;
  cooldownUntil: number; // epoch ms, 0 = available
  requestCount: number;
  errorCount: number;
}

class CerebrasKeyPool {
  private slots: KeySlot[] = [];
  private cursor = 0; // round-robin pointer

  constructor() {
    this.loadKeys();
  }

  private loadKeys(): void {
    // Load up to 10 keys: CEREBRAS_API_KEY_1 ... CEREBRAS_API_KEY_10
    // Also accept legacy CEREBRAS_API_KEY as key #1 fallback
    const keys: string[] = [];

    for (let i = 1; i <= 10; i++) {
      const k = process.env[`CEREBRAS_API_KEY_${i}`];
      if (k?.trim()) keys.push(k.trim());
    }

    // Fallback: single key
    if (keys.length === 0 && process.env.CEREBRAS_API_KEY) {
      keys.push(process.env.CEREBRAS_API_KEY.trim());
    }

    this.slots = keys.map((key, i) => ({
      key,
      index: i,
      cooldownUntil: 0,
      requestCount: 0,
      errorCount: 0,
    }));

    if (this.slots.length > 0) {
      console.log(`[Cerebras] Key pool initialized: ${this.slots.length} key(s)`);
    }
  }

  hasKeys(): boolean {
    return this.slots.length > 0;
  }

  /** Get next available key using round-robin, skipping cooling-down keys */
  private nextAvailableSlot(): KeySlot | null {
    const now = Date.now();
    const total = this.slots.length;
    for (let i = 0; i < total; i++) {
      const slot = this.slots[(this.cursor + i) % total];
      if (slot.cooldownUntil <= now) {
        this.cursor = (this.cursor + i + 1) % total;
        return slot;
      }
    }
    // All keys cooling — find the one that comes back soonest
    const soonest = this.slots.reduce((a, b) => a.cooldownUntil < b.cooldownUntil ? a : b);
    const wait = Math.max(0, soonest.cooldownUntil - now);
    if (wait > 0) console.warn(`[Cerebras] All keys cooling — waiting ${wait}ms`);
    return soonest;
  }

  /** Mark a key as rate-limited — cool it down for 60s */
  private coolDown(slot: KeySlot, seconds = 60): void {
    slot.cooldownUntil = Date.now() + seconds * 1000;
    slot.errorCount++;
    console.warn(`[Cerebras] Key #${slot.index + 1} cooling for ${seconds}s (errors: ${slot.errorCount})`);
  }

  /** Call Cerebras with automatic key rotation and retry */
  async call(messages: RouterMessage[], maxTokens = 120): Promise<string> {
    const model = process.env.CEREBRAS_MODEL || "gpt-oss-120b";
    const maxAttempts = Math.min(this.slots.length, 5);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const slot = this.nextAvailableSlot();
      if (!slot) throw new Error("No Cerebras keys available");

      // Wait if key is cooling
      const wait = Math.max(0, slot.cooldownUntil - Date.now());
      if (wait > 0 && wait < 5000) await new Promise(r => setTimeout(r, wait));

      try {
        const t0 = Date.now();
        const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${slot.key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.35, stream: false }),
          signal: AbortSignal.timeout(8000), // 8s timeout
        });

        if (response.status === 429) {
          // Rate limited — cool this key and try next
          const retryAfter = parseInt(response.headers.get("retry-after") || "60");
          this.coolDown(slot, retryAfter);
          console.warn(`[Cerebras] Key #${slot.index + 1} rate limited (429) — trying next key`);
          continue;
        }

        if (response.status === 401 || response.status === 403) {
          // Bad key — cool for 10 minutes
          this.coolDown(slot, 600);
          console.error(`[Cerebras] Key #${slot.index + 1} auth failed (${response.status})`);
          continue;
        }

        if (!response.ok) {
          const err = await response.text();
          throw new Error(`Cerebras ${response.status}: ${err}`);
        }

        const data = await response.json() as any;
        const text = data.choices?.[0]?.message?.content ?? "";
        slot.requestCount++;
        console.log(`[Cerebras] Key #${slot.index + 1} responded in ${Date.now()-t0}ms (requests: ${slot.requestCount})`);
        return text;

      } catch (err: any) {
        // Timeout or network error — brief cooldown, try next key
        if (err?.name === "TimeoutError" || err?.code === "UND_ERR_CONNECT_TIMEOUT") {
          this.coolDown(slot, 30);
          console.warn(`[Cerebras] Key #${slot.index + 1} timed out — trying next key`);
          continue;
        }
        throw err;
      }
    }

    throw new Error(`All ${maxAttempts} Cerebras keys exhausted or rate-limited`);
  }

  /** Stream from Cerebras with key rotation */
  async stream(messages: RouterMessage[], maxTokens = 120): Promise<Response> {
    const model = process.env.CEREBRAS_MODEL || "gpt-oss-120b";
    const maxAttempts = Math.min(this.slots.length, 5);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const slot = this.nextAvailableSlot();
      if (!slot) throw new Error("No Cerebras keys available");

      const wait = Math.max(0, slot.cooldownUntil - Date.now());
      if (wait > 0 && wait < 5000) await new Promise(r => setTimeout(r, wait));

      try {
        const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${slot.key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.35, stream: true }),
          signal: AbortSignal.timeout(10000),
        });

        if (response.status === 429) {
          const retryAfter = parseInt(response.headers.get("retry-after") || "60");
          this.coolDown(slot, retryAfter);
          console.warn(`[Cerebras] Key #${slot.index + 1} rate limited (stream) — trying next`);
          continue;
        }

        if (response.status === 401 || response.status === 403) {
          this.coolDown(slot, 600);
          continue;
        }

        if (!response.ok) {
          const err = await response.text();
          throw new Error(`Cerebras stream ${response.status}: ${err}`);
        }

        slot.requestCount++;
        console.log(`[Cerebras] Key #${slot.index + 1} streaming (requests: ${slot.requestCount})`);
        return response;

      } catch (err: any) {
        if (err?.name === "TimeoutError") {
          this.coolDown(slot, 30);
          continue;
        }
        throw err;
      }
    }

    throw new Error(`All Cerebras stream keys exhausted`);
  }

  /** Log current pool status */
  status(): object {
    const now = Date.now();
    return this.slots.map(s => ({
      key: `key_${s.index + 1}`,
      available: s.cooldownUntil <= now,
      cooldownSec: s.cooldownUntil > now ? Math.ceil((s.cooldownUntil - now) / 1000) : 0,
      requests: s.requestCount,
      errors: s.errorCount,
    }));
  }
}

// Singleton pool — shared across all calls in this process
const cerebrasPool = new CerebrasKeyPool();

async function callCerebras(messages: RouterMessage[], maxTokens = 120): Promise<string> {
  if (!cerebrasPool.hasKeys()) throw new Error("No CEREBRAS_API_KEY_1..5 configured");
  return cerebrasPool.call(messages, maxTokens);
}

// Export pool for use in streaming pipeline
export { cerebrasPool };

/** Get current pool status — useful for health checks */
export function getCerebrasPoolStatus(): object {
  return cerebrasPool.status();
}

// ── Claude Smart Path ─────────────────────────────────────────────────────────

async function callClaude(
  messages: RouterMessage[],
  maxTokens = 200
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });

  // Extract system message
  const systemMsg = messages.find(m => m.role === "system")?.content ?? "";
  const chatMessages = messages
    .filter(m => m.role !== "system")
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL || "claude-opus-4-5",
    max_tokens: maxTokens,
    temperature: 0.3,
    system: systemMsg,
    messages: chatMessages,
  });

  return response.content
    .map((c: any) => ("text" in c ? c.text : ""))
    .join(" ")
    .trim();
}

// ── Main Router ───────────────────────────────────────────────────────────────

export async function routedLLMCall(
  messages: RouterMessage[],
  transcript: string,
  turnHistory: Array<{ role: string; content: string }>,
  objectionCount = 0
): Promise<LLMResponse> {
  const semanticRoute = chooseRoute(transcript, turnHistory, objectionCount);
  const t0 = Date.now();
  const allowAnthropic =
    process.env.LLM_ALLOW_ANTHROPIC_FALLBACK === "true" &&
    !!(process.env.ANTHROPIC_API_KEY ?? "").trim();

  if (cerebrasPool.hasKeys()) {
    try {
      const text = await callCerebras(messages);
      console.log(
        `[LLM:Cerebras] route=${semanticRoute} "${text.slice(0, 60)}" (${Date.now() - t0}ms)`
      );
      return { text, route: "fast", latencyMs: Date.now() - t0 };
    } catch (err) {
      console.warn("[LLM:Cerebras] failed:", err);
      if (!allowAnthropic) throw err;
    }
  }

  if (allowAnthropic) {
    const text = await callClaude(messages);
    console.log(`[LLM:Claude:fallback] "${text.slice(0, 60)}" (${Date.now() - t0}ms)`);
    return { text, route: "smart", latencyMs: Date.now() - t0 };
  }

  throw new Error(
    "No Cerebras keys (CEREBRAS_API_KEY_1.. or CEREBRAS_API_KEY). " +
      "Set LLM_ALLOW_ANTHROPIC_FALLBACK=true with ANTHROPIC_API_KEY to use Claude."
  );
}

export default { routedLLMCall, chooseRoute };
