/**
 * QUEUE SERVICE — BullMQ with Redis
 * Falls back to in-memory queue if Redis is not configured (for dev/testing)
 */

let useRealQueue = false;
let bullmqQueues: {
  calls: import("bullmq").Queue;
  sms: import("bullmq").Queue;
  email: import("bullmq").Queue;
} | null = null;

// In-memory fallback queue
const memoryQueue: Array<{ type: string; data: unknown; id: string; addedAt: number }> = [];

async function getQueues() {
  if (bullmqQueues) return bullmqQueues;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn("[Queue] REDIS_URL not set — using in-memory queue (jobs will not survive restarts)");
    return null;
  }

  try {
    const { Queue } = await import("bullmq");
    // Use URL string directly — avoids ioredis version conflict with bullmq's bundled ioredis
    const connection = { url: redisUrl };

    bullmqQueues = {
      calls: new Queue("calls", { connection: connection as any }),
      sms: new Queue("sms", { connection: connection as any }),
      email: new Queue("email", { connection: connection as any }),
    };

    useRealQueue = true;
    console.log("[Queue] BullMQ connected to Redis");
    return bullmqQueues;
  } catch (error) {
    console.warn("[Queue] BullMQ init failed, using in-memory fallback:", error);
    return null;
  }
}

export async function addCallJob(data: {
  leadId: number;
  campaignId?: number;
  script?: string;
  sessionId?: string;
}): Promise<{ jobId: string; status: string }> {
  const queues = await getQueues();
  const jobId = `call_${data.leadId}_${Date.now()}`;

  if (queues) {
    const job = await queues.calls.add("initiate-call", data, {
      jobId,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
    return { jobId: job.id || jobId, status: "queued" };
  }

  // In-memory fallback
  memoryQueue.push({ type: "call", data, id: jobId, addedAt: Date.now() });
  console.log(`[Queue] Call job added (in-memory): ${jobId}`);
  return { jobId, status: "queued_memory" };
}

export async function addSmsJob(data: {
  leadId: number;
  phone: string;
  type: "appointment_confirmation" | "appointment_reminder" | "follow_up" | "no_show_followup";
  leadName?: string;
  scheduledTime?: string;
  delay?: number;
  msgId?: number;
}): Promise<{ jobId: string; status: string }> {
  const queues = await getQueues();
  const jobId = `sms_${data.leadId}_${Date.now()}`;

  if (queues) {
    const job = await queues.sms.add("send-sms", data, {
      jobId,
      delay: data.delay,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
    return { jobId: job.id || jobId, status: "queued" };
  }

  memoryQueue.push({ type: "sms", data, id: jobId, addedAt: Date.now() });
  console.log(`[Queue] SMS job added (in-memory): ${jobId}`);
  return { jobId, status: "queued_memory" };
}

export async function addEmailJob(data: {
  leadId: number;
  email: string;
  type: "appointment_confirmation" | "appointment_reminder" | "follow_up" | "sequence";
  leadName?: string;
  scheduledTime?: string;
  calendarLink?: string;
  delay?: number;
  msgId?: number;
  /** When type is `sequence`, worker sends this HTML (already escaped/safe). */
  customSubject?: string;
  customHtml?: string;
}): Promise<{ jobId: string; status: string }> {
  const queues = await getQueues();
  const jobId = `email_${data.leadId}_${Date.now()}`;

  if (queues) {
    const job = await queues.email.add("send-email", data, {
      jobId,
      delay: data.delay,
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });
    return { jobId: job.id || jobId, status: "queued" };
  }

  memoryQueue.push({ type: "email", data, id: jobId, addedAt: Date.now() });
  console.log(`[Queue] Email job added (in-memory): ${jobId}`);
  return { jobId, status: "queued_memory" };
}

export function getMemoryQueueStatus() {
  return {
    usingRedis: useRealQueue,
    pendingJobs: memoryQueue.length,
    jobs: memoryQueue.slice(-20),
  };
}

export { getQueues };
export default { addCallJob, addSmsJob, addEmailJob, getMemoryQueueStatus };
