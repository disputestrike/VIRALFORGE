/**
 * SMS Worker
 * Processes SMS jobs from the queue via SignalWire
 */

import { Worker } from "bullmq";

const SMS_TEMPLATES = {
  appointment_confirmation: (leadName: string, scheduledTime: string) =>
    `Hi ${leadName}! Your appointment is confirmed for ${scheduledTime}. Reply STOP to cancel.`,
  appointment_reminder: (leadName: string, scheduledTime: string) =>
    `Reminder ${leadName}: Your appointment is ${scheduledTime}. See you soon!`,
  follow_up: (leadName: string) =>
    `Hi ${leadName}! Following up on your recent inquiry. Still interested? Reply YES to schedule.`,
  missed_call: (leadName: string) =>
    `Hi ${leadName}! We tried to reach you. Reply to schedule a time that works for you.`,
};

async function sendSMS(to: string, body: string): Promise<string> {
  const { default: swService } = await import("../services/signalwireService");
  const result = await swService.sendSMS({ to, body });
  return result.messageSid;
}

export function createSMSWorker(redisConnection: any) {
  const worker = new Worker(
    "sms",
    async (job) => {
      const { to, templateName, templateData, body } = job.data;

      let messageBody = body;
      if (!messageBody && templateName && SMS_TEMPLATES[templateName as keyof typeof SMS_TEMPLATES]) {
        const template = SMS_TEMPLATES[templateName as keyof typeof SMS_TEMPLATES];
        messageBody = (template as any)(...(templateData || []));
      }

      if (!messageBody) throw new Error("No message body provided");

      const sid = await sendSMS(to, messageBody);
      console.log(`[SMSWorker] ✅ Sent to ${to} | sid: ${sid}`);
      return { sid };
    },
    { connection: redisConnection, concurrency: 5 }
  );

  worker.on("failed", (job, err) => {
    console.error(`[SMSWorker] ❌ Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

export default createSMSWorker;
