/**
 * Lightweight deterministic intent classifier — not a second LLM.
 */

import { detectEndCallIntent, detectLiveTransferIntent, detectUserQuestion, isObjection } from "./callPolicy";
import { isDateRelatedQuestion } from "./dateAuthority";
import type { ClassifiedTurn, StrictIntent } from "./strictTypes";

const HUMAN_HINT = /\b(human|person|real (person|human)|live agent|representative|transfer me|speak to someone)\b/i;
const BOOK_HINT = /\b(book|schedule|appointment|set up a (time|call)|calendar)\b/i;
const DEMO_HINT = /\b(demo|show me|walk me through|test it|role ?play|roleplay|pretend|simulate|how does this work|can I try|let me see)\b/i;
const SUPPORT_HINT =
  /\b(problem|issue|support|broken|isn'?t working|not working|help with|trouble|error|fix|reset password|billing issue)\b/i;
const PRICE_HINT = /\b(price|pricing|cost|how much|fee|plan)\b/i;
const SUCCESS_HINT = /\b(success rate|results|prove|guarantee|roi|work for)\b/i;
const SETUP_HINT = /\b(set ?up|install|get started|onboarding|how long)\b/i;
const AREA_HINT = /\b(zip|area code|serve|coverage|where do you)\b/i;
const WHAT_DO_HINT = /\bwhat (do you|does|is apex)|who are you|tell me about (you|apex)\b/i;
const CONFUSION_HINT = /\b(don'?t understand|what do you mean|huh\??|confus|make sense|what\?\s*$)\b/i;
const META_VOICE = /\b(breath|breathing|robot|ai|boring|voice|sound like)\b/i;
const AVAIL_HINT = /\b(tomorrow|today|next week|morning|afternoon|\d{1,2}\s*(:\d{2})?\s*(am|pm)|works for me|that works)\b/i;

function pickIntent(text: string): StrictIntent {
  const t = text.toLowerCase();
  const hasBookHint = BOOK_HINT.test(t);
  const hasDemoHint = DEMO_HINT.test(t);
  if (detectEndCallIntent(text)) return "end_call";
  if (HUMAN_HINT.test(text) || detectLiveTransferIntent(text)) return "human_request";
  if (isDateRelatedQuestion(text) && !hasBookHint) return "date_time_question"; // server answers — never LLM-guess
  if (META_VOICE.test(text) && t.length < 120) return "meta_voice_complaint";
  if (WHAT_DO_HINT.test(t)) return "ask_what_it_is";
  if (hasBookHint) return "booking_interest";
  if (hasDemoHint) return "demo_request";
  if (SUPPORT_HINT.test(t)) return "support_request";
  if (PRICE_HINT.test(t)) return "pricing_question";
  if (SUCCESS_HINT.test(t)) return "success_rate_question";
  if (SETUP_HINT.test(t)) return "setup_time_question";
  if (AREA_HINT.test(t)) return "service_area_question";
  if (/\b(industry|what kind of business|what do you run|type of business)\b/i.test(t)) return "industry_fit_question";
  if (isObjection(text)) return "objection";
  if (CONFUSION_HINT.test(t) || /^(what|huh)\??$/i.test(text.trim())) return "confusion";
  if (detectUserQuestion(text) && !PRICE_HINT.test(t) && !AREA_HINT.test(t)) return "question";
  if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(text) || /\b\d{10,11}\b/.test(text.replace(/\D/g, "")))
    return "provide_contact_info";
  if (AVAIL_HINT.test(t) && BOOK_HINT.test(t)) return "provide_availability";
  if (AVAIL_HINT.test(t) && t.length < 80) return "provide_availability";
  return "unknown";
}

export function classifyTurn(text: string): ClassifiedTurn {
  const intent = pickIntent(text);
  const t = text.toLowerCase();
  return {
    intent,
    confidence: 0.85,
    asksForHuman: HUMAN_HINT.test(text) || detectLiveTransferIntent(text),
    indicatesDone: detectEndCallIntent(text),
    asksForDate: isDateRelatedQuestion(text),
    asksForBooking: BOOK_HINT.test(text),
    providesContactInfo: /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(text) || /\b\d{10,11}\b/.test(text.replace(/\D/g, "")),
    providesAvailability: AVAIL_HINT.test(t),
    containsObjection: isObjection(text),
    containsConfusion: CONFUSION_HINT.test(t),
  };
}
