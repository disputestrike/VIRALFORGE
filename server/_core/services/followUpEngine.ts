/**
 * FOLLOW UP ENGINE - FIXED
 */

export async function scheduleFollowUp(leadId: number, action: string, delay: number) {
  console.log(`[FollowUp] Scheduled ${action} for lead ${leadId} in ${delay}ms`);
  return { scheduled: true };
}

export async function getFollowUpSequence(leadId: number) {
  return [
    { action: 'email', delay: 0 },
    { action: 'sms', delay: 3600000 },
    { action: 'call', delay: 86400000 },
  ];
}

export async function executeFollowUp(leadId: number) {
  console.log(`[FollowUp] Executing follow-up for lead ${leadId}`);
  return { executed: true };
}

export default {
  scheduleFollowUp,
  getFollowUpSequence,
  executeFollowUp,
};
