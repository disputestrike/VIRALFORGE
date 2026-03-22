/**
 * Text-to-Speech Service (ElevenLabs)
 * 
 * Converts text to audio using ElevenLabs API
 * Cost: $0.30 per 1K characters OR $9/month starter
 * 
 * Voice options:
 * - 21m00Tcm4TlvDq8ikWAM: Bella (female, warm)
 * - EXAVITQu4emSDH7WNrR3 (male, deep)
 */

export type VoiceId = string;

// Predefined voices
export const VOICES = {
  bella: "21m00Tcm4TlvDq8ikWAM",      // Female, warm
  adam: "pNInz6obpgDQGcFmaJgB",       // Male, deep
  arnold: "VR6AewLHsfirz34V3XKA",     // Male, strong
  bella_fast: "EXAVITQu4emSDH7WNrR3",  // Female, quick
};

export async function synthesizeSpeech(
  text: string,
  voiceId: VoiceId = VOICES.bella,
  voiceName?: string
): Promise<Buffer> {
  console.log(`[TTS] Synthesizing: "${text.substring(0, 50)}..."`);

  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY not configured");
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error(`[TTS] API error: ${response.status} - ${error}`);
    throw new Error(`ElevenLabs API failed: ${response.status} - ${error}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  console.log(`[TTS] Synthesized: ${audioBuffer.length} bytes`);

  return audioBuffer;
}

/**
 * Get available voices from ElevenLabs
 */
export async function getAvailableVoices(): Promise<
  Array<{ voice_id: string; name: string }>
> {
  if (!process.env.ELEVENLABS_API_KEY) {
    console.warn("[TTS] ELEVENLABS_API_KEY not configured");
    return [];
  }

  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      voices: Array<{ voice_id: string; name: string }>;
    };
    return data.voices;
  } catch (error) {
    console.error("[TTS] Failed to get voices:", error);
    return [];
  }
}

/**
 * Get voice ID by name
 */
export async function getVoiceIdByName(voiceName: string): Promise<VoiceId> {
  const voices = await getAvailableVoices();
  const voice = voices.find((v) => v.name.toLowerCase() === voiceName.toLowerCase());
  return voice?.voice_id || VOICES.bella;
}

export default {
  synthesizeSpeech,
  getAvailableVoices,
  getVoiceIdByName,
  VOICES,
};
