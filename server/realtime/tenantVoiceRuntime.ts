import { eq } from "drizzle-orm";

import { systemConfig } from "../../drizzle/schema";
import { getDb } from "../db";
import { normalizeToE164US } from "../_core/phoneE164";

export type ConversationPace = "relaxed" | "balanced" | "fast";
export type WarmthLevel = "steady" | "warm" | "premium";
export type FormalityLevel = "conversational" | "professional" | "executive";
export type PauseStyle = "tight" | "balanced" | "patient";
export type FillerPolicy = "none" | "minimal" | "natural";
export type InterruptionSensitivity = "aggressive" | "balanced" | "patient";
export type SessionConversationMode =
  | "platform_demo"
  | "outbound_sales"
  | "inbound_support"
  | "appointment_booking"
  | "customer_support";

export type TenantVoiceRuntimeProfile = {
  assistantName: string;
  tonePreset: string;
  warmth: WarmthLevel;
  formality: FormalityLevel;
  pace: ConversationPace;
  pauseStyle: PauseStyle;
  fillerPolicy: FillerPolicy;
  interruptionSensitivity: InterruptionSensitivity;
  pronunciationHints: string[];
};

export type TenantVoiceRuntimeInput = Partial<
  Omit<TenantVoiceRuntimeProfile, "pronunciationHints">
> & {
  pronunciationHints?: string[] | null;
  pronunciationHintsText?: string | null;
};

const USER_VOICE_RUNTIME_KEY = (userId: number) =>
  `user:${userId}:voice_runtime_profile`;

export const PUBLIC_DEMO_BUSINESS_NAME = "ApexAI";
export const PUBLIC_DEMO_INDUSTRY =
  "AI phone agent platform for inbound, outbound, booking, and SMS automation";
export const DEFAULT_PUBLIC_DEMO_PHONE_NUMBER = "+18336596005";
const DEFAULT_PUBLIC_DEMO_OWNER_ID = 1;

export const DEFAULT_TENANT_VOICE_RUNTIME: TenantVoiceRuntimeProfile = {
  assistantName: "Alex",
  tonePreset: "warm, concise, competent",
  warmth: "warm",
  formality: "professional",
  pace: "balanced",
  pauseStyle: "balanced",
  fillerPolicy: "minimal",
  interruptionSensitivity: "balanced",
  pronunciationHints: [],
};

function parseJson<T>(value: string | null | undefined): Partial<T> | null {
  if (!value?.trim()) return null;
  try {
    return JSON.parse(value) as Partial<T>;
  } catch {
    return null;
  }
}

function cleanString(value: string | null | undefined): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed : undefined;
}

function normalizePronunciationHints(
  input?: string[] | string | null
): string[] {
  if (Array.isArray(input)) {
    return input
      .map((value) => cleanString(value))
      .filter((value): value is string => Boolean(value))
      .slice(0, 24);
  }
  const text = cleanString(input);
  if (!text) return [];
  return text
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 24);
}

export function mergeTenantVoiceRuntimeProfile(
  input?: TenantVoiceRuntimeInput | null
): TenantVoiceRuntimeProfile {
  return {
    assistantName:
      cleanString(input?.assistantName) ??
      DEFAULT_TENANT_VOICE_RUNTIME.assistantName,
    tonePreset:
      cleanString(input?.tonePreset) ?? DEFAULT_TENANT_VOICE_RUNTIME.tonePreset,
    warmth:
      input?.warmth ?? DEFAULT_TENANT_VOICE_RUNTIME.warmth,
    formality:
      input?.formality ?? DEFAULT_TENANT_VOICE_RUNTIME.formality,
    pace: input?.pace ?? DEFAULT_TENANT_VOICE_RUNTIME.pace,
    pauseStyle:
      input?.pauseStyle ?? DEFAULT_TENANT_VOICE_RUNTIME.pauseStyle,
    fillerPolicy:
      input?.fillerPolicy ?? DEFAULT_TENANT_VOICE_RUNTIME.fillerPolicy,
    interruptionSensitivity:
      input?.interruptionSensitivity ??
      DEFAULT_TENANT_VOICE_RUNTIME.interruptionSensitivity,
    pronunciationHints: normalizePronunciationHints(
      input?.pronunciationHintsText ?? input?.pronunciationHints ?? null
    ),
  };
}

export function pronunciationHintsToText(hints: string[] | null | undefined): string {
  return (hints ?? []).join("\n");
}

