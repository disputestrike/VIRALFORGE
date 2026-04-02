/**
 * Strict voice controller — single module for fact merge, pre-LLM routes, and LLM turn plan.
 * Telephony (speak/hangup/transfer) stays in realtimeVoiceEngine; this returns what to do next.
 */

import type { ConversationPolicyState } from "./callPolicy";
import { buildDateAnswer, buildCurrentDateAnchor, isDateRelatedQuestion } from "./dateAuthority";
import { classifyTurn } from "./classifyTurn";
import { mergeStrictFactsFromTranscript } from "./strictFacts";
import { determineStrictConversationMode } from "./determineMode";
import { canStrictBook } from "./bookingGuard";
import { repeatIndustryViolation } from "./repeatGuard";
import { buildStrictControllerBlock } from "./promptEnvelope";
import type { ClassifiedTurn, StrictFacts } from "./strictTypes";

/** Serializable subset persisted on VoiceSession.strictFactsSnapshot */
export interface StrictFactsSessionSnapshot {
  industry?: string;
  subIndustry?: string;
  callVolume?: number;
  painLabels: string[];
  name?: string;
  phoneDigits?: string;
  discussedTopics: string[];
}

export function strictFactsToSessionSnapshot(facts: StrictFacts): StrictFactsSessionSnapshot {
  return {
    industry: facts.industry,
    subIndustry: facts.subIndustry,
    callVolume: facts.callVolume,
    painLabels: [...facts.painLabels],
    name: facts.name,
    phoneDigits: facts.phoneDigits,
    discussedTopics: [...facts.discussedTopics],
  };
}

export function mergeStrictTurnState(
  transcript: string,
  strictFacts: StrictFacts,
  policyState: ConversationPolicyState
): { strictFacts: StrictFacts; policyState: ConversationPolicyState } {
  const nextFacts = mergeStrictFactsFromTranscript(transcript, strictFacts);
  let nextPolicy = policyState;
  if (nextFacts.industry) {
    nextPolicy = { ...nextPolicy, interestConfirmed: true };
  }
  if (nextFacts.painLabels.length > 0) {
    nextPolicy = { ...nextPolicy, interestConfirmed: true };
  }
  return { strictFacts: nextFacts, policyState: nextPolicy };
}

const META_VOICE_REPLY =
  "I'm an AI line — here for quick answers. What do you want to know about handling your inbound calls?";

export type StrictPreLlmRoute =
  | {
      kind: "date_authority";
      speakText: string;
      trace: { intent: string; mode: string };
    }
  | {
      kind: "meta_voice";
      speakText: string;
      trace: { intent: string; mode: string };
    };

/** Deterministic short-circuits before ZIP/discount/LLM (requires classifier output for trace). */
export function routeStrictBeforeLlm(
  transcript: string,
  now: Date,
  classified: ClassifiedTurn
): StrictPreLlmRoute | null {
  if (isDateRelatedQuestion(transcript)) {
    return {
      kind: "date_authority",
      speakText: buildDateAnswer(now, transcript),
      trace: { intent: classified.intent, mode: "answer" },
    };
  }
  if (classified.intent === "meta_voice_complaint") {
    return {
      kind: "meta_voice",
      speakText: META_VOICE_REPLY,
      trace: { intent: classified.intent, mode: "clarify" },
    };
  }
  return null;
}

export type StrictLlmTurnPlan = {
  policyForPrompt: ConversationPolicyState;
  strictBlock: string;
  classified: ClassifiedTurn;
  trace: { intent: string; mode: string };
};

export function planStrictLlmTurn(opts: {
  policyState: ConversationPolicyState;
  strictFacts: StrictFacts;
  transcript: string;
  lastAssistantQuestion: string | null | undefined;
  now: Date;
  classified: ClassifiedTurn;
}): StrictLlmTurnPlan {
  const { classified } = opts;
  const strictMode = determineStrictConversationMode(opts.policyState, classified, opts.strictFacts);
  let policyForPrompt = { ...opts.policyState, mode: strictMode };
  if (strictMode === "book" && !canStrictBook(policyForPrompt, opts.strictFacts, classified)) {
    policyForPrompt = { ...policyForPrompt, mode: "qualify" };
  }
  const strictBlock = buildStrictControllerBlock({
    facts: opts.strictFacts,
    mode: policyForPrompt.mode,
    classified,
    dateAnchor: buildCurrentDateAnchor(opts.now),
    repeatIndustryBan: repeatIndustryViolation(opts.strictFacts, opts.lastAssistantQuestion ?? null),
  });
  return {
    policyForPrompt,
    strictBlock,
    classified,
    trace: { intent: classified.intent, mode: policyForPrompt.mode },
  };
}
