/**
 * FIX 10: Transfer to Human Agent
 * 
 * Currently: Inbound routes mention Enqueue but no actual implementation
 * Problem: No queue management, no agent assignment, no tracking
 * 
 * Solution: Simple queue system with agent assignment
 */

export interface QueuedCall {
  callId: string;
  leadId: number;
  fromNumber: string;
  queueName: 'sales' | 'support' | 'billing';
  enteredAt: Date;
  transferredAt?: Date;
  assignedAgent?: string;
  priority: 'high' | 'medium' | 'low';
  notes?: string;
}

// In-memory queue (in production, use database or Redis)
const callQueues: Map<string, QueuedCall[]> = new Map([
  ['sales', []],
  ['support', []],
  ['billing', []],
]);

/**
 * Add call to queue
 */
export function addCallToQueue(
  callId: string,
  leadId: number,
  fromNumber: string,
  queueName: 'sales' | 'support' | 'billing',
  priority: 'high' | 'medium' | 'low' = 'medium'
): QueuedCall {
  const queuedCall: QueuedCall = {
    callId,
    leadId,
    fromNumber,
    queueName,
    enteredAt: new Date(),
    priority,
  };

  const queue = callQueues.get(queueName) || [];
  queue.push(queuedCall);
  callQueues.set(queueName, queue);

  console.log(`[Queue] Added call ${callId} to ${queueName} queue (priority: ${priority})`);

  return queuedCall;
}

/**
 * Get next call in queue
 */
export function getNextCallInQueue(queueName: string): QueuedCall | null {
  const queue = callQueues.get(queueName) || [];

  if (queue.length === 0) {
    return null;
  }

  // Sort by priority (high first) and then by entry time
  queue.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];

    if (priorityDiff !== 0) return priorityDiff;

    return a.enteredAt.getTime() - b.enteredAt.getTime();
  });

  const nextCall = queue.shift();
  callQueues.set(queueName, queue);

  if (nextCall) {
    console.log(`[Queue] Assigned call ${nextCall.callId} from queue`);
  }

  return nextCall || null;
}

/**
 * Assign agent to call
 */
export function assignAgentToCall(
  callId: string,
  agentEmail: string,
  queueName: string
): boolean {
  const queue = callQueues.get(queueName) || [];
  const call = queue.find((c) => c.callId === callId);

  if (!call) {
    console.error(`[Queue] Call ${callId} not found in queue`);
    return false;
  }

  call.assignedAgent = agentEmail;
  call.transferredAt = new Date();

  console.log(`[Queue] Assigned call ${callId} to agent ${agentEmail}`);

  return true;
}

/**
 * Get queue status
 */
export function getQueueStatus(queueName: string): {
  queueName: string;
  waiting: number;
  avgWaitTime: number;
  oldestCall?: Date;
} {
  const queue = callQueues.get(queueName) || [];

  if (queue.length === 0) {
    return {
      queueName,
      waiting: 0,
      avgWaitTime: 0,
    };
  }

  const now = new Date();
  const waitTimes = queue.map((c) => (now.getTime() - c.enteredAt.getTime()) / 1000);
  const avgWaitTime = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length;

  return {
    queueName,
    waiting: queue.length,
    avgWaitTime: Math.round(avgWaitTime),
    oldestCall: queue[queue.length - 1]?.enteredAt,
  };
}

/**
 * Get all queues status
 */
export function getAllQueuesStatus() {
  return {
    sales: getQueueStatus('sales'),
    support: getQueueStatus('support'),
    billing: getQueueStatus('billing'),
  };
}

/**
 * Remove call from queue
 */
export function removeCallFromQueue(callId: string): boolean {
  for (const queueName of callQueues.keys()) {
    const queue = callQueues.get(queueName) || [];
    const index = queue.findIndex((c) => c.callId === callId);

    if (index !== -1) {
      queue.splice(index, 1);
      callQueues.set(queueName, queue);
      console.log(`[Queue] Removed call ${callId} from ${queueName} queue`);
      return true;
    }
  }

  return false;
}

/**
 * Generate hold message for waiting callers
 */
export function generateHoldMessage(queueName: string, position: number): string {
  const messages: Record<string, string[]> = {
    sales: [
      `You are number ${position} in the sales queue. Thank you for your patience.`,
      `Your call is important to us. You are number ${position} in line.`,
    ],
    support: [
      `Thank you for contacting support. You are number ${position} in the queue.`,
      `We appreciate your patience. You are number ${position} waiting for an agent.`,
    ],
    billing: [
      `You are number ${position} for billing support. Thank you for waiting.`,
      `A billing specialist will be with you shortly. You are ${position} in line.`,
    ],
  };

  const queueMessages = messages[queueName] || messages.support;
  return queueMessages[Math.floor(Math.random() * queueMessages.length)];
}

/**
 * Format TwiML for queue hold
 */
export function generateHoldTwiML(queueName: string, position: number): string {
  const message = generateHoldMessage(queueName, position);

  return `
    <Response>
      <Say>${message}</Say>
      <Play>
        https://demo.twilio.com/docs/voice.mp3
      </Play>
    </Response>
  `;
}

export default {
  addCallToQueue,
  getNextCallInQueue,
  assignAgentToCall,
  getQueueStatus,
  getAllQueuesStatus,
  removeCallFromQueue,
  generateHoldMessage,
  generateHoldTwiML,
};
