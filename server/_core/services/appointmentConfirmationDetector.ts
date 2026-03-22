/**
 * FIX 4: Smart Appointment Confirmation Detection
 * 
 * Current: Just checks if text contains "yes" or a number
 * Problem: "Yeah I'm good" books an appointment
 *          "Friday is bad" tries to book Friday
 * 
 * Solution: Confidence scoring + explicit confirmation
 */

export interface ConfirmationResult {
  isConfirming: boolean;
  confidence: number; // 0-1
  selectedSlotIndex?: number;
  requiresExplicitConfirmation: boolean; // "Did you mean..."
  reason: string;
}

/**
 * Detect if user is confirming appointment
 */
export function detectAppointmentConfirmation(
  userText: string,
  previousContext?: {
    hasProposedSlots: boolean;
    lastAIMessage?: string;
    waitingForTimeSelection: boolean;
  }
): ConfirmationResult {
  const lower = userText.toLowerCase().trim();

  // STRONG YES signals (high confidence)
  const strongYes = /\b(yes|yep|yeah|absolutely|definitely|perfect|sounds?\s+(?:good|great|perfect)|that\s+works?|that's?\s+(?:great|good|perfect)|absolutely|confirmed?|let'?s?\s+do\s+it)\b/i;

  // WEAK YES signals (lower confidence - could be context-dependent)
  const weakYes = /\b(good|great|ok|okay|sure|fine|works?|can|could|might)\b/i;

  // REJECTION signals (high confidence negation)
  const rejection = /\b(no|don't|doesn't|not|can't|won't|can'?t|won'?t|nope|nah|bad|busy|conflict|unfortunately)\b/i;

  // Try to extract time slot selection (1, 2, 3, first, second, third)
  const slotMatch = lower.match(/(?:(?:the\s+)?(?:first|1st)|(?:the\s+)?(?:second|2nd)|(?:the\s+)?(?:third|3rd)|^[1-3]$|\b([1-3])\b)/i);
  const selectedSlot = slotMatch ? (slotMatch[1] ? parseInt(slotMatch[1]) : (lower.includes('first') || lower.includes('1st') ? 1 : lower.includes('second') || lower.includes('2nd') ? 2 : 3)) : undefined;

  // Context matters
  const isSoonAfterProposal = previousContext?.waitingForTimeSelection === true;

  // CASE 1: Explicit confirmation + time selection (HIGHEST CONFIDENCE)
  if (strongYes.test(lower) && selectedSlot) {
    return {
      isConfirming: true,
      confidence: 0.95,
      selectedSlotIndex: selectedSlot - 1,
      requiresExplicitConfirmation: false,
      reason: 'Strong confirmation with time selection',
    };
  }

  // CASE 2: Rejection (HIGHEST CONFIDENCE)
  if (rejection.test(lower)) {
    return {
      isConfirming: false,
      confidence: 0.9,
      requiresExplicitConfirmation: false,
      reason: 'User rejected appointment',
    };
  }

  // CASE 3: Strong yes but no time selection, and we proposed slots
  if (strongYes.test(lower) && isSoonAfterProposal) {
    return {
      isConfirming: true,
      confidence: 0.8,
      selectedSlotIndex: 0, // Default to first slot if they said yes without choosing
      requiresExplicitConfirmation: true, // But ask "Did you mean the first one?"
      reason: 'Strong confirmation without explicit slot selection',
    };
  }

  // CASE 4: Only time selection without yes/no (AMBIGUOUS)
  if (selectedSlot && isSoonAfterProposal && !strongYes.test(lower)) {
    return {
      isConfirming: true,
      confidence: 0.65,
      selectedSlotIndex: selectedSlot - 1,
      requiresExplicitConfirmation: true, // "So you want the second slot?"
      reason: 'Time selection without explicit confirmation',
    };
  }

  // CASE 5: Weak yes without time selection (AMBIGUOUS - could be response to something else)
  if (weakYes.test(lower) && !strongYes.test(lower) && isSoonAfterProposal) {
    return {
      isConfirming: false,
      confidence: 0.3,
      requiresExplicitConfirmation: false,
      reason: 'Weak confirmation without context - need more info',
    };
  }

  // CASE 6: "Friday" or day name without strong yes (AMBIGUOUS)
  const dayMatch = /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(lower);
  if (dayMatch && !strongYes.test(lower) && !rejection.test(lower)) {
    return {
      isConfirming: false,
      confidence: 0.2,
      requiresExplicitConfirmation: false,
      reason: 'Day mentioned but not confirmed - could be just conversation',
    };
  }

  // DEFAULT: Not confirming
  return {
    isConfirming: false,
    confidence: 0,
    requiresExplicitConfirmation: false,
    reason: 'No confirmation detected',
  };
}

/**
 * Generate AI response for ambiguous confirmation
 */
export function generateConfirmationQuestion(
  confirmationResult: ConfirmationResult,
  proposedSlots: { time: string; display: string }[]
): string {
  if (confirmationResult.selectedSlotIndex !== undefined) {
    const slot = proposedSlots[confirmationResult.selectedSlotIndex];
    return `So you want to book ${slot.display}? Just to confirm, that works for you?`;
  }

  if (confirmationResult.isConfirming && confirmationResult.requiresExplicitConfirmation) {
    return `Perfect! Let me book the first available time: ${proposedSlots[0]?.display}. Is that correct?`;
  }

  return `I want to make sure I understand. Are you interested in scheduling an appointment? If so, which time works best for you?`;
}

/**
 * Parse natural language for time slot selection
 */
export function parseTimeSelection(text: string): number | null {
  const lower = text.toLowerCase();

  if (/first|1st|one|^1$/.test(lower)) return 0;
  if (/second|2nd|two|^2$/.test(lower)) return 1;
  if (/third|3rd|three|^3$/.test(lower)) return 2;

  return null;
}

export default {
  detectAppointmentConfirmation,
  generateConfirmationQuestion,
  parseTimeSelection,
};
