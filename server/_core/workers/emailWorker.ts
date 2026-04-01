/**
 * Email Worker
 * 
 * Processes email jobs from the queue
 * Sends confirmations, reminders, and follow-ups via Resend email service
 */

import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { Resend } from "resend";
import { ENV } from "../env";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

const resend = new Resend(ENV.resendApiKey || "");

/**
 * Email templates
 */
function generateAppointmentConfirmationEmail(
  leadName: string,
  scheduledTime: string,
  calendarLink?: string
): { subject: string; html: string } {
  const formattedTime = new Date(scheduledTime).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return {
    subject: `Appointment Confirmed: ${formattedTime}`,
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Your Appointment is Confirmed!</h2>
            <p>Hi ${leadName},</p>
            <p>We're excited to meet with you on <strong>${formattedTime}</strong>.</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Appointment Details</h3>
              <p><strong>Date & Time:</strong> ${formattedTime}</p>
              <p><strong>Duration:</strong> 30 minutes</p>
            </div>

            ${calendarLink ? `<p><a href="${calendarLink}" style="background-color: #0052FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Add to Calendar</a></p>` : ""}

            <p>If you need to reschedule, just reply to this email or call us.</p>
            
            <p>Best regards,<br><strong>${ENV.resendFromName} Team</strong></p>
            
            <hr style="margin-top: 40px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666;">
              You're receiving this email because you scheduled an appointment with us.
              <a href="#" style="color: #0052FF;">Unsubscribe</a>
            </p>
          </div>
        </body>
      </html>
    `,
  };
}

function generateAppointmentReminderEmail(
  leadName: string,
  scheduledTime: string
): { subject: string; html: string } {
  const formattedTime = new Date(scheduledTime).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return {
    subject: `Reminder: Your Appointment is Tomorrow at ${formattedTime}`,
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Appointment Reminder</h2>
            <p>Hi ${leadName},</p>
            <p>Just a friendly reminder that your appointment is coming up!</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Tomorrow at ${formattedTime}</strong></p>
            </div>

            <p>We're looking forward to speaking with you!</p>
            <p>If you need to reschedule, let us know as soon as possible.</p>
            
            <p>Best regards,<br><strong>${ENV.resendFromName} Team</strong></p>
          </div>
        </body>
      </html>
    `,
  };
}

function generateFollowUpEmail(
  leadName: string
): { subject: string; html: string } {
  return {
    subject: `Following Up - Are You Still Interested?`,
    html: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Following Up</h2>
            <p>Hi ${leadName},</p>
            <p>We wanted to reach out and see if you're still interested in learning more about our services.</p>
            <p>If you have any questions or would like to schedule a time to talk, please let us know!</p>
            
            <p style="margin-top: 20px;">
              <a href="mailto:sales@apexai.com" style="background-color: #0052FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Get in Touch</a>
            </p>
            
            <p>Best regards,<br><strong>${ENV.resendFromName} Team</strong></p>
          </div>
        </body>
      </html>
    `,
  };
}

/**
 * Email Worker - processes email jobs from queue
 */
export const emailWorker = new Worker(
  "email",
  async (job) => {
    const { email, type, leadName, scheduledTime, calendarLink } = job.data;

    console.log(`[Email Worker] Processing job ${job.id}: ${type} to ${email}`);

    try {
      let emailContent: { subject: string; html: string };

      if (type === "appointment_confirmation") {
        emailContent = generateAppointmentConfirmationEmail(
          leadName || "there",
          scheduledTime || new Date().toISOString(),
          calendarLink
        );
      } else if (type === "appointment_reminder") {
        emailContent = generateAppointmentReminderEmail(
          leadName || "there",
          scheduledTime || new Date().toISOString()
        );
      } else if (type === "follow_up") {
        emailContent = generateFollowUpEmail(leadName || "there");
      } else {
        emailContent = {
          subject: "Message from ApexAI",
          html: `<p>Hi ${leadName || "there"},</p><p>Thank you for your interest!</p>`,
        };
      }

      // Send email via Resend
      const result = await resend.emails.send({
        from: ENV.resendFromHeader,
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
      });

      const emailId = (result as any)?.id || `email_${Date.now()}`;
      console.log(`[Email Worker] Sent email ${emailId} to ${email}`);

      return {
        success: true,
        emailId,
        to: email,
        type,
      };
    } catch (error) {
      console.error(`[Email Worker] Error processing job ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection: redis as any,
    concurrency: 10, // Process 10 emails in parallel
  }
);

/**
 * Event handlers for email worker
 */
emailWorker.on("completed", (job) => {
  console.log(`[Email Worker] Job ${job.id} completed successfully`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`[Email Worker] Job ${job?.id} failed:`, err.message);
});

emailWorker.on("error", (err) => {
  console.error(`[Email Worker] Worker error:`, err);
});

export default emailWorker;