export async function getTenantVoiceRuntimeProfile(
  userId?: number | null
): Promise<TenantVoiceRuntimeProfile> {
  if (!userId) return DEFAULT_TENANT_VOICE_RUNTIME;
  const db = await getDb();
  if (!db) return DEFAULT_TENANT_VOICE_RUNTIME;
  if (typeof (db as any).select !== "function") return DEFAULT_TENANT_VOICE_RUNTIME;
  const [row] = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.key, USER_VOICE_RUNTIME_KEY(userId)))
    .limit(1);
  return mergeTenantVoiceRuntimeProfile(
    parseJson<TenantVoiceRuntimeProfile>(row?.value)
  );
}

export async function setTenantVoiceRuntimeProfile(
  userId: number,
  input: TenantVoiceRuntimeInput
): Promise<TenantVoiceRuntimeProfile> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const merged = mergeTenantVoiceRuntimeProfile({
    ...(await getTenantVoiceRuntimeProfile(userId)),
    ...input,
  });
  await db
    .insert(systemConfig)
    .values({
      key: USER_VOICE_RUNTIME_KEY(userId),
      value: JSON.stringify(merged),
      category: "voice_runtime",
    })
    .onDuplicateKeyUpdate({
      set: {
        value: JSON.stringify(merged),
        category: "voice_runtime",
      },
    });
  return merged;
}

export function resolveSessionConversationMode(input: {
  businessName?: string | null;
  callDirection?: "inbound" | "outbound" | null;
  outboundScript?: string | null;
  appointmentContext?: boolean;
}): SessionConversationMode {
  const business = cleanString(input.businessName)?.toLowerCase() ?? "";
  const outboundScript = cleanString(input.outboundScript);
  if (business.replace(/[^a-z0-9]/g, "") === "apexai") return "platform_demo";
  if (input.appointmentContext) return "appointment_booking";
  if (input.callDirection === "outbound") return "outbound_sales";
  if (outboundScript) return "outbound_sales";
  if (business.includes("support") || business.includes("service")) {
    return "customer_support";
  }
  return "inbound_support";
}

export function buildConversationDirective(input: {
  mode: SessionConversationMode;
  profile: TenantVoiceRuntimeProfile;
  businessName: string;
  industry: string;
  language?: string | null;
  isApexDemo?: boolean;
}): string {
  const languageHint = cleanString(input.language);
  const pronunciationBlock = input.profile.pronunciationHints.length
    ? `Pronunciation hints: ${input.profile.pronunciationHints.join(", ")}.`
    : "Pronunciation hints: none supplied.";

  const modeDirective: Record<SessionConversationMode, string> = {
    platform_demo:
      "MODE: platform demo. Explain clearly, offer short live roleplay when invited, and stay commercially sharp without sounding like a pitch deck.",
    outbound_sales:
      "MODE: outbound sales. First line should identify the business and ask permission to continue. Keep the opener short, respect opt-out immediately, and never trap the caller in a monologue.",
    inbound_support:
      "MODE: inbound support. Answer first, acknowledge the exact issue, and move toward resolution or booking without sounding like a menu tree.",
    appointment_booking:
      "MODE: appointment setting. Slow down slightly for names, dates, times, phone numbers, and repeat critical details back naturally before finalizing.",
    customer_support:
      "MODE: customer support. Be especially specific with empathy, reference the concrete problem, and escalate quickly if the caller is frustrated or the topic is outside scope.",
  };

  return `=== HUMAN CONVERSATION OPERATING MODEL ===
You are in a live full-duplex phone conversation. Act like the caller can interrupt at any time and you can recover cleanly without restarting.

VOICE IDENTITY
- Assistant name: ${input.profile.assistantName}
- Tone preset: ${input.profile.tonePreset}
- Warmth: ${input.profile.warmth}
- Formality: ${input.profile.formality}
- Pace: ${input.profile.pace}
- Pause style: ${input.profile.pauseStyle}
- Filler policy: ${input.profile.fillerPolicy}
- Interruption sensitivity: ${input.profile.interruptionSensitivity}
- ${pronunciationBlock}

TURN-TAKING RULES
- Keep most replies to one or two short spoken sentences. Use a third only when needed.
- Answer the caller's real question before asking anything new.
- Use brief acknowledgments that rotate naturally. Do not repeat the same acknowledgment twice in a row.
- If the caller interrupts, adapt immediately. Do not resume the exact same script from the top.
- If you need clarification, ask one focused repair question instead of a vague reset.
- When emotion is present, mirror it specifically: name the issue, not a generic sympathy line.
- Never sound like you are reading a script or writing an email.

CAMPAIGN BEHAVIOR
${modeDirective[input.mode]}

BUSINESS CONTEXT
- Business: ${input.businessName}
- Industry: ${input.industry}
- Language: ${languageHint || "default to English unless the caller clearly speaks another configured language"}
- ${input.isApexDemo ? "This is the ApexAI public demo experience, so show capability clearly while still sounding like a real operator." : "This is a real customer-facing business line, so stay grounded in business facts, booking rules, and tenant knowledge."}

NON-NEGOTIABLE HUMANIZATION RULES
- Human feel comes from timing, specificity, and recovery, not hype.
- Never stack multiple questions in one turn.
- Avoid canned filler like "happy to assist" and "I appreciate you reaching out."
- Respect compliance lines, opt-outs, and transfer requests immediately.
- If you do not know, say so briefly and offer the next useful move.`;
}

