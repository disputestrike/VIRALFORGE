/**
 * LLM Router — Anthropic Claude only (all ApexAI LLM traffic).
 * chooseRoute() is used for analytics / logging (fast vs smart intent), not provider selection.
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

function defaultRouterModel(): string {
  return (
    process.env.CLAUDE_MODEL ||
    process.env.LLM_MODEL ||
    "claude-haiku-4-5-20251001"
  ).trim();
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

// ── Claude (only path) ────────────────────────────────────────────────────────

async function callClaude(messages: RouterMessage[], maxTokens = 200): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) throw new Error("ANTHROPIC_API_KEY not set");

  const client = new Anthropic({ apiKey });
  const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
  const chatMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const model = defaultRouterModel();
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    temperature: 0.3,
    system: systemMsg,
    messages: chatMessages,
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
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
  const text = await callClaude(messages, 512);
  console.log(
    `[LLM:Claude] route=${semanticRoute} model=${defaultRouterModel()} "${text.slice(0, 60)}" (${Date.now() - t0}ms)`
  );
  return {
    text,
    route: semanticRoute === "smart" ? "smart" : "fast",
    latencyMs: Date.now() - t0,
  };
}

export default { routedLLMCall, chooseRoute };
