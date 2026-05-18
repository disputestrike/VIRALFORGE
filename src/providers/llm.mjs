import { config } from "../config.mjs";

export async function generateWithLLM({ system, prompt, fallback, json = true }) {
  if (!config.providers.cerebrasApiKey) {
    return { provider: "deterministic_fallback", output: fallback };
  }

  const response = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.providers.cerebrasApiKey}`,
    },
    body: JSON.stringify({
      model: process.env.CEREBRAS_MODEL || "llama3.1-8b",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      response_format: json ? { type: "json_object" } : undefined,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return { provider: "cerebras_error_fallback", output: fallback, error: text };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  if (!json) return { provider: "cerebras", output: content };

  try {
    return { provider: "cerebras", output: JSON.parse(content) };
  } catch {
    return { provider: "cerebras_parse_fallback", output: fallback, raw: content };
  }
}
