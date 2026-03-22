/**
 * Speech-to-Text Service (Whisper)
 * 
 * Converts audio to text using OpenAI Whisper API
 * Cost: $0.02 per minute of audio
 */

import { Readable } from "stream";

export async function transcribeAudio(
  audioBuffer: Buffer,
  language?: string
): Promise<string> {
  console.log(`[STT] Transcribing audio (${audioBuffer.length} bytes)`);

  // Create FormData for multipart upload
  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substr(2, 9);
  
  let body = "";
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="file"; filename="audio.wav"\r\n`;
  body += `Content-Type: audio/wav\r\n\r\n`;

  const footerBytes = Buffer.from(`\r\n--${boundary}\r\n`);
  const footerData = Buffer.from(
    `Content-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n` +
    (language ? `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${language}\r\n` : "") +
    `--${boundary}--\r\n`
  );

  const headerBuffer = Buffer.from(body, "utf-8");
  const fullBuffer = Buffer.concat([headerBuffer, audioBuffer, footerData]);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body: fullBuffer,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[STT] API error: ${response.status} - ${error}`);
    throw new Error(`Whisper API failed: ${response.status} - ${error}`);
  }

  const result = (await response.json()) as { text: string };
  console.log(`[STT] Transcribed: "${result.text}"`);
  
  return result.text;
}

/**
 * Get language code for Whisper
 */
export function getLanguageCode(language: string): string {
  const languageMap: Record<string, string> = {
    english: "en",
    spanish: "es",
    french: "fr",
    german: "de",
    chinese: "zh",
    japanese: "ja",
    portuguese: "pt",
    russian: "ru",
    korean: "ko",
  };

  return languageMap[language.toLowerCase()] || "en";
}

export default {
  transcribeAudio,
  getLanguageCode,
};
