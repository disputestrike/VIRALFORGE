/**
 * Speech-to-Text Service (OpenAI Whisper)
 * Receives mulaw 8000Hz audio from SignalWire Media Streams
 * Wraps in WAV header before sending to Whisper
 */

/**
 * Convert mulaw (G.711) to PCM16 then wrap in WAV
 * Whisper expects PCM WAV (format 1), not mulaw WAV (format 7)
 */
function mulawToPcm16(mulawData: Buffer): Buffer {
  // mulaw to linear PCM16 decode table
  const MULAW_DECODE_TABLE = new Int16Array(256);
  for (let i = 0; i < 256; i++) {
    let ulaw = ~i & 0xFF;
    const sign = (ulaw & 0x80) ? -1 : 1;
    const exponent = (ulaw >> 4) & 0x07;
    const mantissa = ulaw & 0x0F;
    let sample = ((mantissa << 3) + 0x84) << exponent;
    sample -= 0x84;
    MULAW_DECODE_TABLE[i] = sign * sample;
  }

  const pcm = Buffer.alloc(mulawData.length * 2);
  for (let i = 0; i < mulawData.length; i++) {
    const sample = MULAW_DECODE_TABLE[mulawData[i]];
    pcm.writeInt16LE(sample, i * 2);
  }
  return pcm;
}

function buildWavBuffer(mulawData: Buffer): Buffer {
  // Convert mulaw → PCM16 (Whisper needs PCM, not mulaw)
  const pcmData = mulawToPcm16(mulawData);

  const sampleRate = 8000;
  const numChannels = 1;
  const bitsPerSample = 16; // PCM16
  const audioFormat = 1;   // PCM = 1
  const dataSize = pcmData.length;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const header = Buffer.alloc(headerSize);
  let offset = 0;

  header.write("RIFF", offset); offset += 4;
  header.writeUInt32LE(totalSize - 8, offset); offset += 4;
  header.write("WAVE", offset); offset += 4;
  header.write("fmt ", offset); offset += 4;
  header.writeUInt32LE(16, offset); offset += 4;
  header.writeUInt16LE(audioFormat, offset); offset += 2;
  header.writeUInt16LE(numChannels, offset); offset += 2;
  header.writeUInt32LE(sampleRate, offset); offset += 4;
  header.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, offset); offset += 4;
  header.writeUInt16LE(numChannels * bitsPerSample / 8, offset); offset += 2;
  header.writeUInt16LE(bitsPerSample, offset); offset += 2;
  header.write("data", offset); offset += 4;
  header.writeUInt32LE(dataSize, offset);

  return Buffer.concat([header, pcmData]);
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
