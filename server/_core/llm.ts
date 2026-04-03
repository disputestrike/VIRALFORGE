/**
 * LLM — xAI Grok (OpenAI-compatible API). Set XAI_API_KEY (required).
 * Model: GROK_MODEL or default grok-3-fast.
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

let _xaiClient: OpenAI | null = null;

/** True when Grok/xAI is configured (scripts, AI search, templates, etc.). */
export function isLlmConfigured(): boolean {
  return !!(process.env.XAI_API_KEY ?? "").trim();
}

function getXaiClient(): OpenAI {
  if (!_xaiClient) {
    const apiKey = (process.env.XAI_API_KEY ?? "").trim();
    if (!apiKey) throw new Error("XAI_API_KEY is required");
    _xaiClient = new OpenAI({ apiKey, baseURL: "https://api.x.ai/v1" });
  }
  return _xaiClient;
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = (process.env.XAI_API_KEY ?? "").trim();
  if (!apiKey) {
    throw new Error("XAI_API_KEY is required — ApexAI uses xAI Grok for LLM calls.");
  }

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

  const client = getXaiClient();
  const model =
    (params.model || process.env.GROK_MODEL || process.env.LLM_MODEL || "grok-3-fast").trim();

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
}

export default { invokeLLM, isLlmConfigured };
