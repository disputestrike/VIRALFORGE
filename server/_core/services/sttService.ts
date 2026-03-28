/**
 * Speech-to-Text Service (OpenAI Whisper)
 * Receives mulaw 8000Hz audio from SignalWire Media Streams
 * Wraps in WAV header before sending to Whisper
 */

/**
 * Build a proper WAV file header for mulaw 8000Hz audio
 * Whisper requires valid WAV format — raw mulaw bytes alone won't work
 */
function buildWavBuffer(mulawData: Buffer): Buffer {
  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 8; // mulaw is 8-bit
  const audioFormat = 7; // PCM mulaw = 7
  const dataSize = mulawData.length;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const header = Buffer.alloc(headerSize);
  let offset = 0;

  // RIFF chunk
  header.write("RIFF", offset); offset += 4;
  header.writeUInt32LE(totalSize - 8, offset); offset += 4;
  header.write("WAVE", offset); offset += 4;

  // fmt chunk
  header.write("fmt ", offset); offset += 4;
  header.writeUInt32LE(16, offset); offset += 4; // chunk size
  header.writeUInt16LE(audioFormat, offset); offset += 2; // mulaw
  header.writeUInt16LE(numChannels, offset); offset += 2;
  header.writeUInt32LE(sampleRate, offset); offset += 4;
  header.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, offset); offset += 4; // byte rate
  header.writeUInt16LE(numChannels * bitsPerSample / 8, offset); offset += 2; // block align
  header.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data chunk
  header.write("data", offset); offset += 4;
  header.writeUInt32LE(dataSize, offset);

  return Buffer.concat([header, mulawData]);
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  language?: string
): Promise<string> {
  console.log(`[STT] Transcribing ${audioBuffer.length} bytes (mulaw 8000Hz)`);

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  // Wrap mulaw bytes in proper WAV container
  const wavBuffer = buildWavBuffer(audioBuffer);
  console.log(`[STT] WAV buffer: ${wavBuffer.length} bytes`);

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
    wavBuffer,
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
