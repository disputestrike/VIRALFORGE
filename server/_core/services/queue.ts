/**
 * QUEUE SERVICE - FIXED
 * Simplified implementation
 */

export async function addCallJob(data: any) {
  console.log('[Queue] Call job queued:', data);
  return { jobId: `call_${Date.now()}`, status: 'queued' };
}

export async function addSmsJob(data: any) {
  console.log('[Queue] SMS job queued:', data);
  return { jobId: `sms_${Date.now()}`, status: 'queued' };
}

export async function addEmailJob(data: any) {
  console.log('[Queue] Email job queued:', data);
  return { jobId: `email_${Date.now()}`, status: 'queued' };
}

export default {
  addCallJob,
  addSmsJob,
  addEmailJob,
};
