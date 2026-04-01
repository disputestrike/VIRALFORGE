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
// Cartesia official voices — verified from cartesia.ai documentation
export const VOICE_PROFILES: VoiceProfile[] = [
  {
    id: "professional-female",
    name: "Sarah — Professional",
    description: "Clear, confident, professional female voice",
    cartesiaId: "694f9389-aac1-45b6-b726-9d9369183238",  // Cartesia: Sophie
    speed: 0.94,
    gender: "female",
  },
  {
    id: "warm-female",
    name: "Emma — Warm",
    description: "Warm, friendly, approachable female voice",
    cartesiaId: "a0e99841-438c-4a64-b679-ae501e7d6091",  // Cartesia: Friendly Female
    speed: 0.94,
    gender: "female",
  },
  {
    id: "energetic-female",
    name: "Aria — Energetic",
    description: "Upbeat, energetic female — great for sales",
    cartesiaId: "79a125e8-cd45-4c13-8a67-188112f4dd22",  // Cartesia: Energetic Female
    speed: 0.94,
    gender: "female",
  },
  {
    id: "authoritative-female",
    name: "Victoria — Authoritative",
    description: "Confident, authoritative female voice",
    cartesiaId: "b7d50908-b17c-442d-ad8d-810c63997ed9",  // Cartesia: Professional Female
    speed: 0.94,
    gender: "female",
  },
  {
    id: "professional-male",
    name: "James — Professional",
    description: "Deep, professional, trustworthy male voice",
    cartesiaId: "421b3369-f63f-4b03-8980-37a44df1d4e8",  // Cartesia: Professional Male
    speed: 0.94,
    gender: "male",
  },
  {
    id: "friendly-male",
    name: "Marcus — Friendly",
    description: "Friendly, conversational male voice",
    cartesiaId: "5c42302c-194b-4d0c-ba1a-8cb485c84ab9",  // Cartesia: Friendly Male
    speed: 0.94,
    gender: "male",
  },
  {
    id: "dynamic-male",
    name: "Alex — Dynamic",
    description: "Dynamic, persuasive male — great for closing",
    cartesiaId: "2ee87190-8f84-4925-97da-e52547f9462c",  // Cartesia: Confident Male
    speed: 0.94,
    gender: "male",
  },
  {
    id: "calm-male",
    name: "David — Calm",
    description: "Calm, reassuring male — great for support",
    cartesiaId: "29e9b1dc-5c16-4ccf-9d7d-9e5fe4b1c456",  // Cartesia: Calm Male
    speed: 0.94,
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
