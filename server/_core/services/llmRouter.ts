/**
 * LLM Router — Multi-provider with intelligent routing.
 *
 * Provider selection (LLM_PROVIDER env var):
 *   groq       (default) — llama-3.1-8b-instant via OpenAI-compatible Groq API
 *   anthropic  — Claude claude-3-5-haiku (complex reasoning, tool-heavy flows)
 *
 * Legacy: LLM_PROVIDER=cerebras is treated as groq (Cerebras removed from codebase).
 *
 * chooseRoute() determines semantic label (fast vs smart) for analytics/logging.
 */

import OpenAI from "openai";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LLMRoute = "fast" | "smart";
export type LLMProvider = "anthropic" | "groq";

export interface RouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  text: string;
  route: LLMRoute;
  latencyMs: number;
  provider: LLMProvider;
}

function normalizeLlmProviderPref(raw: string): LLMProvider | "" {
  const p = raw.trim().toLowerCase();
  if (p === "cerebras") return "groq";
  if (p === "groq" || p === "anthropic") return p as LLMProvider;
  return "";
}

function defaultRouterModel(provider: LLMProvider): string {
  if (provider === "anthropic") {
    return (process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-20241022").trim();
  }
  return (process.env.GROQ_MODEL || "llama-3.1-8b-instant").trim();
}

/** Resolve active LLM provider. Prefers LLM_PROVIDER env, then auto-detects by available keys. */
function resolveProvider(override?: LLMProvider): LLMProvider {
  const prefRaw = (override || process.env.LLM_PROVIDER || "").trim();
  const pref = normalizeLlmProviderPref(prefRaw);
  if (pref === "anthropic" && process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  if (pref === "groq" && process.env.GROQ_API_KEY?.trim()) return "groq";
  if (process.env.GROQ_API_KEY?.trim()) return "groq";
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  return "groq";
}

// ── Routing Logic (semantic label only) ───────────────────────────────────────

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

  if (objectionCount > 0) return "smart";
  if (OBJECTION_KEYWORDS.some((k) => t.includes(k))) return "smart";
  if (COMPLEX_KEYWORDS.some((k) => t.includes(k))) return "smart";
  if (transcript.length > 150) return "smart";
  if ((transcript.match(/\?/g) ?? []).length >= 2) return "smart";
  if (/\b(angry|upset|frustrated|annoyed|ridiculous|terrible|awful|hate)\b/i.test(transcript)) {
    return "smart";
  }

  return "fast";
}

// ── Groq (OpenAI-compatible) ──────────────────────────────────────────────────

async function callGroq(messages: RouterMessage[], maxTokens = 200): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const client = new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
  const model = defaultRouterModel("groq");

  const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
  const chatMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const response = await client.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature: 0.3,
    messages: [
      ...(systemMsg ? [{ role: "system" as const, content: systemMsg }] : []),
      ...chatMessages,
    ],
  });

  return (response.choices?.[0]?.message?.content ?? "").trim();
}

// ── Anthropic Claude ──────────────────────────────────────────────────────────

async function callAnthropic(messages: RouterMessage[], maxTokens = 400): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });
  const model = defaultRouterModel("anthropic");

  const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
  const chatMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemMsg || undefined,
    messages: chatMessages,
  });

  const block = response.content?.[0];
  return (block && "text" in block ? block.text : "").trim();
}

// ── Main Router ───────────────────────────────────────────────────────────────

export async function routedLLMCall(
  messages: RouterMessage[],
  transcript: string,
  turnHistory: Array<{ role: string; content: string }>,
  objectionCount = 0,
  providerOverride?: LLMProvider
): Promise<LLMResponse> {
  const semanticRoute = chooseRoute(transcript, turnHistory, objectionCount);
  const wantProvider: LLMProvider =
    providerOverride ??
    (semanticRoute === "smart" && process.env.ANTHROPIC_API_KEY?.trim()
      ? "anthropic"
      : resolveProvider());

  const provider = resolveProvider(wantProvider);
  const t0 = Date.now();
  let text = "";

  try {
    if (provider === "anthropic") {
      text = await callAnthropic(messages, 512);
    } else {
      text = await callGroq(messages, 512);
    }
  } catch (err: any) {
    const tried = new Set([provider]);
    for (const fallback of ["groq", "anthropic"] as LLMProvider[]) {
      if (tried.has(fallback)) continue;
      const hasFallbackKey =
        fallback === "anthropic"
          ? Boolean(process.env.ANTHROPIC_API_KEY?.trim())
          : Boolean(process.env.GROQ_API_KEY?.trim());
      if (!hasFallbackKey) continue;
      console.warn(`[LLM:Router] ${provider} failed (${err.message}) — falling back to ${fallback}`);
      try {
        if (fallback === "anthropic") text = await callAnthropic(messages, 512);
        else text = await callGroq(messages, 512);
        console.log(`[LLM:${fallback}] fallback success route=${semanticRoute} (${Date.now() - t0}ms)`);
        return {
          text,
          route: semanticRoute === "smart" ? "smart" : "fast",
          latencyMs: Date.now() - t0,
          provider: fallback,
        };
      } catch {
        tried.add(fallback);
      }
    }
    throw err;
  }

  const model = defaultRouterModel(provider);
  console.log(
    `[LLM:${provider}] route=${semanticRoute} model=${model} "${text.slice(0, 60)}" (${Date.now() - t0}ms)`
  );
  return {
    text,
    route: semanticRoute === "smart" ? "smart" : "fast",
    latencyMs: Date.now() - t0,
    provider,
  };
}

export default { routedLLMCall, chooseRoute };
