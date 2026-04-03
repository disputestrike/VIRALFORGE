/**
 * Strict voice controller — shared types (authoritative control layer above the LLM).
 */

export const HARD_RULES = {
  MAX_REPEAT_SAME_QUESTION: 1,
  MAX_FALLBACKS_BEFORE_HANDOFF: 2,
  STREAM_RECOVERY_TIMEOUT_MS: 5000,
  PRE_RESPONSE_MICRO_PAUSE_MS: 250,
  MAX_RECENT_TURNS_TO_MODEL: 6,
} as const;

export type StrictIntent =
  | "ask_what_it_is"
  | "pricing_question"
  | "setup_time_question"
  | "success_rate_question"
  | "service_area_question"
  | "industry_fit_question"
  | "booking_interest"
  | "objection"
  | "confusion"
  | "topic_shift"
  | "human_request"
  | "end_call"
  | "provide_contact_info"
  | "provide_availability"
  | "date_time_question"
  | "meta_voice_complaint"
  | "question"
  | "statement"
  | "unknown";

export interface StrictFacts {
  industry?: string;
  subIndustry?: string;
  callVolume?: number;
  /** Caller-stated pain themes (missed calls, conversion, etc.) */
  painLabels: string[];
  name?: string;
  phoneDigits?: string;
  discussedTopics: string[];
}

export interface ClassifiedTurn {
  intent: StrictIntent;
  confidence: number;
  topicShift?: boolean;
  asksForHuman?: boolean;
  indicatesDone?: boolean;
  asksForDate?: boolean;
  asksForBooking?: boolean;
  providesContactInfo?: boolean;
  providesAvailability?: boolean;
  containsObjection?: boolean;
  containsConfusion?: boolean;
}

export function emptyStrictFacts(): StrictFacts {
  return { painLabels: [], discussedTopics: [] };
}
