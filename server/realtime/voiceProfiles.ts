/**
 * voiceProfiles.ts — 8 production-grade Cartesia voices
 * All optimized for phone calls (mulaw 8kHz output)
 */

export interface VoiceProfile {
  id: string;
  name: string;
  description: string;
  cartesiaId: string;
  speed: number;
  gender: "female" | "male";
}

// Cartesia's best production voices for phone agents
export const VOICE_PROFILES: VoiceProfile[] = [
  {
    id: "professional-female",
    name: "Sarah — Professional",
    description: "Clear, confident, professional female voice",
    cartesiaId: "a0e99841-438c-4a64-b679-ae501e7d6091",
    speed: 0.94,
    gender: "female",
  },
  {
    id: "warm-female",
    name: "Emma — Warm",
    description: "Warm, friendly, approachable female voice",
    cartesiaId: "79a125e8-cd45-4c13-8a67-188112f4dd22",
    speed: 0.92,
    gender: "female",
  },
  {
    id: "energetic-female",
    name: "Aria — Energetic",
    description: "Upbeat, energetic female — great for sales",
    cartesiaId: "f9836c6e-a0bd-460e-9d3c-f7299fa60f94",
    speed: 0.96,
    gender: "female",
  },
  {
    id: "authoritative-female",
    name: "Victoria — Authoritative",
    description: "Confident, authoritative female voice",
    cartesiaId: "b7d50908-b17c-442d-ad8d-810c63997ed9",
    speed: 0.93,
    gender: "female",
  },
  {
    id: "professional-male",
    name: "James — Professional",
    description: "Deep, professional, trustworthy male voice",
    cartesiaId: "421b3369-f63f-4b03-8980-37a44df1d4e8",
    speed: 0.94,
    gender: "male",
  },
  {
    id: "friendly-male",
    name: "Marcus — Friendly",
    description: "Friendly, conversational male voice",
    cartesiaId: "69267136-1bdc-412f-ad78-0caad210fb40",
    speed: 0.93,
    gender: "male",
  },
  {
    id: "dynamic-male",
    name: "Alex — Dynamic",
    description: "Dynamic, persuasive male — great for closing",
    cartesiaId: "41534e16-2966-4c6b-9670-111411def906",
    speed: 0.95,
    gender: "male",
  },
  {
    id: "calm-male",
    name: "David — Calm",
    description: "Calm, reassuring male — great for support",
    cartesiaId: "d46abd1d-2d02-43e8-819f-51fb652c1c61",
    speed: 0.92,
    gender: "male",
  },
];

export const DEFAULT_VOICE = VOICE_PROFILES[0];

export function getVoiceProfile(id: string): VoiceProfile {
  return VOICE_PROFILES.find(v => v.id === id) || DEFAULT_VOICE;
}

export function getVoiceById(cartesiaId: string): VoiceProfile {
  return VOICE_PROFILES.find(v => v.cartesiaId === cartesiaId) || DEFAULT_VOICE;
}
