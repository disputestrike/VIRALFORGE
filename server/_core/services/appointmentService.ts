/**
 * APPOINTMENT SERVICE - FIXED
 * Placeholder implementation
 */

import * as db from '../../db';

export async function bookAppointment(data: {
  leadId: number;
  customerId?: string;
  scheduledTime: Date;
  timezone: string;
}) {
  // TODO: Implement with actual db
  return {
    id: Math.floor(Math.random() * 10000),
    leadId: data.leadId,
    scheduledTime: data.scheduledTime,
    status: 'confirmed',
  };
}

export async function confirmAppointment(appointmentId: number) {
  // TODO: Implement
  return { id: appointmentId, status: 'confirmed' };
}

export async function recordShowStatus(appointmentId: number, showed: boolean) {
  // TODO: Implement
  return { id: appointmentId, showed };
}

export async function sendConfirmation(appointmentId: number) {
  // TODO: Implement
  return { status: 'sent' };
}

export async function sendReminder(appointmentId: number) {
  // TODO: Implement
  return { status: 'sent' };
}

export default {
  bookAppointment,
  confirmAppointment,
  recordShowStatus,
  sendConfirmation,
  sendReminder,
};
