import { eq } from "drizzle-orm";
import { systemConfig } from "../../../drizzle/schema";
import { getDb, getLeadById, getCampaignById } from "../../db";

export type VoiceProfile = {
  id: string;
  provider: "cartesia" | "other";
  label: string;
  externalVoiceId: string;
  useCase: "default" | "sales" | "support" | "luxury" | "urgent";
  telephonyOptimized: boolean;
  style?: string;
  presentation?: string;
  latencyProfile?: "fast" | "balanced" | "premium";
  description?: string;
  recommendedFor?: string;
  sampleLine?: string;
  speed?: number;
  stability?: number;
  /** Cartesia Sonic generation_config.emotion override; else derived from useCase. */
  ttsEmotion?: string;
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
    description: "Warm and upbeat without sounding like a script.",
    recommendedFor: "Inbound sales, first-touch lead qualification, and premium front-desk calls.",
    sampleLine: "Thanks for calling. This is Sarah with ApexAI. Tell me what you need and I'll get you moving.",
    speed: 0.97,
    ttsEmotion: "positivity:high",
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
    description: "Steady, polished, and confident on practical support calls.",
    recommendedFor: "Support, dispatch, and operations-heavy conversations.",
    sampleLine: "You've reached the right place. This is Clyde. Let me get clear on what you need.",
    speed: 0.95,
    ttsEmotion: "calm:high",
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
    description: "Balanced and versatile for mixed inbound workloads.",
    recommendedFor: "General receptionist coverage across multiple call types.",
    sampleLine: "Hi, this is Alex. I'm here to help. What can I do for you today?",
    speed: 0.96,
    ttsEmotion: "curiosity:medium",
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
    description: "Direct and energetic with a stronger sales-floor presence.",
    recommendedFor: "Outbound qualification, confident sales, and stronger closing energy.",
    sampleLine: "Marcus here. Give me the quick version and I'll point you in the right direction fast.",
    speed: 0.98,
    ttsEmotion: "positivity:medium",
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
    description: "Friendly and relaxed while still sounding competent on the phone.",
    recommendedFor: "Service businesses, support lines, and softer relationship-first conversations.",
    sampleLine: "Hi there, Nina here. I'm glad you called. What can I help you sort out today?",
    speed: 0.95,
    ttsEmotion: "positivity:medium",
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
    description: "Firm, clear delivery for urgent, time-sensitive, or higher-stakes calls.",
    recommendedFor: "Escalations, urgent dispatch, and high-clarity appointment or status updates.",
    sampleLine: "Jordan here. I'll keep this simple and clear. What's the situation?",
    speed: 0.94,
    ttsEmotion: "calm:medium",
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
