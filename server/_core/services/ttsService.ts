/**
 * TTS SERVICE - Multi-provider Text-to-Speech
 */

export type VoiceId = string;

export interface VoiceSynthesisOptions {
  voiceId?: VoiceId;
  provider?: "elevenlabs" | "cartesia";
  speed?: number;
  stability?: number;
}

export const ELEVENLABS_VOICES = {
  bella: "21m00Tcm4TlvDq8ikWAM",
  adam: "pNInz6obpgDQGcFmaJgB",
  arnold: "VR6AewLHsfirz34V3XKA",
  bella_fast: "EXAVITQu4emSDH7WNrR3",
};

export const CARTESIA_VOICES = {
  sonic_english: "a0e99841-438c-4a64-b679-ae501e7d6091",
  sarah: "694f9389-aac1-45b6-b726-9d9369183238",
  clyde: "2ee87190-8f84-4925-97da-e52547f9462c",
  barbershop: "a167e0f3-df7e-4d52-a9c3-f949145efdab",
};

const DEFAULT_VOICES = {
  elevenlabs: process.env.ELEVENLABS_VOICE_ID || ELEVENLABS_VOICES.bella,
  cartesia: CARTESIA_VOICES.sarah,
};

function getProvider(): "elevenlabs" | "cartesia" {
  const env = (process.env.TTS_PROVIDER || "").toLowerCase();
  if (env === "elevenlabs" && process.env.ELEVENLABS_API_KEY) return "elevenlabs";
  if (env === "cartesia" && process.env.CARTESIA_API_KEY) return "cartesia";
  // Prefer ElevenLabs when both providers are configured so we don't default to
  // a dead secondary provider on production calls.
  if (process.env.ELEVENLABS_API_KEY) return "elevenlabs";
  if (process.env.CARTESIA_API_KEY) return "cartesia";
  throw new Error("No TTS provider configured - add ELEVENLABS_API_KEY or CARTESIA_API_KEY");
}

async function synthesizeElevenLabs(
  text: string,
  voiceId: string,
  options?: VoiceSynthesisOptions
): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=ulaw_8000`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/basic",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_flash_v2_5",
        voice_settings: {
          stability: options?.stability ?? 0.7,
          similarity_boost: 0.6,
          speed: options?.speed ?? 1.05,
          style: 0.0,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error ${response.status}: ${error}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function synthesizeCartesia(text: string, voiceId: string): Promise<Buffer> {
  const apiKey = process.env.CARTESIA_API_KEY;
  if (!apiKey) throw new Error("CARTESIA_API_KEY not configured");

  const response = await fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Cartesia-Version": "2024-06-10",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_id: "sonic-2",
      transcript: text,
      voice: {
        mode: "id",
        id: voiceId,
      },
      output_format: {
        container: "raw",
        encoding: "pcm_mulaw",
        sample_rate: 8000,
      },
      language: "en",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Cartesia API error ${response.status}: ${error}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

function shouldFailOverProvider(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return [
    "401",
    "402",
    "payment_required",
    "insufficient credits",
    "insufficient_credit",
    "quota",
    "unusual_activity",
    "Free Tier",
  ].some((token) => message.toLowerCase().includes(token.toLowerCase()));
}

async function synthesizeWithProvider(
  provider: "elevenlabs" | "cartesia",
  text: string,
  voiceId: string,
  options?: VoiceSynthesisOptions
): Promise<Buffer> {
  if (provider === "cartesia") {
    return synthesizeCartesia(text, voiceId);
  }
  return synthesizeElevenLabs(text, voiceId, options);
}

export async function synthesizeSpeech(
  text: string,
  voiceIdOrOptions?: VoiceId | VoiceSynthesisOptions
): Promise<Buffer> {
  const options = typeof voiceIdOrOptions === "string"
    ? { voiceId: voiceIdOrOptions }
    : (voiceIdOrOptions ?? {});
  const provider = options.provider || getProvider();
  const voice = options.voiceId || DEFAULT_VOICES[provider];

  console.log(`[TTS] Provider: ${provider} | Voice: ${voice}`);

  try {
    return await synthesizeWithProvider(provider, text, voice, options);
  } catch (err: any) {
    const fallbackProvider = provider === "cartesia" ? "elevenlabs" : "cartesia";
    const fallbackConfigured = fallbackProvider === "cartesia"
      ? !!process.env.CARTESIA_API_KEY
      : !!process.env.ELEVENLABS_API_KEY;
    if (fallbackConfigured && shouldFailOverProvider(err)) {
      console.warn(`[TTS] ${provider} unavailable - falling back to ${fallbackProvider}`);
      return synthesizeWithProvider(
        fallbackProvider,
        text,
        DEFAULT_VOICES[fallbackProvider],
        options
      );
    }
    throw err;
  }
}

export async function getAvailableVoices(): Promise<Array<{ voice_id: string; name: string }>> {
  const provider = getProvider();

  if (provider === "cartesia") {
    return Object.entries(CARTESIA_VOICES).map(([name, id]) => ({ voice_id: id, name }));
  }

  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
    });
    if (!response.ok) {
      return Object.entries(ELEVENLABS_VOICES).map(([name, id]) => ({ voice_id: id, name }));
    }
    const data = await response.json() as { voices: Array<{ voice_id: string; name: string }> };
    return data.voices;
  } catch {
    return Object.entries(ELEVENLABS_VOICES).map(([name, id]) => ({ voice_id: id, name }));
  }
}

export async function getVoiceIdByName(voiceName: string): Promise<VoiceId> {
  const voices = await getAvailableVoices();
  const voice = voices.find((entry) => entry.name.toLowerCase() === voiceName.toLowerCase());
  return voice?.voice_id || DEFAULT_VOICES[getProvider()];
}

export function getCurrentProvider(): string {
  try {
    return getProvider();
  } catch {
    return "none";
  }
}

export default {
  synthesizeSpeech,
  getAvailableVoices,
  getVoiceIdByName,
  getCurrentProvider,
  ELEVENLABS_VOICES,
  CARTESIA_VOICES,
};
