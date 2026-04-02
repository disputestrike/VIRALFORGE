/**
 * Strict booking gate — industry + need (pain or explicit book intent) + policy.
 */

import type { ConversationPolicyState } from "./callPolicy";
import { canOfferBooking } from "./callPolicy";
import type { ClassifiedTurn, StrictFacts } from "./strictTypes";

export function canStrictBook(
  policy: ConversationPolicyState,
  facts: StrictFacts,
  classified: ClassifiedTurn
): boolean {
  if (!canOfferBooking(policy)) return false;
  if (!facts.industry) return false;
  const hasNeed =
    facts.painLabels.length > 0 || Boolean(classified.asksForBooking);
  return hasNeed;
}
