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

function tenantOpeners(businessName: string, industryHint?: string): string[] {
  const b = businessName.trim() || "us";
  if (industryHint) {
    return [
      `Thanks for calling ${b}. This is Alex. How can I help with ${industryHint} today?`,
      `${b}, Alex speaking. If this is about ${industryHint}, you're in the right place. What's going on?`,
      `You've reached ${b}. I'm Alex. What can I help you with regarding ${industryHint}?`,
      `Hi, ${b} here. This is Alex. What do you need help with today?`,
    ];
  }
  return [
    `Thanks for calling ${b}. This is Alex. What can I help you with today?`,
    `${b}, Alex speaking. How can I help?`,
    `You've reached ${b}. I'm Alex. What's on your mind today?`,
    `Hi there, ${b} here. This is Alex. What brought you in today?`,
  ];
}

function apexPlatformOpeners(businessName: string): string[] {
  const b = businessName.trim() || "ApexAI";
  return [
    `Thanks for calling ${b}. This is Alex. What would you like to know today?`,
    `${b}, Alex speaking. What can I help you figure out today?`,
    `Hi, this is Alex with ${b}. What would you like to go over today?`,
    `Welcome to ${b}. I'm Alex. How can I help today?`,
  ];
}

/**
 * Pick the spoken inbound greeting (μ-law TTS). Varies by sessionId so repeat callers get fresh openers.
 */
export function selectInboundGreeting(input: InboundGreetingInput): string {
  const name = input.businessName.trim() || "ApexAI";
  const apex = input.apexProductLine ?? isApexPlatformDemoLine(name);
  const hint = cleanIndustryHint(input.industryLabel);
  const pool = apex ? apexPlatformOpeners(name) : tenantOpeners(name, hint);
  const idx = stableIndex(input.sessionId ?? `call_${Date.now()}`, pool.length);
  return pool[idx]!;
}

/** Outbound cold intro — rotated so not identical every dial. */
export function selectOutboundIntro(input: { businessName: string; sessionId?: string }): string {
  const b = input.businessName.trim() || "ApexAI";
  const pool = [
    `Hi, this is Alex from ${b} — do you have a quick moment?`,
    `Hey — Alex with ${b}. Got a minute for a quick call?`,
    `${b}, Alex calling — is now a decent time for a short chat?`,
  ];
  return pool[stableIndex(input.sessionId, pool.length)]!;
}
