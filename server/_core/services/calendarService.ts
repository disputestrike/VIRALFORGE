/**
 * Calendar Service
 * 
 * Low-cost custom calendar for available appointment slots
 * No Calendly needed - you control everything
 */

import * as db from "../db";

export interface TimeSlot {
  dayOfWeek: number; // 0-6
  startHour: number;
  endHour: number;
  durationMinutes: number;
}

// Default business hours
const DEFAULT_SCHEDULE: TimeSlot[] = [
  { dayOfWeek: 1, startHour: 9, endHour: 17, durationMinutes: 30 }, // Monday
  { dayOfWeek: 2, startHour: 9, endHour: 17, durationMinutes: 30 }, // Tuesday
  { dayOfWeek: 3, startHour: 9, endHour: 17, durationMinutes: 30 }, // Wednesday
  { dayOfWeek: 4, startHour: 9, endHour: 17, durationMinutes: 30 }, // Thursday
  { dayOfWeek: 5, startHour: 9, endHour: 17, durationMinutes: 30 }, // Friday
];

/**
 * Get next available appointment slots
 */
export async function getNextAvailableSlots(
  count: number = 5,
  startDate: Date = new Date(),
  durationMinutes: number = 30
): Promise<Date[]> {
  const slots: Date[] = [];
  let currentDate = new Date(startDate);

  while (slots.length < count) {
    const dayOfWeek = currentDate.getDay();
    const schedule = DEFAULT_SCHEDULE.find((s) => s.dayOfWeek === dayOfWeek);

    if (schedule) {
      // Get booked times for this day
      const bookedTimes = await getBookedTimesForDay(currentDate);

      // Find free slots
      for (let hour = schedule.startHour; hour < schedule.endHour; hour++) {
        for (let minute = 0; minute < 60; minute += schedule.durationMinutes) {
          const slotTime = new Date(currentDate);
          slotTime.setHours(hour, minute, 0, 0);

          // Only future slots
          if (slotTime < new Date()) continue;

          // Check if slot is booked
          const isBooked = bookedTimes.some(
            (bookedTime) =>
              Math.abs(bookedTime.getTime() - slotTime.getTime()) <
              schedule.durationMinutes * 60 * 1000
          );

          if (!isBooked) {
            slots.push(new Date(slotTime));
          }

          if (slots.length >= count) break;
        }
        if (slots.length >= count) break;
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return slots;
}

/**
 * Get booked times for a specific day
 */
async function getBookedTimesForDay(date: Date): Promise<Date[]> {
  try {
    const result = await db.query(
      `SELECT scheduledTime FROM appointment_bookings 
       WHERE DATE(scheduledTime) = DATE(?)
       AND confirmationStatus IN ('confirmed', 'completed')
       AND showStatus != 'cancelled'`,
      [date]
    );

    return (result as any[]).map((r) => new Date(r.scheduledTime));
  } catch (error) {
    console.error("[Calendar] Error getting booked times:", error);
    return [];
  }
}

/**
 * Format time slot for display
 */
export function formatTimeSlot(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format time slot for AI to speak
 */
export function formatTimeslotForSpeech(date: Date): string {
  const dayName = date.toLocaleString("en-US", { weekday: "long" });
  const monthName = date.toLocaleString("en-US", { month: "long" });
  const day = date.getDate();
  const time = date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${dayName}, ${monthName} ${day} at ${time}`;
}

/**
 * Generate calendar link
 */
export function generateCalendarLink(appointmentId: number, baseUrl: string): string {
  return `${baseUrl}/calendar/appointments/${appointmentId}`;
}

/**
 * Validate appointment time is within business hours
 */
export function isValidAppointmentTime(date: Date): boolean {
  const dayOfWeek = date.getDay();
  const hour = date.getHours();

  const schedule = DEFAULT_SCHEDULE.find((s) => s.dayOfWeek === dayOfWeek);

  if (!schedule) return false; // Day not in schedule

  return hour >= schedule.startHour && hour < schedule.endHour;
}

export default {
  getNextAvailableSlots,
  formatTimeSlot,
  formatTimeslotForSpeech,
  generateCalendarLink,
  isValidAppointmentTime,
};
