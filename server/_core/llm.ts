/**
 * LLM — Groq or xAI Grok (OpenAI-compatible chat/completions).
 * Groq: GROQ_API_KEY, GROQ_MODEL
 * xAI:  LLM_PROVIDER=xai, XAI_API_KEY, XAI_MODEL, optional XAI_BASE_URL (default https://api.x.ai/v1)
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

function llmProviderNorm(): string {
  const p = (process.env.LLM_PROVIDER ?? "groq").trim().toLowerCase();
  if (p === "cerebras") return "groq";
  if (p === "grok") return "xai";
  return p;
}

/** True when invokeLLM() can run for the current LLM_PROVIDER + keys. */
export function isLlmConfigured(): boolean {
  const p = llmProviderNorm();
  if (p === "xai") return Boolean((process.env.XAI_API_KEY ?? "").trim());
  return Boolean((process.env.GROQ_API_KEY ?? "").trim());
}

function makeGroqClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, baseURL: "https://api.groq.com/openai/v1" });
}

function makeXaiClient(apiKey: string, baseUrl: string): OpenAI {
  return new OpenAI({ apiKey, baseURL: baseUrl });
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const provider = llmProviderNorm();
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

  const apiMessages = [
    ...(systemPrompt?.trim() ? [{ role: "system" as const, content: systemPrompt }] : []),
    ...messages,
  ];

  if (provider === "xai") {
    const apiKey = (process.env.XAI_API_KEY ?? "").trim();
    if (!apiKey) throw new Error("XAI_API_KEY not configured (set LLM_PROVIDER=xai and XAI_API_KEY)");
    const baseUrl = (process.env.XAI_BASE_URL ?? "https://api.x.ai/v1").replace(/\/$/, "");
    const model = (params.model || process.env.XAI_MODEL || "grok-3-latest").trim();
    const client = makeXaiClient(apiKey, baseUrl);
    const run = () =>
      client.chat.completions.create({
        model,
        max_tokens: Math.max(64, maxTokens),
        messages: apiMessages,
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
        console.warn("[xAI] Rate limit — retrying once after short delay");
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

  const apiKey = (process.env.GROQ_API_KEY ?? "").trim();
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  const model = (params.model || process.env.GROQ_MODEL || "llama-3.1-8b-instant").trim();
  const client = makeGroqClient(apiKey);

  const run = () =>
    client.chat.completions.create({
      model,
      max_tokens: Math.max(64, maxTokens),
      messages: apiMessages,
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
