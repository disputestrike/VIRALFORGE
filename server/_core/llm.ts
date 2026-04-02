/**
 * LLM — prefers Cerebras when keys exist; otherwise uses Anthropic if ANTHROPIC_API_KEY is set.
 * When Cerebras keys exist but a call fails, set LLM_ALLOW_ANTHROPIC_FALLBACK=true to use Claude.
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
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set (fallback)");
    _anthropicClient = new Anthropic({ apiKey });
  }
  return _anthropicClient;
}

async function invokeAnthropicFallback(params: InvokeParams): Promise<InvokeResult> {
  const client = getAnthropicClient();
  const model = params.model || process.env.LLM_MODEL || "claude-haiku-4-5-20251001";
  const maxTokens = params.maxTokens || parseInt(process.env.LLM_MAX_TOKENS || "4096", 10);

  const systemMessages = params.messages.filter(m => m.role === "system");
  const conversationMessages = params.messages.filter(m => m.role !== "system");
  const systemPrompt = params.systemPrompt
    || (systemMessages.length > 0 ? systemMessages.map(m => m.content).join("\n\n") : undefined);

  const messages = conversationMessages.length > 0
    ? conversationMessages.map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
    : [{ role: "user" as const, content: "Hello" }];

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    messages,
  });

  const textContent = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map(b => b.text)
    .join("");

  return {
    choices: [{ message: { role: "assistant", content: textContent } }],
  };
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const maxTokens = Math.min(
    params.maxTokens ?? parseInt(process.env.LLM_MAX_TOKENS || "2048", 10),
    4096
  );

  const systemMessages = params.messages.filter(m => m.role === "system");
  const conversationMessages = params.messages.filter(m => m.role !== "system");
  const systemPrompt = params.systemPrompt
    || (systemMessages.length > 0 ? systemMessages.map(m => m.content).join("\n\n") : "");

  type RMsg = { role: "system" | "user" | "assistant"; content: string };
  const routerMsgs: RMsg[] = [];
  if (systemPrompt.trim()) routerMsgs.push({ role: "system", content: systemPrompt });
  routerMsgs.push(
    ...conversationMessages.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))
  );
  if (!routerMsgs.some(m => m.role === "user")) {
    routerMsgs.push({ role: "user", content: "Hello" });
  }

  const { cerebrasPool } = await import("./services/llmRouter");

  if (cerebrasPool.hasKeys()) {
    try {
      const text = await cerebrasPool.call(routerMsgs, Math.max(64, maxTokens));
      return {
        choices: [{ message: { role: "assistant", content: text } }],
      };
    } catch (e) {
      console.error("[LLM] Cerebras invoke failed:", (e as Error).message);
      if (process.env.LLM_ALLOW_ANTHROPIC_FALLBACK === "true" && process.env.ANTHROPIC_API_KEY) {
        console.warn("[LLM] LLM_ALLOW_ANTHROPIC_FALLBACK — using Anthropic after Cerebras failure");
        return invokeAnthropicFallback(params);
      }
      throw e;
    }
  }

  if (process.env.ANTHROPIC_API_KEY) {
    console.warn("[LLM] No Cerebras keys — using Anthropic");
    return invokeAnthropicFallback(params);
  }

  throw new Error(
    "No LLM configured. Set CEREBRAS_API_KEY (or CEREBRAS_API_KEY_1..), or ANTHROPIC_API_KEY for Claude-only mode. " +
      "Optional: LLM_ALLOW_ANTHROPIC_FALLBACK=true to use Claude when Cerebras fails but keys exist."
  );
}

export default { invokeLLM };
