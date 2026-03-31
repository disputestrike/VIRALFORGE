/**
 * LLM Router — tiered inference for real-time voice
 * Fast path:  Cerebras (Llama 3.1 70B) — ~30-50ms for short replies
 * Smart path: Claude — objections, complex sales, emotional turns
 * 
 * Routing logic from the validated scaffold:
 * - Fast: greeting, yes/no, qualification, confirmations, FAQs
 * - Smart: objections, multi-question, sentiment negative, long turns, off-script
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

// ── Cerebras Fast Path ────────────────────────────────────────────────────────

async function callCerebras(
  messages: RouterMessage[],
  maxTokens = 120
): Promise<string> {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) throw new Error("CEREBRAS_API_KEY not set");

  const model = process.env.CEREBRAS_MODEL || "llama3.1-70b";

  const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.35,
      stream: false,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Cerebras error ${response.status}: ${err}`);
  }

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content ?? "";
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
  const hasCerebras = !!process.env.CEREBRAS_API_KEY;
  const route = hasCerebras
    ? chooseRoute(transcript, turnHistory, objectionCount)
    : "smart"; // No Cerebras = always use Claude

  const t0 = Date.now();

  if (route === "fast") {
    try {
      const text = await callCerebras(messages);
      console.log(`[LLM:Cerebras] "${text.slice(0, 60)}" (${Date.now()-t0}ms)`);
      return { text, route: "fast", latencyMs: Date.now() - t0 };
    } catch (err) {
      console.warn("[LLM:Cerebras] failed, falling back to Claude:", err);
      // Fall through to Claude
    }
  }

  const text = await callClaude(messages);
  console.log(`[LLM:Claude] "${text.slice(0, 60)}" (${Date.now()-t0}ms)`);
  return { text, route: "smart", latencyMs: Date.now() - t0 };
}

export default { routedLLMCall, chooseRoute };
