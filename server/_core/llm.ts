/**
 * LLM — Anthropic Claude
 * Uses @anthropic-ai/sdk directly. Set ANTHROPIC_API_KEY in Railway Variables.
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

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured — add it to Railway Variables");
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const client = getClient();

  const model = params.model || process.env.LLM_MODEL || "claude-3-5-sonnet-20241022";
  const maxTokens = params.maxTokens || parseInt(process.env.LLM_MAX_TOKENS || "4096");

  // Separate system messages from conversation messages
  const systemMessages = params.messages.filter(m => m.role === "system");
  const conversationMessages = params.messages.filter(m => m.role !== "system");

  // Build system prompt — combine all system messages
  const systemPrompt = params.systemPrompt
    || (systemMessages.length > 0 ? systemMessages.map(m => m.content).join("\n\n") : undefined);

  // Anthropic requires at least one user message
  const messages: Anthropic.MessageParam[] = conversationMessages.length > 0
    ? conversationMessages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
    : [{ role: "user", content: "Hello" }];

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages,
  });

  // Normalize to the same shape the rest of the app expects
  const textContent = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map(b => b.text)
    .join("");

  return {
    choices: [{
      message: {
        role: "assistant",
        content: textContent,
      },
    }],
  };
}

export default { invokeLLM };
