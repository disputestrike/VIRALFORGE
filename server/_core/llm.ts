/**
 * LLM — Groq (OpenAI-compatible API).
 * Set GROQ_API_KEY. Model: GROQ_MODEL or default llama-3.1-8b-instant.
 */

import OpenAI from "openai";

export type Role = "system" | "user" | "assistant";

export type Message = {
  role: Role;
  content: string;
  name?: string;
};

export type InvokeParams = {
  messages: Message[];
  maxTokens?: number;
  model?: string;
  systemPrompt?: string;
};

export type InvokeResult = {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
};

/** True when Groq is configured (scripts, AI search, templates, summaries, etc.). */
export function isLlmConfigured(): boolean {
  return Boolean((process.env.GROQ_API_KEY ?? "").trim());
}

function makeGroqClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = (process.env.GROQ_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const maxTokens = Math.min(
    params.maxTokens ?? parseInt(process.env.LLM_MAX_TOKENS || "2048", 10),
    4096
  );

  const systemMessages = params.messages.filter((m) => m.role === "system");
  const conversationMessages = params.messages.filter((m) => m.role !== "system");
  const systemPrompt =
    params.systemPrompt ||
    (systemMessages.length > 0 ? systemMessages.map((m) => m.content).join("\n\n") : undefined);

  const messages =
    conversationMessages.length > 0
      ? conversationMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      : [{ role: "user" as const, content: "Hello" }];

  const model = (params.model || process.env.GROQ_MODEL || "llama-3.1-8b-instant").trim();

  const client = makeGroqClient(apiKey);

  const run = () =>
    client.chat.completions.create({
      model,
      max_tokens: Math.max(64, maxTokens),
      messages: [
        ...(systemPrompt?.trim() ? [{ role: "system" as const, content: systemPrompt }] : []),
        ...messages,
      ],
    });

  try {
    const response = await run();
    const textContent = response.choices?.[0]?.message?.content ?? "";
    return {
      choices: [{ message: { role: "assistant", content: textContent } }],
    };
  } catch (e: any) {
    if (
      e?.status === 429 ||
      e?.message?.includes("429") ||
      e?.message?.includes("rate") ||
      e?.message?.includes("too_many_requests")
    ) {
      console.warn("[Groq] Rate limit — retrying once after short delay");
      await new Promise((r) => setTimeout(r, 600));
      const response = await run();
      const textContent = response.choices?.[0]?.message?.content ?? "";
      return {
        choices: [{ message: { role: "assistant", content: textContent } }],
      };
    }
    throw e;
  }
}

export default { invokeLLM, isLlmConfigured };
