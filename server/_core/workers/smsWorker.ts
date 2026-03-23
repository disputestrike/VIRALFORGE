/**
 * SMS Worker
 * 
 * Processes SMS jobs from the queue
 * Sends confirmations, reminders, and follow-ups via Twilio SMS
 */

import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { Twilio } from "twilio";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

// Initialize Twilio client
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || "+1234567890";

/**
 * SMS message templates
 */
const SMS_TEMPLATES = {
  appointment_confirmation: (leadName: string, scheduledTime: string) =>
    `Hi ${leadName}! Your appointment is confirmed for ${scheduledTime}. Reply STOP to cancel.`,

  appointment_reminder: (leadName: string, scheduledTime: string) =>
    `Reminder ${leadName}: Your appointment is ${scheduledTime}. See you soon!`,

  appointment_reschedule: (leadName: string, newTime: string) =>
    `Hi ${leadName}, your appointment has been rescheduled to ${newTime}. Reply with any questions.`,

  follow_up: (leadName: string) =>
    `Hi ${leadName}! Following up on our call. Still interested? Reply YES or let me know how I can help.`,

  no_show_followup: (leadName: string) =>
    `Hi ${leadName}, we missed you at your appointment. Would you like to reschedule?`,

  callback_request: (leadName: string) =>
    `Hi ${leadName}, we received your voicemail. We'll call you back shortly!`,
};

/**
 * SMS Worker - processes SMS jobs from queue
 */
export const smsWorker = new Worker(
  "sms",
  async (job) => {
    const { phone, type, leadName, scheduledTime } = job.data;

    console.log(`[SMS Worker] Processing job ${job.id}: ${type} to ${phone}`);

    try {
      // Get message template
      let message = "";
      const templateKey = type as keyof typeof SMS_TEMPLATES;

      if (type === "appointment_confirmation") {
        message = SMS_TEMPLATES.appointment_confirmation(
          leadName || "there",
          scheduledTime || "your appointment time"
        );
      } else if (type === "appointment_reminder") {
        message = SMS_TEMPLATES.appointment_reminder(
          leadName || "there",
          scheduledTime || "soon"
        );
      } else if (type === "appointment_reschedule") {
        message = SMS_TEMPLATES.appointment_reschedule(
          leadName || "there",
          scheduledTime || "the new time"
        );
      } else if (type === "follow_up") {
        message = SMS_TEMPLATES.follow_up(leadName || "there");
      } else if (type === "no_show_followup") {
        message = SMS_TEMPLATES.no_show_followup(leadName || "there");
      } else if (type === "callback_request") {
        message = SMS_TEMPLATES.callback_request(leadName || "there");
      } else {
        message = `Hi ${leadName || "there"}, this is a message from our team.`;
      }

      // Send SMS via Twilio
      const result = await twilioClient.messages.create({
        body: message,
        from: twilioPhoneNumber,
        to: phone,
      });

      console.log(`[SMS Worker] Sent SMS ${result.sid} to ${phone}`);

      return {
        success: true,
        messageSid: result.sid,
        message,
        phone,
        type,
      };
    } catch (error) {
      console.error(`[SMS Worker] Error processing job ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection: redis as any,
    concurrency: 5, // Process 5 SMS in parallel
  }
);

/**
 * Event handlers for SMS worker
 */
smsWorker.on("completed", (job) => {
  console.log(`[SMS Worker] Job ${job.id} completed successfully`);
});

smsWorker.on("failed", (job, err) => {
  console.error(`[SMS Worker] Job ${job?.id} failed:`, err.message);
});

smsWorker.on("error", (err) => {
  console.error(`[SMS Worker] Worker error:`, err);
});

export default smsWorker;
