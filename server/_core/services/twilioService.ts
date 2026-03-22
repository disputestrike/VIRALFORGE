/**
 * Twilio Service
 * 
 * Manages real outbound calling with Twilio
 * - Initiates calls
 * - Handles webhooks
 * - Tracks call status
 * - Manages call recording
 */

import twilio from 'twilio';
import { ENV } from './env';
import * as voiceSessionManager from './voiceSessionManager';
import * as db from '../db';

// Initialize Twilio client
const twilioClient = twilio(
  ENV.twilioSid || process.env.TWILIO_ACCOUNT_SID,
  ENV.twilioAuth || process.env.TWILIO_AUTH_TOKEN
);

export interface CallInitiationOptions {
  leadId: number;
  phoneNumber: string;
  campaignId?: number;
  language?: string;
  voicePersona?: 'male' | 'female' | 'neutral';
}

export interface TwilioCallResponse {
  callSid: string;
  phoneNumber: string;
  status: 'initiated' | 'queued' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
  direction: string;
}

// ─── CALL INITIATION ──────────────────────────────────────────────────────────

/**
 * Initiate an outbound call
 */
export async function initiateCall(options: CallInitiationOptions): Promise<TwilioCallResponse> {
  try {
    const { leadId, phoneNumber, campaignId, voicePersona = 'female', language = 'en' } = options;

    console.log(`[TwilioService] Initiating call to ${phoneNumber} for lead ${leadId}`);

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      throw new Error('Invalid phone number');
    }

    // Create session
    const session = voiceSessionManager.createSession(leadId, `call_${Date.now()}`, normalizedPhone);

    // Initiate Twilio call
    const call = await twilioClient.calls.create({
      to: normalizedPhone,
      from: ENV.twilioPhone || process.env.TWILIO_PHONE_NUMBER || '+1234567890',
      url: `${ENV.baseUrl}/api/voice/start?leadId=${leadId}&sessionId=${session.callId}&campaign=${campaignId || ''}`,
      method: 'POST',
      statusCallback: `${ENV.baseUrl}/api/voice/status`,
      statusCallbackMethod: 'POST',
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      record: true,
      recordingStatusCallback: `${ENV.baseUrl}/api/voice/recording`,
      recordingStatusCallbackMethod: 'POST',
      machineDetection: 'Enable',
      machineDetectionTimeout: 5000,
      machineDetectionSpeechThreshold: 2500,
      machineDetectionSpeechEndThreshold: 1200,
    });

    console.log(`[TwilioService] Call initiated: ${call.sid} for lead ${leadId}`);

    // Update session with call SID
    voiceSessionManager.updateSessionStatus(session.callId, 'ringing');

    return {
      callSid: call.sid,
      phoneNumber: normalizedPhone,
      status: 'initiated',
      direction: call.direction || 'outbound-api',
    };
  } catch (error) {
    console.error('[TwilioService] Call initiation failed:', error);
    throw error;
  }
}

/**
 * Get call details
 */
export async function getCallDetails(callSid: string) {
  try {
    const call = await twilioClient.calls(callSid).fetch();

    return {
      sid: call.sid,
      status: call.status,
      duration: call.duration,
      direction: call.direction,
      from: call.from,
      to: call.to,
      startTime: call.startTime,
      endTime: call.endTime,
      price: call.price,
    };
  } catch (error) {
    console.error('[TwilioService] Failed to get call details:', error);
    throw error;
  }
}

/**
 * Hang up a call
 */
export async function hangUpCall(callSid: string) {
  try {
    const call = await twilioClient.calls(callSid).update({ status: 'completed' });
    console.log(`[TwilioService] Call ${callSid} hung up`);
    return call;
  } catch (error) {
    console.error('[TwilioService] Failed to hang up call:', error);
    throw error;
  }
}

/**
 * Redirect call to a different number (live transfer)
 */
export async function transferCall(callSid: string, toNumber: string) {
  try {
    const normalizedPhone = normalizePhoneNumber(toNumber);
    if (!normalizedPhone) {
      throw new Error('Invalid transfer number');
    }

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.dial(normalizedPhone);

    const call = await twilioClient.calls(callSid).update({
      twiml: twiml.toString(),
    });

    console.log(`[TwilioService] Call ${callSid} transferred to ${normalizedPhone}`);
    return call;
  } catch (error) {
    console.error('[TwilioService] Failed to transfer call:', error);
    throw error;
  }
}

