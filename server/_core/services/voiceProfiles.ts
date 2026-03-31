import { eq } from "drizzle-orm";
import { systemConfig } from "../../../drizzle/schema";
import { getDb, getLeadById, getCampaignById } from "../../db";

export type VoiceProfile = {
  id: string;
  provider: "cartesia" | "elevenlabs" | "other";
  label: string;
  externalVoiceId: string;
  useCase: "default" | "sales" | "support" | "luxury" | "urgent";
  telephonyOptimized: boolean;
  style?: string;
  presentation?: string;
  latencyProfile?: "fast" | "balanced" | "premium";
  speed?: number;
  stability?: number;
};

export const VOICE_PROFILES: VoiceProfile[] = [
  // ── Cartesia voices (low-latency, telephony-optimized) ──────────────────
  {
    id: "cartesia-sarah-sales",
    provider: "cartesia",
    label: "Sarah — Warm Sales",
    externalVoiceId: "694f9389-aac1-45b6-b726-9d9369183238",
    useCase: "sales",
    telephonyOptimized: true,
    style: "warm",
    presentation: "female",
    latencyProfile: "fast",
  },
  {
    id: "cartesia-clyde-professional",
    provider: "cartesia",
    label: "Clyde — Professional",
    externalVoiceId: "2ee87190-8f84-4925-97da-e52547f9462c",
    useCase: "support",
    telephonyOptimized: true,
    style: "professional",
    presentation: "male",
    latencyProfile: "fast",
  },
  {
    id: "cartesia-sonic-neutral",
    provider: "cartesia",
    label: "Alex — Neutral",
    externalVoiceId: "a0e99841-438c-4a64-b679-ae501e7d6091",
    useCase: "default",
    telephonyOptimized: true,
    style: "neutral",
    presentation: "neutral",
    latencyProfile: "fast",
  },
  {
    id: "cartesia-barbershop-male",
    provider: "cartesia",
    label: "Marcus — Confident Male",
    externalVoiceId: "a167e0f3-df7e-4d52-a9c3-f949145efdab",
    useCase: "sales",
    telephonyOptimized: true,
    style: "confident",
    presentation: "male",
    latencyProfile: "fast",
  },
  {
    id: "cartesia-laidback-female",
    provider: "cartesia",
    label: "Nina — Friendly Female",
    externalVoiceId: "79a125e8-cd45-4c13-8a67-188112f4dd22",
    useCase: "support",
    telephonyOptimized: true,
    style: "friendly",
    presentation: "female",
    latencyProfile: "fast",
  },
  {
    id: "cartesia-announcer-male",
    provider: "cartesia",
    label: "Jordan — Authoritative",
    externalVoiceId: "41534e16-2966-4c6b-9670-111411def906",
    useCase: "urgent",
    telephonyOptimized: true,
    style: "authoritative",
    presentation: "male",
    latencyProfile: "fast",
  },
  // ── ElevenLabs voices (premium quality, slightly higher latency) ─────────
  {
    id: "elevenlabs-bella-premium",
    provider: "elevenlabs",
    label: "Bella — Premium Female",
    externalVoiceId: "21m00Tcm4TlvDq8ikWAM",
    useCase: "luxury",
    telephonyOptimized: true,
    style: "premium",
    presentation: "female",
    latencyProfile: "premium",
    speed: 1,
    stability: 0.8,
  },
  {
    id: "elevenlabs-adam-direct",
    provider: "elevenlabs",
    label: "Adam — Direct Male",
    externalVoiceId: "pNInz6obpgDQGcFmaJgB",
    useCase: "urgent",
    telephonyOptimized: true,
    style: "direct",
    presentation: "male",
    latencyProfile: "balanced",
    speed: 1.05,
    stability: 0.7,
  },
];

const DEFAULT_VOICE_PROFILE_ID = "cartesia-sarah-sales";

export function listVoiceProfiles(): VoiceProfile[] {
  return VOICE_PROFILES;
}

export function getVoiceProfileById(voiceProfileId?: string | null): VoiceProfile {
  return VOICE_PROFILES.find((profile) => profile.id === voiceProfileId) ??
    VOICE_PROFILES.find((profile) => profile.id === DEFAULT_VOICE_PROFILE_ID)!;
}

export async function getUserVoiceProfileId(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const key = `user:${userId}:voice_profile_id`;
  const rows = await db.select().from(systemConfig).where(eq(systemConfig.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

export async function setUserVoiceProfileId(userId: number, voiceProfileId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(systemConfig).values({
    key: `user:${userId}:voice_profile_id`,
    value: voiceProfileId,
    category: "voice",
  }).onDuplicateKeyUpdate({
    set: {
      value: voiceProfileId,
      category: "voice",
    },
  });
}

export async function resolveVoiceProfile(args: {
  userId?: number | null;
  campaignId?: number | null;
  leadId?: number | null;
  explicitVoiceProfileId?: string | null;
}): Promise<VoiceProfile> {
  if (args.explicitVoiceProfileId) {
    return getVoiceProfileById(args.explicitVoiceProfileId);
  }

  if (args.campaignId) {
    const campaign = await getCampaignById(args.campaignId);
    const settings = campaign?.settings ? safeParseJson(campaign.settings) : null;
    const campaignVoice = typeof settings?.voiceProfileId === "string" ? settings.voiceProfileId : null;
    if (campaignVoice) {
      return getVoiceProfileById(campaignVoice);
    }
  }

  let userId = args.userId ?? null;
  if (!userId && args.leadId) {
    const lead = await getLeadById(args.leadId);
    userId = ((lead as any)?.createdBy as number | null) ?? null;
  }

  if (userId) {
    const userVoiceProfileId = await getUserVoiceProfileId(userId);
    if (userVoiceProfileId) {
      return getVoiceProfileById(userVoiceProfileId);
    }
  }

  return getVoiceProfileById(DEFAULT_VOICE_PROFILE_ID);
}

export async function getUserVoiceSettings(userId: number): Promise<{
  voiceProfileId: string;
}> {
  const [voiceProfileId] = await Promise.all([
    getUserVoiceProfileId(userId),
  ]);

  return {
    voiceProfileId: voiceProfileId || DEFAULT_VOICE_PROFILE_ID,
  };
}

function safeParseJson(value: string): Record<string, unknown> | null {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}
