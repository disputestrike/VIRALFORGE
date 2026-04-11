/**
 * LLM Router — Cerebras only.
 *
 * We still keep a semantic "fast" vs "smart" label for analytics,
 * but both routes use the same Cerebras provider and model family.
 */

import { cerebrasChatCompletion } from "../cerebras";

export type LLMRoute = "fast" | "smart";
export type LLMProvider = "cerebras";

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
  _turnHistory: Array<{ role: string; content: string }>,
  objectionCount: number
): LLMRoute {
  const text = transcript.toLowerCase();

  if (objectionCount > 0) return "smart";
  if (OBJECTION_KEYWORDS.some((keyword) => text.includes(keyword))) return "smart";
  if (COMPLEX_KEYWORDS.some((keyword) => text.includes(keyword))) return "smart";
  if (transcript.length > 150) return "smart";
  if ((transcript.match(/\?/g) ?? []).length >= 2) return "smart";
  if (/\b(angry|upset|frustrated|annoyed|ridiculous|terrible|awful|hate)\b/i.test(transcript)) {
    return "smart";
  }

  return "fast";
}

export async function routedLLMCall(
  messages: RouterMessage[],
  transcript: string,
  turnHistory: Array<{ role: string; content: string }>,
  objectionCount = 0
): Promise<LLMResponse> {
  const semanticRoute = chooseRoute(transcript, turnHistory, objectionCount);
  const startedAt = Date.now();

  const { text, model } = await cerebrasChatCompletion({
    messages,
    maxTokens: semanticRoute === "smart" ? 700 : 420,
    temperature: semanticRoute === "smart" ? 0.18 : 0.12,
  });

  const latencyMs = Date.now() - startedAt;
  console.log(
    `[LLM:cerebras] route=${semanticRoute} model=${model} "${text.slice(0, 60)}" (${latencyMs}ms)`
  );

  return {
    text,
    route: semanticRoute,
    latencyMs,
    provider: "cerebras",
  };
}

export default { routedLLMCall, chooseRoute };
