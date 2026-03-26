/**
 * DECISION ENGINE — Real lead scoring and routing
 * No external API needed — pure business logic
 */

import * as db from "../../db";

export type DecisionAction = 'CALL_NOW' | 'RETRY_CALL' | 'NURTURE' | 'DEAD' | 'QUALIFIED';

export interface DecisionResult {
  action: DecisionAction;
  reason: string;
  score: number;
  priority: number;
}

export async function decideLeadAction(lead: {
  id?: number;
  score?: number | null;
  status?: string | null;
  phone?: string | null;
  email?: string | null;
  firstName?: string;
  source?: string | null;
  segment?: string | null;
}): Promise<DecisionResult> {
  const score = lead.score ?? 0;
  const hasPhone = !!lead.phone;
  const hasEmail = !!lead.email;

  // Dead — no contact info
  if (!hasPhone && !hasEmail) {
    return { action: 'DEAD', reason: 'No phone or email — cannot contact', score, priority: 0 };
  }

  // Already converted
  if (lead.status === 'converted') {
    return { action: 'QUALIFIED', reason: 'Already converted', score, priority: 0 };
  }

  // Already lost
  if (lead.status === 'lost') {
    return { action: 'DEAD', reason: 'Marked lost — do not contact', score, priority: 0 };
  }

  // Hot lead — call immediately
  if (score >= 70 || lead.segment === 'hot') {
    return {
      action: 'CALL_NOW',
      reason: `Hot lead (score: ${score}) — immediate outreach`,
      score,
      priority: 10,
    };
  }

  // Warm lead — retry call
  if (score >= 40 || lead.segment === 'warm') {
    return {
      action: 'RETRY_CALL',
      reason: `Warm lead (score: ${score}) — schedule follow-up`,
      score,
      priority: 5,
    };
  }

  // Inbound leads always get a call
  if (lead.source === 'inbound_call' || lead.source === 'web_form') {
    return {
      action: 'CALL_NOW',
      reason: 'Inbound lead — high intent',
      score,
      priority: 8,
    };
  }

  // Cold lead — nurture sequence
  if (score >= 20) {
    return {
      action: 'NURTURE',
      reason: `Cold lead (score: ${score}) — add to nurture sequence`,
      score,
      priority: 2,
    };
  }

  // Very low score — mark dead
  return { action: 'DEAD', reason: `Score too low (${score}) — not worth contacting`, score, priority: 0 };
}

export default { decideLeadAction };
