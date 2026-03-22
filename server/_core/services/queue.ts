/**
 * Job Queue Service
 * 
 * BullMQ-based queue for managing all autonomous AI operations
 * - Lead calling
 * - Follow-up scheduling
 * - Multi-channel outreach
 * - Decision engine execution
 * - Analytics collection
 * 
 * This is the FOUNDATION - everything else depends on this
 */

import { Queue, Worker, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { ENV } from '../env';

// Initialize Redis connection
const redis = new Redis(ENV.redisUrl || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Define all job types the system handles
export type JobType = 
  | 'call_lead'
  | 'retry_call'
  | 'send_sms'
  | 'send_email'
  | 'book_appointment'
  | 'follow_up_outreach'
  | 'lead_evaluation'
  | 'collect_feedback'
  | 'quality_check'
  | 'prompt_optimization';

export interface JobData {
  leadId: number;
  campaignId?: number;
  voiceSessionId?: number;
  [key: string]: any;
}

export interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
}

/**
 * Initialize all queues
 */
const queues = {
  calls: new Queue<JobData>('calls', { connection: redis }),
  sms: new Queue<JobData>('sms', { connection: redis }),
  email: new Queue<JobData>('email', { connection: redis }),
  followUp: new Queue<JobData>('follow-up', { connection: redis }),
  analytics: new Queue<JobData>('analytics', { connection: redis }),
  decisions: new Queue<JobData>('decisions', { connection: redis }),
};

/**
 * Queue Events - for monitoring and debugging
 */
const queueEvents = {
  calls: new QueueEvents('calls', { connection: redis }),
  sms: new QueueEvents('sms', { connection: redis }),
  email: new QueueEvents('email', { connection: redis }),
  followUp: new QueueEvents('follow-up', { connection: redis }),
};

// ─── PUBLIC API ────────────────────────────────────────────────────────────────

/**
 * Add a job to call a lead
 * 
 * Example:
 * ```typescript
 * await queueService.addCallJob({
 *   leadId: 123,
 *   campaignId: 456
 * }, {
 *   priority: 10,
 *   attempts: 3
 * });
 * ```
 */
export async function addCallJob(data: JobData, options?: JobOptions) {
  const job = await queues.calls.add('call-lead', data, {
    attempts: options?.attempts || 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    ...options,
  });
  
  console.log(`[QueueService] Call job added: ${job.id} for lead ${data.leadId}`);
  return job;
}

/**
 * Add a retry call job (for follow-up)
 */
export async function addRetryCallJob(data: JobData, options?: JobOptions) {
  const job = await queues.calls.add('retry-call', data, {
    delay: options?.delay || 300000, // Default 5 minutes
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 60000,
    },
    ...options,
  });
  
  console.log(`[QueueService] Retry call job added: ${job.id} for lead ${data.leadId}`);
  return job;
}

/**
 * Add SMS follow-up job
 */
export async function addSmsJob(data: JobData, options?: JobOptions) {
  const job = await queues.sms.add('send-sms', data, {
    attempts: 2,
    removeOnComplete: true,
    ...options,
  });
  
  console.log(`[QueueService] SMS job added: ${job.id} for lead ${data.leadId}`);
  return job;
}

/**
 * Add email follow-up job
 */
export async function addEmailJob(data: JobData, options?: JobOptions) {
  const job = await queues.email.add('send-email', data, {
    attempts: 2,
    removeOnComplete: true,
    ...options,
  });
  
  console.log(`[QueueService] Email job added: ${job.id} for lead ${data.leadId}`);
  return job;
}

/**
 * Add follow-up sequence job
 */
export async function addFollowUpJob(data: JobData, options?: JobOptions) {
  const job = await queues.followUp.add('follow-up-sequence', data, {
    attempts: 1,
    ...options,
  });
  
  console.log(`[QueueService] Follow-up job added: ${job.id} for lead ${data.leadId}`);
  return job;
}

/**
 * Add decision evaluation job
 */
export async function addDecisionJob(data: JobData, options?: JobOptions) {
  const job = await queues.decisions.add('evaluate-decision', data, {
    priority: 100, // High priority
    attempts: 1,
    ...options,
  });
  
  console.log(`[QueueService] Decision job added: ${job.id} for lead ${data.leadId}`);
  return job;
}

/**
 * Add analytics collection job
 */
export async function addAnalyticsJob(data: JobData, options?: JobOptions) {
  const job = await queues.analytics.add('collect-analytics', data, {
    attempts: 1,
    ...options,
  });
  
  console.log(`[QueueService] Analytics job added: ${job.id}`);
  return job;
}

/**
 * Get job status
 */
export async function getJobStatus(queueName: keyof typeof queues, jobId: string) {
  const job = await queues[queueName].getJob(jobId);
  if (!job) return null;
  
  return {
    id: job.id,
    name: job.name,
    status: await job.getState(),
    progress: job.progress(),
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason,
    attempts: {
      made: job.attemptsMade,
      max: job.opts.attempts,
    },
  };
}

/**
 * Get queue stats
 */
export async function getQueueStats(queueName: keyof typeof queues) {
  const queue = queues[queueName];
  const counts = await queue.getJobCounts(
    'wait',
    'active',
    'completed',
    'failed',
    'delayed'
  );
  
  return counts;
}

/**
 * Get all active jobs in a queue
 */
export async function getActiveJobs(queueName: keyof typeof queues) {
  const queue = queues[queueName];
  const activeJobs = await queue.getActiveCount();
  return activeJobs;
}

/**
 * Clear a queue (use cautiously)
 */
export async function clearQueue(queueName: keyof typeof queues) {
  const queue = queues[queueName];
  await queue.obliterate();
  console.log(`[QueueService] Queue ${queueName} cleared`);
}

/**
 * Close all queues
 */
export async function closeQueues() {
  for (const [name, queue] of Object.entries(queues)) {
    await queue.close();
    console.log(`[QueueService] Queue ${name} closed`);
  }
  await redis.quit();
}

// ─── EXPORT QUEUES FOR WORKERS ────────────────────────────────────────────────

export { queues, queueEvents, redis };

/**
 * Example: How to create a worker
 * 
 * ```typescript
 * import { queues } from './queue';
 * import { Worker } from 'bullmq';
 * 
 * const callWorker = new Worker('calls', async (job) => {
 *   console.log(`Processing call job: ${job.id}`);
 *   
 *   // Import the call service
 *   const { startCall } = await import('./twilioService');
 *   
 *   // Get the lead
 *   const { getLead } = await import('../db');
 *   const lead = await getLead(job.data.leadId);
 *   
 *   if (!lead?.phone) {
 *     throw new Error('Lead has no phone number');
 *   }
 *   
 *   // Initiate the call
 *   const result = await startCall(lead.phone, job.data.leadId);
 *   
 *   return result;
 * }, { connection: redis });
 * 
 * callWorker.on('completed', (job) => {
 *   console.log(`Call job completed: ${job.id}`);
 * });
 * 
 * callWorker.on('failed', (job, err) => {
 *   console.error(`Call job failed: ${job.id}`, err);
 * });
 * ```
 */
