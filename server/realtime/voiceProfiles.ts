/**
 * voiceProfiles.ts — realtime-engine bridge over the shared voice profile catalog.
 * This keeps production calls aligned with Settings, previews, and tenant config.
 */

import {
  VOICE_PROFILES as CORE_VOICE_PROFILES,
  getVoiceProfileById,
  type VoiceProfile as CoreVoiceProfile,
} from "../_core/services/voiceProfiles";

export interface VoiceProfile {
  id: string;
  name: string;
  description: string;
  cartesiaId: string;
  speed: number;
  gender: "female" | "male";
  /** Cartesia `generation_config.emotion` (Sonic); set from dashboard profile when present. */
  ttsEmotion?: string;
}

const LEGACY_RT_TO_CORE: Record<string, string> = {
  "professional-female": "cartesia-sarah-sales",
  "warm-female": "cartesia-sonic-neutral",
  "energetic-female": "cartesia-laidback-female",
  "authoritative-female": "cartesia-sarah-sales",
  "professional-male": "cartesia-clyde-professional",
  "friendly-male": "cartesia-clyde-professional",
  "dynamic-male": "cartesia-barbershop-male",
  "calm-male": "cartesia-announcer-male",
};

function mapCoreVoiceProfile(core: CoreVoiceProfile): VoiceProfile {
  const lower = `${core.label} ${core.presentation ?? ""}`.toLowerCase();
  const gender: "female" | "male" = lower.includes("female") ? "female" : "male";
  return {
    id: core.id,
    name: core.label,
    description: core.description ?? core.style ?? "Production-ready phone voice",
    cartesiaId: core.externalVoiceId,
    speed: typeof core.speed === "number" ? core.speed : 0.96,
    gender,
    ttsEmotion: core.ttsEmotion,
  };
}

export const VOICE_PROFILES: VoiceProfile[] = CORE_VOICE_PROFILES
  .filter((profile) => profile.provider === "cartesia")
  .map(mapCoreVoiceProfile);

export const DEFAULT_VOICE = VOICE_PROFILES[0]!;

export function getVoiceProfile(id: string): VoiceProfile {
  const resolvedId = LEGACY_RT_TO_CORE[id] ?? id;
  return mapCoreVoiceProfile(getVoiceProfileById(resolvedId));
}

export function getVoiceById(cartesiaId: string): VoiceProfile {
  const profile = CORE_VOICE_PROFILES.find((voice) => voice.externalVoiceId === cartesiaId);
  return profile ? mapCoreVoiceProfile(profile) : DEFAULT_VOICE;
}
