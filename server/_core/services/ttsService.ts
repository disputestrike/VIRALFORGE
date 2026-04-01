/**
 * TTS — Cartesia only (telephony μ-law). Set CARTESIA_API_KEY in Railway.
 */

export type VoiceId = string;

export interface VoiceSynthesisOptions {
  voiceId?: VoiceId;
  /** Ignored — always Cartesia; kept for call-site compatibility */
  provider?: "cartesia";
  speed?: number;
  stability?: number;
}

/** @deprecated Legacy IDs — product uses Cartesia only */
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
  cartesia: process.env.CARTESIA_VOICE_ID || CARTESIA_VOICES.sarah,
};

function getProvider(): "cartesia" {
  if (!process.env.CARTESIA_API_KEY?.trim()) {
    throw new Error("No TTS configured — add CARTESIA_API_KEY to Railway");
  }
  return "cartesia";
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

export async function synthesizeSpeech(
  text: string,
  voiceIdOrOptions?: VoiceId | VoiceSynthesisOptions
): Promise<Buffer> {
  const options = typeof voiceIdOrOptions === "string"
    ? { voiceId: voiceIdOrOptions }
    : (voiceIdOrOptions ?? {});
  getProvider();
  const voice = options.voiceId || DEFAULT_VOICES.cartesia;

  console.log(`[TTS] Provider: cartesia | Voice: ${voice}`);

  return synthesizeCartesia(text, voice);
}

export async function getAvailableVoices(): Promise<Array<{ voice_id: string; name: string }>> {
  getProvider();
  return Object.entries(CARTESIA_VOICES).map(([name, id]) => ({ voice_id: id, name }));
}

export async function getVoiceIdByName(voiceName: string): Promise<VoiceId> {
  const voices = await getAvailableVoices();
  const voice = voices.find((entry) => entry.name.toLowerCase() === voiceName.toLowerCase());
  return voice?.voice_id || DEFAULT_VOICES.cartesia;
}

export function getCurrentProvider(): string {
  try {
    getProvider();
    return "cartesia";
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
