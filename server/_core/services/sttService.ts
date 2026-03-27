/**
 * Speech-to-Text Service (OpenAI Whisper)
 * Receives mulaw 8000Hz audio from Twilio Media Streams
 * Converts to text via Whisper API
 */

export async function transcribeAudio(
  audioBuffer: Buffer,
  language?: string
): Promise<string> {
  console.log(`[STT] Transcribing ${audioBuffer.length} bytes`);

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  // Build multipart form — Whisper accepts mulaw/wav directly
  const boundary = "----ApexAIBoundary" + Date.now().toString(36);
  const CRLF = "\r\n";

  const headerParts = [
    `--${boundary}${CRLF}`,
    `Content-Disposition: form-data; name="file"; filename="audio.wav"${CRLF}`,
    `Content-Type: audio/wav${CRLF}${CRLF}`,
  ].join("");

  const modelPart = [
    `${CRLF}--${boundary}${CRLF}`,
    `Content-Disposition: form-data; name="model"${CRLF}${CRLF}`,
    `whisper-1`,
    language ? `${CRLF}--${boundary}${CRLF}Content-Disposition: form-data; name="language"${CRLF}${CRLF}${language}` : "",
    `${CRLF}--${boundary}--${CRLF}`,
  ].join("");

  const body = Buffer.concat([
    Buffer.from(headerParts, "utf-8"),
    audioBuffer,
    Buffer.from(modelPart, "utf-8"),
  ]);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[STT] Error ${response.status}: ${error}`);
    throw new Error(`Whisper failed: ${response.status}`);
  }

  const result = (await response.json()) as { text: string };
  console.log(`[STT] Transcribed: "${result.text.substring(0, 80)}"`);
  return result.text;
}

export function getLanguageCode(language: string): string {
  const map: Record<string, string> = {
    english: "en", spanish: "es", french: "fr",
    german: "de", chinese: "zh", japanese: "ja",
    portuguese: "pt", russian: "ru", korean: "ko",
  };
  return map[language.toLowerCase()] || "en";
}

export default { transcribeAudio, getLanguageCode };
