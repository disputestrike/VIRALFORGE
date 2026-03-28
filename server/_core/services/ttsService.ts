/**
 * TTS SERVICE — Multi-provider Text-to-Speech
 *
 * Provider selection via TTS_PROVIDER env var in Railway:
 *   TTS_PROVIDER=elevenlabs  (default — uses ELEVENLABS_API_KEY)
 *   TTS_PROVIDER=cartesia    (uses CARTESIA_API_KEY)
 *
 * To switch providers: change TTS_PROVIDER in Railway Variables.
 * No code changes needed. No redeploy needed.
 *
 * Cost comparison (per 1K chars):
 *   ElevenLabs Flash:   $0.06   — best voice quality
 *   Cartesia Sonic:     $0.03   — fastest latency (40ms), purpose-built for agents
 */

export type VoiceId = string;

// ── ElevenLabs voices ──────────────────────────────────────────────────────
export const ELEVENLABS_VOICES = {
  bella:       "21m00Tcm4TlvDq8ikWAM",  // Female, warm
  adam:        "pNInz6obpgDQGcFmaJgB",  // Male, deep
  arnold:      "VR6AewLHsfirz34V3XKA",  // Male, strong
  bella_fast:  "EXAVITQu4emSDH7WNrR3",  // Female, quick
};

// ── Cartesia voices ────────────────────────────────────────────────────────
// Default voices from Cartesia's built-in voice library
export const CARTESIA_VOICES = {
  sonic_english: "a0e99841-438c-4a64-b679-ae501e7d6091",  // Sonic English (neutral)
  sarah:         "694f9389-aac1-45b6-b726-9d9369183238",  // Female, warm — good for sales
  clyde:         "2ee87190-8f84-4925-97da-e52547f9462c",  // Male, professional
  barbershop:    "a167e0f3-df7e-4d52-a9c3-f949145efdab",  // Male, friendly
};

// Default voices per provider
const DEFAULT_VOICES = {
  elevenlabs: ELEVENLABS_VOICES.bella,
  cartesia:   CARTESIA_VOICES.sarah,
};

// ── Provider detection ─────────────────────────────────────────────────────
function getProvider(): "elevenlabs" | "cartesia" {
  const env = (process.env.TTS_PROVIDER || "elevenlabs").toLowerCase();
  if (env === "cartesia" && process.env.CARTESIA_API_KEY) return "cartesia";
  if (process.env.ELEVENLABS_API_KEY) return "elevenlabs";
  if (process.env.CARTESIA_API_KEY) return "cartesia";
  throw new Error("No TTS provider configured — add ELEVENLABS_API_KEY or CARTESIA_API_KEY to Railway Variables");
}

// ── ElevenLabs implementation ──────────────────────────────────────────────
async function synthesizeElevenLabs(text: string, voiceId: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=ulaw_8000`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/basic",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_flash_v2_5", // Fastest ElevenLabs model — lowest latency
        voice_settings: {
          stability: 0.7,         // Higher = more consistent on phone
          similarity_boost: 0.6,  // Lower = less over-processed
          speed: 1.05,            // Slightly faster = snappier responses
          style: 0.0,             // Neutral style = clearer on narrowband
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error ${response.status}: ${error}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`[TTS:ElevenLabs] Synthesized ${buffer.length} bytes for "${text.substring(0, 50)}..."`);
  return buffer;
}

// ── Cartesia implementation ────────────────────────────────────────────────
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

  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`[TTS:Cartesia] Synthesized ${buffer.length} bytes for "${text.substring(0, 50)}..."`);
  return buffer;
}

// ── Main export — auto-selects provider ───────────────────────────────────
export async function synthesizeSpeech(
  text: string,
  voiceId?: VoiceId,
): Promise<Buffer> {
  const provider = getProvider();
  const voice = voiceId || DEFAULT_VOICES[provider];

  console.log(`[TTS] Provider: ${provider} | Voice: ${voice}`);

  if (provider === "cartesia") {
    return synthesizeCartesia(text, voice);
  }
  return synthesizeElevenLabs(text, voice);
}

// ── Get available voices ───────────────────────────────────────────────────
export async function getAvailableVoices(): Promise<Array<{ voice_id: string; name: string }>> {
  const provider = getProvider();

  if (provider === "cartesia") {
    // Return Cartesia built-in voices
    return Object.entries(CARTESIA_VOICES).map(([name, id]) => ({ voice_id: id, name }));
  }

  // ElevenLabs — fetch from API
  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
    });
    if (!response.ok) return Object.entries(ELEVENLABS_VOICES).map(([name, id]) => ({ voice_id: id, name }));
    const data = await response.json() as { voices: Array<{ voice_id: string; name: string }> };
    return data.voices;
  } catch {
    return Object.entries(ELEVENLABS_VOICES).map(([name, id]) => ({ voice_id: id, name }));
  }
}

export async function getVoiceIdByName(voiceName: string): Promise<VoiceId> {
  const voices = await getAvailableVoices();
  const voice = voices.find(v => v.name.toLowerCase() === voiceName.toLowerCase());
  return voice?.voice_id || DEFAULT_VOICES[getProvider()];
}

export function getCurrentProvider(): string {
  try { return getProvider(); } catch { return "none"; }
}

export default { synthesizeSpeech, getAvailableVoices, getVoiceIdByName, getCurrentProvider, ELEVENLABS_VOICES, CARTESIA_VOICES };
