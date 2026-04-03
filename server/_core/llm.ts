/**
 * LLM — Cerebras (OpenAI-compatible API). 5-key round-robin.
 * Set CEREBRAS_API_KEY_1 through CEREBRAS_API_KEY_5.
 * Model: CEREBRAS_MODEL or default llama-3.3-70b.
 */

import OpenAI from "openai";
import { getCerebrasKey, rotateCerebrasKey } from "./cerebrasKeyManager";

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

/** True when Cerebras is configured (scripts, AI search, templates, etc.). */
export function isLlmConfigured(): boolean {
  return [
    process.env.CEREBRAS_API_KEY,
    process.env.CEREBRAS_API_KEY_1,
    process.env.CEREBRAS_API_KEY_2,
    process.env.CEREBRAS_API_KEY_3,
    process.env.CEREBRAS_API_KEY_4,
    process.env.CEREBRAS_API_KEY_5,
  ].some(k => (k ?? "").trim().length > 0);
}

function makeCerebrasClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, baseURL: "https://api.cerebras.ai/v1" });
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = getCerebrasKey();

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

  const model =
    (params.model || process.env.CEREBRAS_MODEL || "llama-3.3-70b").trim();

  const client = makeCerebrasClient(apiKey);

  try {
    const response = await client.chat.completions.create({
      model,
      max_tokens: Math.max(64, maxTokens),
      messages: [
        ...(systemPrompt?.trim() ? [{ role: "system" as const, content: systemPrompt }] : []),
        ...messages,
      ],
    });

    const textContent = response.choices?.[0]?.message?.content ?? "";
    return {
      choices: [{ message: { role: "assistant", content: textContent } }],
    };
  } catch (e: any) {
    // On rate limit (429), rotate key and retry once
    if (e?.status === 429 || e?.message?.includes("429") || e?.message?.includes("rate")) {
      console.warn("[Cerebras] Rate limit hit — rotating key and retrying");
      rotateCerebrasKey();
      const retryKey = getCerebrasKey();
      const retryClient = makeCerebrasClient(retryKey);
      const response = await retryClient.chat.completions.create({
        model,
        max_tokens: Math.max(64, maxTokens),
        messages: [
          ...(systemPrompt?.trim() ? [{ role: "system" as const, content: systemPrompt }] : []),
          ...messages,
        ],
      });
      const textContent = response.choices?.[0]?.message?.content ?? "";
      return {
        choices: [{ message: { role: "assistant", content: textContent } }],
      };
    }
    throw e;
  }
}

export default { invokeLLM, isLlmConfigured };
