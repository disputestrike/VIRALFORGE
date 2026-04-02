/**
 * LLM — Anthropic Claude only. Set ANTHROPIC_API_KEY (required).
 * Model: LLM_MODEL, or CLAUDE_MODEL, or default Haiku 4.5.
 */

import Anthropic from "@anthropic-ai/sdk";

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

let _anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey?.trim()) throw new Error("ANTHROPIC_API_KEY is required");
    _anthropicClient = new Anthropic({ apiKey });
  }
  return _anthropicClient;
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("ANTHROPIC_API_KEY is required — ApexAI uses Claude (Anthropic) for all LLM calls.");
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

  const client = getAnthropicClient();
  const model =
    params.model ||
    process.env.LLM_MODEL ||
    process.env.CLAUDE_MODEL ||
    "claude-haiku-4-5-20251001";

  const response = await client.messages.create({
    model,
    max_tokens: Math.max(64, maxTokens),
    ...(systemPrompt?.trim() ? { system: systemPrompt } : {}),
    messages,
  });

  const textContent = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  return {
    choices: [{ message: { role: "assistant", content: textContent } }],
  };
}

export default { invokeLLM };
