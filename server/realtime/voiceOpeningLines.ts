/**
 * Rotated inbound greetings - callers hear a clear difference call-to-call vs one frozen script.
 * Paired with dynamicPrompt rules: don't repeat this line when the LLM replies.
 */

import { isApexPlatformDemoLine } from "./clientConfig";
import type { SessionConversationMode } from "./tenantVoiceRuntime";

export type InboundGreetingInput = {
  businessName: string;
  /** Voice session id - stable pick per call */
  sessionId?: string;
  /** Curated or universal vertical label (e.g. "Solar Energy") */
  industryLabel?: string;
  /** When true, use Apex platform-style openers */
  apexProductLine?: boolean;
  /** Spoken name in greetings; defaults to Alex */
  agentDisplayName?: string;
  assistantName?: string;
  mode?: SessionConversationMode;
};

function stableIndex(key: string | undefined, modulo: number): number {
  if (!key || modulo <= 1) return 0;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % modulo;
}

function cleanIndustryHint(label?: string): string | undefined {
  if (!label?.trim()) return undefined;
  const t = label.trim();
  if (/^general business$/i.test(t)) return undefined;
  if (t.length > 42) return `${t.slice(0, 40).trimEnd()}...`;
  return t;
}

function tenantOpeners(
  businessName: string,
  industryHint?: string,
  assistantName = "Alex",
  mode: SessionConversationMode = "inbound_support"
): string[] {
  const b = businessName.trim() || "us";
  if (mode === "customer_support") {
    return [
      `Thanks for calling ${b}. This is ${assistantName}. Tell me what's going on and I'll help from here.`,
      `${b}, ${assistantName} speaking. What's happening so I can get this sorted quickly?`,
      `You've reached ${b}. I'm ${assistantName}. What can I help you fix today?`,
    ];
  }
  if (mode === "appointment_booking") {
    return [
      `Thanks for calling ${b}. This is ${assistantName}. Are you looking to schedule something today?`,
      `${b}, ${assistantName} speaking. I can help you get that on the calendar. What do you need?`,
      `You've reached ${b}. I'm ${assistantName}. What appointment are you trying to set up?`,
    ];
  }
  if (industryHint) {
    return [
      `Thanks for calling ${b}. This is ${assistantName}. How can I help with ${industryHint} today?`,
      `${b}, ${assistantName} speaking. If this is about ${industryHint}, you're in the right place. What's going on?`,
      `You've reached ${b}. I'm ${assistantName}. What can I help you with regarding ${industryHint}?`,
      `Hi, ${b} here. This is ${assistantName}. What do you need help with today?`,
    ];
  }
  return [
    `Thanks for calling ${b}. This is ${assistantName}. What can I help you with today?`,
    `${b}, ${assistantName} speaking. How can I help?`,
    `You've reached ${b}. I'm ${assistantName}. What's on your mind today?`,
    `Hi there, ${b} here. This is ${assistantName}. What brought you in today?`,
  ];
}

function apexPlatformOpeners(
  businessName: string,
  assistantName = "Alex"
): string[] {
  const b = businessName.trim() || "ApexAI";
  return [
    `Thanks for calling ${b}. This is ${assistantName}. We help companies run human-sounding AI phone agents for inbound and outbound calls. What would you like to explore today?`,
    `${b}, ${assistantName} speaking. I can walk you through our AI calling platform, booking flows, and SMS follow-up. What are you looking into?`,
    `Hi, this is ${assistantName} with ${b}. We help teams automate live phone conversations without sounding robotic. What would you like to go over first?`,
    `Welcome to ${b}. I'm ${assistantName}. If you want to hear how we handle inbound calls, outbound follow-up, or scheduling, I can show you. Where should we start?`,
  ];
}

/**
 * Pick the spoken inbound greeting (u-law TTS). Varies by sessionId so repeat callers get fresh openers.
 */
export function selectInboundGreeting(input: InboundGreetingInput): string {
  const name = input.businessName.trim() || "our team";
  const assistantName =
    (input.assistantName ?? input.agentDisplayName ?? "").trim() || "Alex";
  const apex = input.apexProductLine ?? isApexPlatformDemoLine(name);
  const hint = cleanIndustryHint(input.industryLabel);
  const pool = apex
    ? apexPlatformOpeners(name, assistantName)
    : tenantOpeners(name, hint, assistantName, input.mode);
  const idx = stableIndex(input.sessionId ?? `call_${Date.now()}`, pool.length);
  return pool[idx]!;
}

/** Outbound cold intro - rotated so not identical every dial. */
export function selectOutboundIntro(input: {
  businessName: string;
  sessionId?: string;
  assistantName?: string;
  agentDisplayName?: string;
}): string {
  const b = input.businessName.trim() || "our team";
  const assistantName =
    (input.assistantName ?? input.agentDisplayName ?? "").trim() || "Alex";
  const pool = [
    `Hi, this is ${assistantName} from ${b} - did I catch you at an okay time?`,
    `Hey - ${assistantName} with ${b}. I can keep this short if now's okay.`,
    `${b}, ${assistantName} calling - do you have a quick minute, and if not I can call back.`,
  ];
  return pool[stableIndex(input.sessionId, pool.length)]!;
}