/**
 * Leave a voicemail
 */
export async function leaveVoicemail(
  leadId: number,
  phoneNumber: string,
  message: string,
  campaignId?: number
) {
  try {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      throw new Error('Invalid phone number');
    }

    console.log(`[TwilioService] Initiating voicemail to ${normalizedPhone} for lead ${leadId}`);

    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say(message, { voice: 'alice', language: 'en-US' });

    const call = await twilioClient.calls.create({
      to: normalizedPhone,
      from: ENV.twilioPhone || process.env.TWILIO_PHONE_NUMBER || '+1234567890',
      url: `data:application/xml,${encodeURIComponent(twiml.toString())}`,
      method: 'POST',
      record: true,
      recordingStatusCallback: `${ENV.baseUrl}/api/voice/recording`,
      recordingStatusCallbackMethod: 'POST',
    });

    console.log(`[TwilioService] Voicemail initiated: ${call.sid}`);

    return {
      callSid: call.sid,
      status: 'voicemail_sent',
    };
  } catch (error) {
    console.error('[TwilioService] Voicemail failed:', error);
    throw error;
  }
}

// ─── WEBHOOK HANDLERS ──────────────────────────────────────────────────────────

/**
 * Handle call status webhook
 */
export async function handleCallStatusWebhook(data: {
  CallSid: string;
  CallStatus: string;
  From: string;
  To: string;
  DialCallStatus?: string;
  DialCallDuration?: string;
  AnsweredBy?: string;
  Timestamp: string;
}) {
  try {
    console.log(`[TwilioService] Status webhook: ${data.CallSid} - ${data.CallStatus}`);

    const { CallSid, CallStatus, AnsweredBy, DialCallStatus } = data;

    // Machine detection
    if (CallStatus === 'in-progress' && AnsweredBy === 'machine_detection_enabled') {
      if (DialCallStatus === 'failed' || AnsweredBy === 'machine') {
        console.log(`[TwilioService] Machine detection: Call ${CallSid} answered by machine`);
        // Hang up or handle machine
        await hangUpCall(CallSid);
      }
    }

    // Find and update session
    // Note: In production, you'd store call SID -> session ID mapping
  } catch (error) {
    console.error('[TwilioService] Status webhook error:', error);
  }
}

/**
 * Handle recording webhook
 */
export async function handleRecordingWebhook(data: {
  CallSid: string;
  RecordingUrl: string;
  RecordingDuration: string;
  RecordingSid: string;
}) {
  try {
    console.log(`[TwilioService] Recording webhook: ${data.CallSid}`);
    console.log(`Recording URL: ${data.RecordingUrl}`);

    // Store recording URL in database
    // This will be associated with the voice session
  } catch (error) {
    console.error('[TwilioService] Recording webhook error:', error);
  }
}

// ─── UTILITIES ─────────────────────────────────────────────────────────────────

/**
 * Normalize phone number to E.164 format
 */
function normalizePhoneNumber(phoneNumber: string): string | null {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');

  // Handle different lengths
  if (cleaned.length === 10) {
    // US number without country code
    cleaned = '1' + cleaned;
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    // Already has US country code
  } else if (cleaned.length < 10 || cleaned.length > 15) {
    return null;
  }

  return '+' + cleaned;
}

/**
 * Check if number is valid
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  return normalizePhoneNumber(phoneNumber) !== null;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phoneNumber: string): string {
  const normalized = normalizePhoneNumber(phoneNumber);
  if (!normalized) return phoneNumber;

  // Format as (123) 456-7890 if US number
  if (normalized.startsWith('+1') && normalized.length === 12) {
    const digits = normalized.substring(2);
    return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
  }

  return normalized;
}

export default {
  initiateCall,
  getCallDetails,
  hangUpCall,
  transferCall,
  leaveVoicemail,
  handleCallStatusWebhook,
  handleRecordingWebhook,
  isValidPhoneNumber,
  formatPhoneNumber,
};
