/**
 * Speech-to-Text Service
 * Primary: Deepgram streaming (when DEEPGRAM_API_KEY is set) — ~100ms latency
 * Fallback: OpenAI Whisper batch — ~500ms latency
 */

// ── Deepgram Streaming STT ────────────────────────────────────────────────────

export async function transcribeAudio(
  audioBuffer: Buffer,
  language = "en"
): Promise<string> {
  if (process.env.DEEPGRAM_API_KEY) {
    return transcribeDeepgram(audioBuffer, language);
  }
  return transcribeWhisper(audioBuffer, language);
}

async function transcribeDeepgram(audioBuffer: Buffer, language: string): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY!;

  // Deepgram REST pre-recorded endpoint — fastest path for buffered audio
  // Returns transcript in ~100-200ms
  // Nova-3: best accuracy for telephony audio per research spec.
  // Set VOICE_DEEPGRAM_MODEL=nova-2-phonecall to revert to legacy model.
  const model = (process.env.VOICE_DEEPGRAM_MODEL ?? "nova-3").trim();
  const params = new URLSearchParams({
    model,
    language: language || "en",
    punctuate: "true",
    smart_format: "true",
    filler_words: "false",
    encoding: "mulaw",
    sample_rate: "8000",
    channels: "1",
  });
  // PII redaction — enabled by default; disable with VOICE_DEEPGRAM_REDACT=false
  if (process.env.VOICE_DEEPGRAM_REDACT !== "false") {
    params.set("redact", "pci");
  }

  const response = await fetch(
    `https://api.deepgram.com/v1/listen?${params.toString()}`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "audio/mulaw",
      },
      body: audioBuffer as unknown as BodyInit,
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error(`[STT:Deepgram] Error ${response.status}: ${err}`);
    // Fallback to Whisper if Deepgram fails
    if (process.env.OPENAI_API_KEY) {
      console.warn("[STT] Falling back to Whisper");
      return transcribeWhisper(audioBuffer, language);
    }
    throw new Error(`Deepgram STT failed: ${response.status}`);
  }

  const data = await response.json() as any;
  const transcript = data?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
  const confidence = data?.results?.channels?.[0]?.alternatives?.[0]?.confidence ?? 0;

  console.log(`[STT:Deepgram] "${transcript}" (confidence: ${confidence.toFixed(2)})`);
  return transcript.trim();
}

// ── Whisper Fallback ──────────────────────────────────────────────────────────

function mulawToPcm16(mulawData: Buffer): Buffer {
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
    pcm.writeInt16LE(MULAW_DECODE_TABLE[mulawData[i]], i * 2);
  }
  return pcm;
}

function buildWavBuffer(mulawData: Buffer): Buffer {
  const pcmData = mulawToPcm16(mulawData);
  const sampleRate = 8000;
  const bitsPerSample = 16;
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);
  let o = 0;
  header.write("RIFF", o); o += 4;
  header.writeUInt32LE(36 + dataSize, o); o += 4;
  header.write("WAVE", o); o += 4;
  header.write("fmt ", o); o += 4;
  header.writeUInt32LE(16, o); o += 4;
  header.writeUInt16LE(1, o); o += 2;   // PCM
  header.writeUInt16LE(1, o); o += 2;   // mono
  header.writeUInt32LE(sampleRate, o); o += 4;
  header.writeUInt32LE(sampleRate * bitsPerSample / 8, o); o += 4;
  header.writeUInt16LE(bitsPerSample / 8, o); o += 2;
  header.writeUInt16LE(bitsPerSample, o); o += 2;
  header.write("data", o); o += 4;
  header.writeUInt32LE(dataSize, o);
  return Buffer.concat([header, pcmData]);
}

async function transcribeWhisper(audioBuffer: Buffer, language: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("No STT provider configured — add DEEPGRAM_API_KEY or OPENAI_API_KEY");
  }

  console.log(`[STT:Whisper] Transcribing ${audioBuffer.length} bytes`);
  const wavBuffer = buildWavBuffer(audioBuffer);
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
    language !== "en"
      ? `${CRLF}--${boundary}${CRLF}Content-Disposition: form-data; name="language"${CRLF}${CRLF}${language}`
      : "",
    `${CRLF}--${boundary}--${CRLF}`,
  ].join("");

  const body = Buffer.concat([
    Buffer.from(headerParts),
    wavBuffer,
    Buffer.from(modelPart),
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
    throw new Error(`Whisper failed: ${response.status}`);
  }

  const result = await response.json() as { text: string };
  console.log(`[STT:Whisper] "${result.text.slice(0, 80)}"`);
  return result.text;
}

export function getLanguageCode(language: string): string {
  const map: Record<string, string> = {
    english: "en", spanish: "es", french: "fr", german: "de",
    chinese: "zh", japanese: "ja", portuguese: "pt", russian: "ru", korean: "ko",
  };
  return map[language.toLowerCase()] || "en";
}

export default { transcribeAudio, getLanguageCode };
