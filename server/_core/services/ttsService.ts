/**
 * TTS Service — Cartesia primary, ElevenLabs secondary.
 *
 * Provider selection:
 *   TTS_PROVIDER=cartesia   (default) — Cartesia Sonic batch REST
 *   TTS_PROVIDER=elevenlabs             — ElevenLabs eleven_turbo_v2
 *
 * Cartesia is also used as automatic fallback when ElevenLabs fails.
 */

export type VoiceId = string;

export interface VoiceSynthesisOptions {
  voiceId?: VoiceId;
  /** Override provider for this call (cartesia | elevenlabs). Falls back to TTS_PROVIDER env. */
  provider?: "cartesia" | "elevenlabs";
  speed?: number;
  stability?: number;
}

/** @deprecated Legacy IDs kept for call-site compatibility */
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

// ElevenLabs default voice (Rachel — natural, clear telephone voice)
export const ELEVENLABS_DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM";

const DEFAULT_VOICES = {
  cartesia: process.env.CARTESIA_VOICE_ID || CARTESIA_VOICES.sarah,
  elevenlabs: process.env.ELEVENLABS_VOICE_ID || ELEVENLABS_DEFAULT_VOICE,
};

/** Resolve active TTS provider. Prefers explicit arg, then TTS_PROVIDER env, then auto-detects by key. */
function resolveProvider(override?: string): "cartesia" | "elevenlabs" {
  const pref = (override || process.env.TTS_PROVIDER || "").toLowerCase().trim();
  if (pref === "elevenlabs" && process.env.ELEVENLABS_API_KEY?.trim()) return "elevenlabs";
  if (pref === "cartesia" && process.env.CARTESIA_API_KEY?.trim()) return "cartesia";
  // Auto-detect: prefer Cartesia, fall back to ElevenLabs
  if (process.env.CARTESIA_API_KEY?.trim()) return "cartesia";
  if (process.env.ELEVENLABS_API_KEY?.trim()) return "elevenlabs";
  throw new Error("No TTS configured — add CARTESIA_API_KEY or ELEVENLABS_API_KEY to Railway");
}

// ── Cartesia batch REST TTS ───────────────────────────────────────────────────

async function synthesizeCartesia(text: string, voiceId: string): Promise<Buffer> {
  const apiKey = process.env.CARTESIA_API_KEY;
  if (!apiKey) throw new Error("CARTESIA_API_KEY not configured");

  const response = await fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Cartesia-Version": "2024-11-13",
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

// ── ElevenLabs TTS ────────────────────────────────────────────────────────────

async function synthesizeElevenLabs(text: string, voiceId: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");

  // eleven_turbo_v2 — lowest latency model, optimized for real-time / telephony
  const model = process.env.ELEVENLABS_MODEL || "eleven_turbo_v2";
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=ulaw_8000`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
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

// ── Public API ─────────────────────────────────────────────────────────────────

export async function synthesizeSpeech(
  text: string,
  voiceIdOrOptions?: VoiceId | VoiceSynthesisOptions
): Promise<Buffer> {
  const options = typeof voiceIdOrOptions === "string"
    ? { voiceId: voiceIdOrOptions }
    : (voiceIdOrOptions ?? {});

  const provider = resolveProvider(options.provider);
  const voice = options.voiceId || DEFAULT_VOICES[provider];

  console.log(`[TTS] Provider: ${provider} | Voice: ${voice}`);

  try {
    if (provider === "elevenlabs") {
      return await synthesizeElevenLabs(text, voice);
    }
    return await synthesizeCartesia(text, voice);
  } catch (err: any) {
    // Auto-fallback: if primary provider fails, try the other
    const fallback = provider === "cartesia" ? "elevenlabs" : "cartesia";
    const hasFallback =
      fallback === "cartesia"
        ? Boolean(process.env.CARTESIA_API_KEY?.trim())
        : Boolean(process.env.ELEVENLABS_API_KEY?.trim());

    if (!hasFallback) throw err;

    console.warn(`[TTS] ${provider} failed (${err.message}) — falling back to ${fallback}`);
    const fallbackVoice = DEFAULT_VOICES[fallback];
    if (fallback === "elevenlabs") {
      return synthesizeElevenLabs(text, fallbackVoice);
    }
    return synthesizeCartesia(text, fallbackVoice);
  }
}

export async function getAvailableVoices(): Promise<Array<{ voice_id: string; name: string }>> {
  const provider = resolveProvider();
  if (provider === "elevenlabs") {
    return Object.entries(ELEVENLABS_VOICES).map(([name, id]) => ({ voice_id: id, name }));
  }
  return Object.entries(CARTESIA_VOICES).map(([name, id]) => ({ voice_id: id, name }));
}

export async function getVoiceIdByName(voiceName: string): Promise<VoiceId> {
  const voices = await getAvailableVoices();
  const voice = voices.find((entry) => entry.name.toLowerCase() === voiceName.toLowerCase());
  return voice?.voice_id || DEFAULT_VOICES[resolveProvider()];
}

export function getCurrentProvider(): string {
  try {
    return resolveProvider();
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