export function getLatencyBudgetForMode(input: {
  mode: SessionConversationMode;
  pace: ConversationPace;
}): number {
  const baseByMode: Record<SessionConversationMode, number> = {
    platform_demo: 820,
    outbound_sales: 760,
    inbound_support: 850,
    appointment_booking: 900,
    customer_support: 900,
  };
  const paceAdjust: Record<ConversationPace, number> = {
    fast: -80,
    balanced: 0,
    relaxed: 80,
  };
  return Math.max(650, baseByMode[input.mode] + paceAdjust[input.pace]);
}

export function getUserSilenceReengageMs(input: {
  mode: SessionConversationMode;
  pauseStyle: PauseStyle;
}): number {
  const modeBase: Record<SessionConversationMode, number> = {
    platform_demo: 6000,
    outbound_sales: 5000,
    inbound_support: 7000,
    appointment_booking: 8000,
    customer_support: 8500,
  };
  const pauseAdjust: Record<PauseStyle, number> = {
    tight: -1200,
    balanced: 0,
    patient: 1600,
  };
  return Math.max(3000, modeBase[input.mode] + pauseAdjust[input.pauseStyle]);
}

export function getInterruptAckMinSpeechMs(
  sensitivity: InterruptionSensitivity
): number {
  const thresholds: Record<InterruptionSensitivity, number> = {
    aggressive: 120,
    balanced: 220,
    patient: 320,
  };
  return thresholds[sensitivity];
}

export function getPublicDemoConfig(): {
  enabled: boolean;
  mode: "call-me" | "public-number" | "both";
  phoneNumber: string | null;
  formattedPhoneNumber: string | null;
  telHref: string | null;
} {
  const rawMode =
    cleanString(process.env.PUBLIC_DEMO_MODE)?.toLowerCase() ?? "both";
  const mode =
    rawMode === "call-me" || rawMode === "public-number" || rawMode === "both"
      ? rawMode
      : "both";
  const phoneNumber =
    cleanString(process.env.PUBLIC_DEMO_PHONE_NUMBER) ??
    DEFAULT_PUBLIC_DEMO_PHONE_NUMBER;
  const normalized = phoneNumber ? normalizeToE164US(phoneNumber) : null;
  const digits = normalized?.replace(/\D/g, "") ?? "";
  const formattedPhoneNumber =
    digits.length === 11 && digits.startsWith("1")
      ? `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
      : normalized;
  return {
    enabled: mode !== "call-me" || Boolean(normalized),
    mode,
    phoneNumber: normalized,
    formattedPhoneNumber: formattedPhoneNumber ?? null,
    telHref: normalized ? `tel:${normalized}` : null,
  };
}

export function getPublicDemoOwnerId(): number {
  const raw = Number(process.env.PUBLIC_DEMO_USER_ID || DEFAULT_PUBLIC_DEMO_OWNER_ID);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_PUBLIC_DEMO_OWNER_ID;
}

export function isPublicDemoPhoneNumber(
  phoneNumber: string | null | undefined
): boolean {
  const normalized = normalizeToE164US(phoneNumber ?? "");
  const demoNumber = getPublicDemoConfig().phoneNumber;
  return Boolean(normalized && demoNumber && normalized === demoNumber);
}
