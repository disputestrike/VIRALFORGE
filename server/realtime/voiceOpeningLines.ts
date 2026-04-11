/**
 * Rotated inbound greetings — callers hear a clear difference call-to-call vs one frozen script.
 * Paired with dynamicPrompt rules: don't repeat this line when the LLM replies.
 */

import { isApexPlatformDemoLine } from "./clientConfig";

export type InboundGreetingInput = {
  businessName: string;
  /** Voice session id — stable pick per call */
  sessionId?: string;
  /** Curated or universal vertical label (e.g. "Solar Energy") */
  industryLabel?: string;
  /** When true, use Apex platform-style openers */
  apexProductLine?: boolean;
  /** Spoken name in greetings; defaults to Alex */
  agentDisplayName?: string;
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
  if (t.length > 42) return t.slice(0, 40).trimEnd() + "…";
  return t;
}

function tenantOpeners(businessName: string, agent: string, industryHint?: string): string[] {
  const b = businessName.trim() || "us";
  const a = agent.trim() || "Alex";
  if (industryHint) {
    return [
      `Thanks for calling ${b}. This is ${a}. How can I help with ${industryHint} today?`,
      `${b}, ${a} speaking. If this is about ${industryHint}, you're in the right place. What's going on?`,
      `You've reached ${b}. I'm ${a}. What can I help you with regarding ${industryHint}?`,
      `Hi, ${b} here. This is ${a}. What do you need help with today?`,
    ];
  }
  return [
    `Thanks for calling ${b}. This is ${a}. What can I help you with today?`,
    `${b}, ${a} speaking. How can I help?`,
    `You've reached ${b}. I'm ${a}. What's on your mind today?`,
    `Hi there, ${b} here. This is ${a}. What brought you in today?`,
  ];
}

function apexPlatformOpeners(businessName: string, agent: string): string[] {
  const b = businessName.trim() || "ApexAI";
  const a = agent.trim() || "Alex";
  return [
    `Thanks for calling ${b}. This is ${a}. What would you like to know today?`,
    `${b}, ${a} speaking. What can I help you figure out today?`,
    `Hi, this is ${a} with ${b}. What would you like to go over today?`,
    `Welcome to ${b}. I'm ${a}. How can I help today?`,
  ];
}

/**
 * Pick the spoken inbound greeting (μ-law TTS). Varies by sessionId so repeat callers get fresh openers.
 */
export function selectInboundGreeting(input: InboundGreetingInput): string {
  const name = input.businessName.trim() || "our team";
  const agent = (input.agentDisplayName ?? "").trim() || "Alex";
  const apex = input.apexProductLine ?? isApexPlatformDemoLine(name);
  const hint = cleanIndustryHint(input.industryLabel);
  const pool = apex ? apexPlatformOpeners(name, agent) : tenantOpeners(name, agent, hint);
  const idx = stableIndex(input.sessionId ?? `call_${Date.now()}`, pool.length);
  return pool[idx]!;
}

/** Outbound cold intro — rotated so not identical every dial. */
export function selectOutboundIntro(input: { businessName: string; sessionId?: string; agentDisplayName?: string }): string {
  const b = input.businessName.trim() || "our team";
  const a = (input.agentDisplayName ?? "").trim() || "Alex";
  const pool = [
    `Hi, this is ${a} from ${b} — do you have a quick moment?`,
    `Hey — ${a} with ${b}. Got a minute for a quick call?`,
    `${b}, ${a} calling — is now a decent time for a short chat?`,
  ];
  return pool[stableIndex(input.sessionId, pool.length)]!;
}
