import { ENV } from "./env";

export type CerebrasRole = "system" | "user" | "assistant";

export type CerebrasMessage = {
  role: CerebrasRole;
  content: string;
};

export type CerebrasChatParams = {
  messages: CerebrasMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
};

const CEREBRAS_CHAT_COMPLETIONS_PATH = "/chat/completions";

let cerebrasKeyCursor = 0;

function configuredCerebrasKeys(): string[] {
  return ENV.cerebrasApiKeys;
}

function nextCerebrasKey(tried: Set<string>): string {
  const keys = configuredCerebrasKeys().filter((key) => !tried.has(key));
  if (!keys.length) {
    throw new Error("No Cerebras API keys configured");
  }
  const selected = keys[cerebrasKeyCursor % keys.length]!;
  cerebrasKeyCursor = (cerebrasKeyCursor + 1) % Math.max(1, keys.length);
  tried.add(selected);
  return selected;
}

function normalizeContent(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("");
  }
  return "";
}

function buildRequestBody(params: CerebrasChatParams, stream: boolean) {
  return {
    model: params.model?.trim() || ENV.cerebrasModel,
    messages: params.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    max_tokens: params.maxTokens ?? 512,
    temperature: params.temperature ?? 0.2,
    stream,
  };
}

async function readErrorText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text.trim();
  } catch {
    return "";
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

async function requestCerebras(
  params: CerebrasChatParams,
  stream: boolean
): Promise<{ response: Response; model: string }> {
  const keys = configuredCerebrasKeys();
  if (!keys.length) {
    throw new Error("CEREBRAS_API_KEY not configured");
  }

  const body = buildRequestBody(params, stream);
  const tried = new Set<string>();
  let lastError = "Cerebras request failed";

  while (tried.size < keys.length) {
    const apiKey = nextCerebrasKey(tried);
    const response = await fetch(`${ENV.cerebrasBaseUrl}${CEREBRAS_CHAT_COMPLETIONS_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: params.signal,
    });

    if (response.ok) {
      return { response, model: body.model };
    }

    const detail = await readErrorText(response);
    lastError = `Cerebras request failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`;
    console.warn(`[Cerebras] ${lastError}`);
    if (!isRetryableStatus(response.status) || tried.size >= keys.length) {
      throw new Error(lastError);
    }
  }

  throw new Error(lastError);
}

export async function cerebrasChatCompletion(
  params: CerebrasChatParams
): Promise<{ text: string; model: string }> {
  const { response, model } = await requestCerebras(params, false);
  const json = await response.json();
  const text = normalizeContent(json?.choices?.[0]?.message?.content).trim();
  return { text, model };
}

export async function cerebrasChatCompletionStream(
  params: CerebrasChatParams
): Promise<{ stream: AsyncGenerator<string, void, void>; model: string }> {
  const { response, model } = await requestCerebras(params, true);
  const body = response.body;
  if (!body) {
    throw new Error("Cerebras streaming response missing body");
  }
  const streamBody = body;

  async function* parseStream(): AsyncGenerator<string, void, void> {
    const reader = streamBody.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const boundary = buffer.indexOf("\n\n");
        if (boundary === -1) break;
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        for (const line of rawEvent.split(/\r?\n/)) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") return;
          try {
            const json = JSON.parse(payload);
            const text = normalizeContent(json?.choices?.[0]?.delta?.content);
            if (text) yield text;
          } catch (error) {
            console.warn("[Cerebras] Failed to parse streaming chunk:", error);
          }
        }
      }
    }
  }

  return { stream: parseStream(), model };
}
