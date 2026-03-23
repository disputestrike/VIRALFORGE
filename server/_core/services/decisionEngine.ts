/**
 * DECISION ENGINE - FIXED
 */

export type DecisionAction = 'CALL_NOW' | 'RETRY_CALL' | 'NURTURE' | 'DEAD' | 'QUALIFIED';

export async function decideLeadAction(lead: any): Promise<{ action: DecisionAction; reason: string }> {
  // Simple scoring logic
  const score = lead.score || 0;
  
  if (score > 80) {
    return { action: 'CALL_NOW', reason: 'Hot lead' };
  } else if (score > 60) {
    return { action: 'RETRY_CALL', reason: 'Warm lead' };
  } else if (score > 40) {
    return { action: 'NURTURE', reason: 'Cold lead - nurture' };
  } else {
    return { action: 'DEAD', reason: 'Low quality lead' };
  }
}

export default {
  decideLeadAction,
};
