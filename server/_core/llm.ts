/**
 * LLM — Cerebras only.
 * Uses rotating API keys from CEREBRAS_API_KEY through CEREBRAS_API_KEY_5.
 */

import { cerebrasChatCompletion, type CerebrasMessage } from "./cerebras";

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

/** True when invokeLLM() can run for the current Cerebras configuration. */
export function isLlmConfigured(): boolean {
  return [
    process.env.CEREBRAS_API_KEY,
    process.env.CEREBRAS_API_KEY_2,
    process.env.CEREBRAS_API_KEY_3,
    process.env.CEREBRAS_API_KEY_4,
    process.env.CEREBRAS_API_KEY_5,
  ].some((value) => Boolean((value ?? "").trim()));
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const maxTokens = Math.min(
    params.maxTokens ?? parseInt(process.env.LLM_MAX_TOKENS || "2048", 10),
    4096
  );

  const systemMessages = params.messages.filter((message) => message.role === "system");
  const conversationMessages = params.messages.filter((message) => message.role !== "system");
  const systemPrompt =
    params.systemPrompt ||
    (systemMessages.length > 0 ? systemMessages.map((message) => message.content).join("\n\n") : undefined);

  const messages: CerebrasMessage[] = [
    ...(systemPrompt?.trim() ? [{ role: "system" as const, content: systemPrompt }] : []),
    ...(conversationMessages.length > 0
      ? conversationMessages.map((message) => ({
          role: message.role as "user" | "assistant",
          content: message.content,
        }))
      : [{ role: "user" as const, content: "Hello" }]),
  ];

  const { text } = await cerebrasChatCompletion({
    model: params.model,
    maxTokens: Math.max(64, maxTokens),
    temperature: 0.2,
    messages,
  });

  return {
    choices: [{ message: { role: "assistant", content: text } }],
  };
}

export default { invokeLLM, isLlmConfigured };
