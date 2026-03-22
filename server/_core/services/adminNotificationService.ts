/**
 * Admin Notification Service
 * 
 * FIX 3: Critical gap - no admin notifications
 * Sends alerts to admin email on important events
 */

import * as queueService from './queue';

// Admin email from environment
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';
const APP_NAME = 'ApexAI';

if (!ADMIN_EMAIL) {
  console.warn('[AdminNotifications] ADMIN_EMAIL not configured - admin notifications disabled');
}

/**
 * Notify admin of high-value appointment booked
 */
export async function notifyAppointmentBooked(
  leadName: string,
  leadEmail: string,
  appointmentTime: Date,
  callDuration: number,
  quality: 'high' | 'medium' | 'low'
): Promise<void> {
  if (!ADMIN_EMAIL) return;

  const timeStr = appointmentTime.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const subject = `✅ New Appointment Booked: ${leadName} - ${timeStr}`;
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #00C853;">✅ Appointment Booked</h2>
          <p><strong>Lead:</strong> ${leadName}</p>
          <p><strong>Email:</strong> ${leadEmail}</p>
          <p><strong>Time:</strong> ${timeStr}</p>
          <p><strong>Call Duration:</strong> ${Math.floor(callDuration / 60)}m ${callDuration % 60}s</p>
          <p><strong>Quality:</strong> <span style="color: ${quality === 'high' ? '#00C853' : quality === 'medium' ? '#FFA000' : '#FF5252'}">${quality.toUpperCase()}</span></p>
          <p><a href="https://apexai.com/admin/appointments">View in Dashboard</a></p>
        </div>
      </body>
    </html>
  `;

  await queueService.addEmailJob({
    email: ADMIN_EMAIL,
    type: 'admin_alert',
    subject,
    html,
    leadName: ADMIN_NAME,
  });
}

/**
 * Notify admin of critical error
 */
export async function notifyCriticalError(
  errorType: string,
  errorMessage: string,
  context: any = {}
): Promise<void> {
  if (!ADMIN_EMAIL) return;

  const subject = `🚨 CRITICAL ERROR: ${errorType}`;
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff3cd; border: 1px solid #ff9800;">
          <h2 style="color: #d32f2f;">🚨 CRITICAL ERROR</h2>
          <p><strong>Error Type:</strong> ${errorType}</p>
          <p><strong>Message:</strong> ${errorMessage}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          ${context.leadId ? `<p><strong>Lead ID:</strong> ${context.leadId}</p>` : ''}
          ${context.callId ? `<p><strong>Call ID:</strong> ${context.callId}</p>` : ''}
          ${context.stack ? `<pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${context.stack}</pre>` : ''}
          <p style="color: red;"><strong>ACTION REQUIRED</strong></p>
        </div>
      </body>
    </html>
  `;

  await queueService.addEmailJob({
    email: ADMIN_EMAIL,
    type: 'admin_alert',
    subject,
    html,
    leadName: ADMIN_NAME,
  });
}

/**
 * Notify admin of voicemail received
 */
export async function notifyVoicemailReceived(
  callerNumber: string,
  transcription: string,
  recordingUrl: string
): Promise<void> {
  if (!ADMIN_EMAIL) return;

  const subject = `📞 New Voicemail from ${callerNumber}`;
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>📞 New Voicemail</h2>
          <p><strong>From:</strong> ${callerNumber}</p>
          <p><strong>Transcription:</strong></p>
          <p style="background: #f5f5f5; padding: 15px; border-left: 4px solid #0052FF;">${transcription}</p>
          <p><a href="${recordingUrl}">Listen to Recording</a></p>
          <p><a href="https://apexai.com/admin/voicemails">View in Dashboard</a></p>
        </div>
      </body>
    </html>
  `;

  await queueService.addEmailJob({
    email: ADMIN_EMAIL,
    type: 'admin_alert',
    subject,
    html,
    leadName: ADMIN_NAME,
  });
}

/**
 * Notify admin of no-show
 */
export async function notifyNoShow(
  leadName: string,
  appointmentTime: Date
): Promise<void> {
  if (!ADMIN_EMAIL) return;

  const subject = `⚠️ NO-SHOW: ${leadName} - ${appointmentTime.toLocaleString()}`;
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffebee;">
          <h2 style="color: #d32f2f;">⚠️ Appointment No-Show</h2>
          <p><strong>Lead:</strong> ${leadName}</p>
          <p><strong>Appointment Time:</strong> ${appointmentTime.toLocaleString()}</p>
          <p>Auto-follow-up has been scheduled.</p>
          <p><a href="https://apexai.com/admin/no-shows">View No-Shows</a></p>
        </div>
      </body>
    </html>
  `;

  await queueService.addEmailJob({
    email: ADMIN_EMAIL,
    type: 'admin_alert',
    subject,
    html,
    leadName: ADMIN_NAME,
  });
}

/**
 * Notify admin of daily stats
 */
export async function notifyDailyStats(stats: {
  totalCalls: number;
  successfulCalls: number;
  appointmentsBooked: number;
  appointmentsShowed: number;
  avgCallDuration: number;
  appointmentCloseRate: number;
}): Promise<void> {
  if (!ADMIN_EMAIL) return;

  const subject = `📊 Daily Stats - ${new Date().toLocaleDateString()}`;
  const html = `
    <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>📊 Daily Statistics</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr style="background: #f5f5f5;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Metric</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Value</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Total Calls</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${stats.totalCalls}</td>
            </tr>
            <tr style="background: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #ddd;">Successful Calls</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${stats.successfulCalls} (${Math.round((stats.successfulCalls / stats.totalCalls) * 100)}%)</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Appointments Booked</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${stats.appointmentsBooked}</td>
            </tr>
            <tr style="background: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #ddd;">Appointments Showed</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${stats.appointmentsShowed}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;">Avg Call Duration</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${stats.avgCallDuration}m</td>
            </tr>
            <tr style="background: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #ddd;">Close Rate</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${stats.appointmentCloseRate}%</td>
            </tr>
          </table>
        </div>
      </body>
    </html>
  `;

  await queueService.addEmailJob({
    email: ADMIN_EMAIL,
    type: 'admin_alert',
    subject,
    html,
    leadName: ADMIN_NAME,
  });
}

export default {
  notifyAppointmentBooked,
  notifyCriticalError,
  notifyVoicemailReceived,
  notifyNoShow,
  notifyDailyStats,
};
