/**
 * Controller-chosen conversation mode for this turn (overrides loose policy ordering when needed).
 */

import type { ConversationMode, ConversationPolicyState } from "./callPolicy";
import type { ClassifiedTurn, StrictFacts } from "./strictTypes";
import { canStrictBook } from "./bookingGuard";

export function determineStrictConversationMode(
  policy: ConversationPolicyState,
  classified: ClassifiedTurn,
  facts: StrictFacts
): ConversationMode {
  if (classified.indicatesDone || policy.endCallRequested) return "close";
  if (classified.asksForHuman) return "handoff";
  if (classified.intent === "date_time_question") return "answer";
  if (classified.intent === "meta_voice_complaint") return "clarify";
  if (classified.containsConfusion || classified.intent === "confusion") return "clarify";

  if (
    classified.intent === "pricing_question" ||
    classified.intent === "success_rate_question" ||
    classified.intent === "setup_time_question" ||
    classified.intent === "service_area_question" ||
    classified.intent === "industry_fit_question" ||
    classified.intent === "ask_what_it_is"
  ) {
    return "answer";
  }

  if (classified.containsObjection) return "recommend";

  if (canStrictBook(policy, facts, classified)) return "book";
  if (
    (classified.asksForBooking || classified.intent === "booking_interest") &&
    policy.interestConfirmed &&
    policy.questionAnswered
  ) {
    return facts.industry ? "book" : "qualify";
  }
  if (classified.providesContactInfo || classified.providesAvailability) return "book";

  if (!policy.questionAnswered && policy.activeQuestion) return "answer";
  if (!policy.interestConfirmed) return "qualify";
  if (!policy.bookingAllowed) return "recommend";
  return policy.mode;
}
