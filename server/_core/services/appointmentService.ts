/**
 * Appointment Service
 * 
 * Handles appointment booking, confirmation, and reminders
 * Integrates with SMS/Email queues for notifications
 */

import * as db from '../../db';;
import * as queueService from "./queue";

export interface AppointmentBooking {
  id: number;
  leadId: number;
  scheduledTime: Date;
  confirmationStatus: "proposed" | "confirmed" | "declined" | "cancelled" | "completed";
  confirmationMethod?: "voice" | "sms" | "email";
  showStatus?: "shown" | "no_show" | "cancelled";
}

/**
 * Book an appointment for a lead
 */
export async function bookAppointment(
  leadId: number,
  scheduledTime: Date,
  campaignId?: number,
  voiceSessionId?: number
): Promise<AppointmentBooking> {
  console.log(
    `[AppointmentService] Booking appointment for lead ${leadId} at ${scheduledTime.toISOString()}`
  );

  try {
    // 1. Get lead details
    const lead = await db.getLeadById(leadId);
    if (!lead) throw new Error("Lead not found");

    // 2. Insert into database
    const result = await db.query(
      `INSERT INTO appointment_bookings 
        (leadId, scheduledTime, campaignId, voiceSessionId, confirmationStatus) 
       VALUES (?, ?, ?, ?, 'proposed')`,
      [leadId, scheduledTime, campaignId, voiceSessionId]
    );

    const appointmentId = (result as any).insertId;

    // 3. Queue SMS confirmation
    if (lead.phone) {
      await queueService.addSmsJob({
        leadId,
        appointmentId,
        type: "appointment_confirmation",
        phone: lead.phone,
        scheduledTime: scheduledTime.toISOString(),
        leadName: lead.firstName,
      });
    }

    // 4. Queue email confirmation
    if (lead.email) {
      await queueService.addEmailJob({
        leadId,
        appointmentId,
        type: "appointment_confirmation",
        email: lead.email,
        scheduledTime: scheduledTime.toISOString(),
        leadName: lead.firstName,
      });
    }

    // 5. Schedule reminder (24 hours before)
    const reminderTime = new Date(scheduledTime.getTime() - 24 * 60 * 60 * 1000);
    if (reminderTime > new Date()) {
      await queueService.addSmsJob(
        {
          leadId,
          appointmentId,
          type: "appointment_reminder",
          phone: lead.phone,
          scheduledTime: scheduledTime.toISOString(),
          leadName: lead.firstName,
        },
        {
          delay: reminderTime.getTime() - Date.now(),
        }
      );
    }

    console.log(`[AppointmentService] Appointment ${appointmentId} booked`);

    return {
      id: appointmentId,
      leadId,
      scheduledTime,
      confirmationStatus: "proposed",
    };
  } catch (error) {
    console.error("[AppointmentService] Booking failed:", error);
    throw error;
  }
}

/**
 * Confirm an appointment
 */
export async function confirmAppointment(
  appointmentId: number,
  method: "voice" | "sms" | "email" = "voice"
): Promise<void> {
  console.log(`[AppointmentService] Confirming appointment ${appointmentId}`);

  await db.query(
    `UPDATE appointment_bookings 
     SET confirmationStatus = 'confirmed', confirmationMethod = ?, confirmationSentAt = NOW()
     WHERE id = ?`,
    [method, appointmentId]
  );
}

/**
 * Record show/no-show status
 */
export async function recordShowStatus(
  appointmentId: number,
  showStatus: "shown" | "no_show" | "cancelled" | "rescheduled"
): Promise<void> {
  console.log(
    `[AppointmentService] Recording show status for ${appointmentId}: ${showStatus}`
  );

  await db.query(
    `UPDATE appointment_bookings SET showStatus = ?, completedAt = NOW() WHERE id = ?`,
    [showStatus, appointmentId]
  );

  // If no-show, schedule follow-up
  if (showStatus === "no_show") {
    const [appointment] = await db.query(
      "SELECT leadId, campaignId FROM appointment_bookings WHERE id = ?",
      [appointmentId]
    );

    if (appointment) {
      const lead = await db.getLeadById(appointment.leadId);
      if (lead) {
        // Queue follow-up call
        await queueService.addRetryCallJob({
          leadId: lead.id,
          campaignId: appointment.campaignId,
          callType: "no_show_followup",
          appointmentId,
        });
      }
    }
  }
}

/**
 * Reschedule an appointment
 */
export async function rescheduleAppointment(
  appointmentId: number,
  newTime: Date
): Promise<void> {
  console.log(`[AppointmentService] Rescheduling ${appointmentId} to ${newTime.toISOString()}`);

  await db.query(
    `UPDATE appointment_bookings SET scheduledTime = ?, showStatus = 'rescheduled' WHERE id = ?`,
    [newTime, appointmentId]
  );
}

export default {
  bookAppointment,
  confirmAppointment,
  recordShowStatus,
  rescheduleAppointment,
};
