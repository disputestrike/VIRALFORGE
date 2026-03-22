/**
 * Decision Engine
 * 
 * The brain of the autonomous AI system
 * - Evaluates leads
 * - Decides next actions
 * - Routes leads through the funnel
 * - Classifies outcomes
 * - Determines follow-up strategy
 */

import * as db from '../../db';
import { Lead, Campaign } from '../../shared/types';

export type LeadAction =
  | 'CALL_NOW' // Immediate call
  | 'CALL_LATER' // Schedule call
  | 'RETRY_CALL' // Failed previous attempt
  | 'SMS_FIRST' // Send SMS before calling
  | 'EMAIL_FIRST' // Send email with CTA
  | 'NURTURE' // Send nurture sequence
  | 'DEAD' // No longer viable
  | 'BOOK_APPOINTMENT' // Already qualified, just book
  | 'FOLLOW_UP' // Already contacted, follow up
  | 'WAIT'; // Not ready yet

export type CallOutcome =
  | 'INTERESTED' // Expressed interest
  | 'QUALIFIED' // Met qualification criteria
  | 'OBJECTION' // Raised objection
  | 'NOT_INTERESTED' // Declined
  | 'NO_ANSWER' // Didn't pick up
  | 'VOICEMAIL' // Left voicemail
  | 'CALLBACK' // Requested callback
  | 'APPOINTMENT_BOOKED' // Appointment scheduled
  | 'WRONG_NUMBER' // Invalid number
  | 'BUSY' // Line busy
  | 'ERROR'; // Technical error

export interface DecisionContext {
  lead: Lead;
  campaign?: Campaign;
  previousAttempts?: number;
  lastContactedAt?: number;
  recentOutcomes?: CallOutcome[];
  currentQualification?: {
    interested: boolean;
    budget?: string;
    timeline?: string;
    decision_maker: boolean;
    objections?: string[];
  };
}

// ─── LEAD EVALUATION ───────────────────────────────────────────────────────────

/**
 * Evaluate a lead and determine next action
 */
export async function decideLeadAction(context: DecisionContext): Promise<LeadAction> {
  const { lead, previousAttempts = 0, lastContactedAt, recentOutcomes } = context;

  // Rule 1: Invalid lead
  if (!lead.phone || lead.status === 'lost') {
    return 'DEAD';
  }

  // Rule 2: Already converted
  if (lead.status === 'converted') {
    return 'DEAD';
  }

  // Rule 3: Too many failed attempts
  if (previousAttempts >= 5) {
    return 'NURTURE';
  }

  // Rule 4: Brand new lead
  if (!lastContactedAt || lead.status === 'new') {
    return 'CALL_NOW';
  }

  // Rule 5: Hot/Warm leads - call more aggressively
  if (lead.segment === 'hot') {
    const hoursSinceContact = (Date.now() - lastContactedAt) / 3600000;
    if (hoursSinceContact > 2) {
      return 'CALL_NOW';
    }
    return 'WAIT';
  }

  if (lead.segment === 'warm') {
    const daysSinceContact = (Date.now() - lastContactedAt) / 86400000;
    if (daysSinceContact > 1) {
      return 'CALL_NOW';
    }
    return 'WAIT';
  }

  // Rule 6: Cold leads - space out calls
  if (lead.segment === 'cold') {
    const daysSinceContact = (Date.now() - lastContactedAt) / 86400000;
    if (daysSinceContact > 3) {
      return 'SMS_FIRST'; // Build interest with SMS first
    }
    return 'WAIT';
  }

  // Rule 7: Recent objection - give time
  if (recentOutcomes?.includes('OBJECTION')) {
    const hoursSinceContact = (Date.now() - lastContactedAt) / 3600000;
    if (hoursSinceContact < 24) {
      return 'EMAIL_FIRST'; // Send valuable content
    }
    return 'RETRY_CALL';
  }

  // Rule 8: Already qualified - book appointment
  if (lead.status === 'qualified') {
    return 'BOOK_APPOINTMENT';
  }

  // Rule 9: Recently contacted - follow up differently
  if (lead.status === 'contacted') {
    const hoursSinceContact = (Date.now() - lastContactedAt) / 3600000;
    if (hoursSinceContact < 4) {
      return 'FOLLOW_UP'; // Different channel
    }
    return 'CALL_NOW'; // Retry call
  }

  // Default
  return 'WAIT';
}

/**
 * Determine retry delay based on attempt number and outcomes
 */
export function determineRetryDelay(
  attempt: number,
  outcome: CallOutcome
): number {
  // Exponential backoff for most failures
  const baseDelay = [
    5 * 60 * 1000, // 5 minutes
    30 * 60 * 1000, // 30 minutes
    2 * 60 * 60 * 1000, // 2 hours
    24 * 60 * 60 * 1000, // 24 hours
    72 * 60 * 60 * 1000, // 72 hours
  ];

  // Different delays for specific outcomes
  if (outcome === 'NO_ANSWER') {
    return baseDelay[Math.min(attempt, 4)];
  }

  if (outcome === 'BUSY') {
    return Math.min(5 * 60 * 1000, baseDelay[attempt] || 24 * 60 * 60 * 1000);
  }

  if (outcome === 'OBJECTION') {
    // Longer delay for objections - let them think
    return Math.max(
      24 * 60 * 60 * 1000,
      baseDelay[attempt] || 72 * 60 * 60 * 1000
    );
  }

  if (outcome === 'CALLBACK') {
    return 0; // Call at requested time (handled separately)
  }

  return baseDelay[Math.min(attempt, 4)];
}

/**
 * Classify call outcome from conversation
 */
