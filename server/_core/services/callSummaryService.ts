/**
 * Post-call summaries (Groq via invokeLLM) — stored on call_recordings.aiSummary.
 */
import { invokeLLM } from "../llm";

export async function generateCallSummaryFromTranscript(
  transcript: string,
  outcome?: string | null
): Promise<string | null> {
  const t = transcript?.trim();
  if (!t || t.length < 20) return null;
  try {
    const r = await invokeLLM({
      maxTokens: 400,
      systemPrompt:
        "You write concise call summaries for sales teams. Output 2–4 sentences: what was discussed, outcome, and next step if any. No preamble or bullet labels.",
      messages: [
        {
          role: "user",
          content: `Call outcome hint: ${outcome ?? "unknown"}\n\nTranscript:\n${t.slice(0, 12000)}`,
        },
      ],
    });
    const text = r.choices[0]?.message?.content?.trim();
    return text || null;
  } catch (e) {
    console.warn("[CallSummary] LLM failed:", (e as Error).message);
    return null;
  }
}