export function classifyOutcome(
  conversationText: string,
  leadQualification?: {
    interested: boolean;
    budget?: string;
    timeline?: string;
    decision_maker: boolean;
    objections?: string[];
  }
): CallOutcome {
  const text = conversationText.toLowerCase();

  // Positive outcomes
  if (text.includes('schedule') || text.includes('calendar') || text.includes('appointment')) {
    return 'APPOINTMENT_BOOKED';
  }

  if (text.includes('absolutely') || text.includes('definitely interested') || text.includes('sounds great')) {
    return 'QUALIFIED';
  }

  if (leadQualification?.interested) {
    return 'INTERESTED';
  }

  // Objection handling
  if (text.includes('not interested') || text.includes('dont need')) {
    return 'NOT_INTERESTED';
  }

  if (text.includes('call back') || text.includes('call me later') || text.includes('better time')) {
    return 'CALLBACK';
  }

  if (text.includes('send me') || text.includes('email me') || text.includes('information')) {
    return 'OBJECTION'; // Stalling tactic
  }

  if (leadQualification?.objections && leadQualification.objections.length > 0) {
    return 'OBJECTION';
  }

  // Default
  return 'INTERESTED';
}

/**
 * Determine next follow-up channel
 */
export function determineFollowUpChannel(
  lastChannel: 'voice' | 'sms' | 'email' | 'social' | null,
  outcome: CallOutcome,
  leadSegment: string
): 'voice' | 'sms' | 'email' | 'social' {
  // Sequence: Voice → SMS → Email → Social

  if (!lastChannel || lastChannel === 'voice') {
    return outcome === 'OBJECTION' ? 'email' : 'sms';
  }

  if (lastChannel === 'sms') {
    return 'email';
  }

  if (lastChannel === 'email') {
    return 'social';
  }

  if (lastChannel === 'social') {
    return 'voice'; // Come back to voice
  }

  return 'sms'; // Default fallback
}

/**
 * Determine if lead is ready to book appointment
 */
export function isReadyForAppointment(context: DecisionContext): boolean {
  const { currentQualification, lead } = context;

  if (!currentQualification?.interested) {
    return false;
  }

  // Must have budget and timeline
  if (!currentQualification.budget || !currentQualification.timeline) {
    return false;
  }

  // Must be decision maker or lead
  if (!currentQualification.decision_maker && lead.title?.toLowerCase().includes('assistant')) {
    return false;
  }

  // No major objections
  if (currentQualification.objections && currentQualification.objections.length > 2) {
    return false;
  }

  return true;
}

/**
 * Score lead for priority
 */
export function scoreLead(
  lead: Lead,
  context?: Partial<DecisionContext>
): number {
  let score = lead.score || 0;

  // Boost hot/warm leads
  if (lead.segment === 'hot') score += 30;
  if (lead.segment === 'warm') score += 15;

  // Boost verified leads
  if (lead.verificationStatus === 'verified') score += 20;

  // Boost by qualification
  if (context?.currentQualification?.interested) score += 25;
  if (context?.currentQualification?.decision_maker) score += 20;

  // Reduce old contacts
  if (context?.lastContactedAt) {
    const daysSince = (Date.now() - context.lastContactedAt) / 86400000;
    if (daysSince > 30) score -= 10;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Should prioritize this lead now?
 */
export function shouldPrioritize(lead: Lead): boolean {
  // Prioritize hot leads
  if (lead.segment === 'hot' && lead.score >= 70) {
    return true;
  }

  // Prioritize recent qualified leads
  if (lead.status === 'qualified') {
    return true;
  }

  // Prioritize verified decision makers
  if (lead.verificationStatus === 'verified' && lead.title?.toLowerCase().includes('director')) {
    return true;
  }

  return false;
}

/**
 * Get decision reasoning for logging
 */
export function getDecisionReasoning(
  decision: LeadAction,
  context: DecisionContext
): string {
  const { lead, previousAttempts = 0, lastContactedAt } = context;

  const reasons: Record<LeadAction, string> = {
    CALL_NOW: `New or hot lead with score ${lead.score}. Ready for immediate outreach.`,
    CALL_LATER: `Warm lead. Schedule call for optimal contact time.`,
    RETRY_CALL: `Previous attempt failed. Following up with retry sequence.`,
    SMS_FIRST: `Cold lead. Building interest with SMS before call.`,
    EMAIL_FIRST: `Recent objection or objection indicated. Sending valuable content.`,
    NURTURE: `${
      previousAttempts >= 5
        ? 'Max attempts reached'
        : 'Not ready for direct contact'
    }. Adding to nurture sequence.`,
    DEAD: `Lead is invalid or converted. No further action.`,
    BOOK_APPOINTMENT: `Lead is qualified. Ready to book appointment.`,
    FOLLOW_UP: `Recently contacted. Following up with different channel.`,
    WAIT: `Not optimal time for contact. Waiting for better timing.`,
  };

  return reasons[decision];
}

/**
 * Export decision context for audit/learning
 */
export function exportDecision(
  leadId: number,
  decision: LeadAction,
  context: DecisionContext,
  outcome?: CallOutcome
) {
  return {
    timestamp: new Date().toISOString(),
    leadId,
    leadScore: context.lead.score,
    leadSegment: context.lead.segment,
    decision,
    reasoning: getDecisionReasoning(decision, context),
    outcome,
    context: {
      previousAttempts: context.previousAttempts,
      lastContactedAt: context.lastContactedAt,
      qualified: context.currentQualification?.interested,
    },
  };
}

export default {
  decideLeadAction,
  determineRetryDelay,
  classifyOutcome,
  determineFollowUpChannel,
  isReadyForAppointment,
  scoreLead,
  shouldPrioritize,
  getDecisionReasoning,
  exportDecision,
};
