/**
 * FIX 9: Voicemail Storage
 * 
 * Currently: Voicemail receives transcription but doesn't store it
 * Problem: No database of voicemails, no retrieval, no follow-up tracking
 */

export async function storeVoicemail(
  fromNumber: string,
  toNumber: string,
  transcription: string,
  recordingUrl: string,
  recordingDuration: number
): Promise<number | null> {
  try {
    const { query } = await import("../db");

    // First, find or create lead from incoming number
    const leadResult = await query(
      `SELECT id FROM leads WHERE phone = ?`,
      [fromNumber]
    );

    let leadId: number | null = null;
    if (leadResult && leadResult.length > 0) {
      leadId = (leadResult[0] as any).id;
    } else {
      // Create new lead from voicemail
      const createResult = await query(
        `INSERT INTO leads (firstName, lastName, phone, source, status, score, segment, lastContactedAt)
         VALUES (?, ?, ?, 'voicemail', 'new', 50, 'warm', NOW())`,
        ['Voicemail', fromNumber.slice(-4), fromNumber]
      );
      leadId = (createResult as any).insertId;
      console.log(`[Voicemail] Created new lead ${leadId} from voicemail`);
    }

    // Store voicemail record
    // Using call_recordings table for now (could create voicemail_recordings table)
    const result = await query(
      `INSERT INTO call_recordings 
        (leadId, duration, status, outcome, transcript, recordingUrl, calledAt)
       VALUES (?, ?, 'completed', 'voicemail', ?, ?, NOW())`,
      [leadId, recordingDuration, transcription, recordingUrl]
    );

    const voicemailId = (result as any).insertId;
    console.log(`[Voicemail] Stored voicemail ${voicemailId} from ${fromNumber}`);

    return voicemailId;
  } catch (error) {
    console.error("[Voicemail] Error storing voicemail:", error);
    return null;
  }
}

/**
 * Get all pending voicemails for admin
 */
export async function getPendingVoicemails(): Promise<any[]> {
  try {
    const { query } = await import("../db");

    const result = await query(
      `SELECT cr.id, cr.leadId, cr.transcript, cr.recordingUrl, cr.calledAt, l.firstName, l.phone
       FROM call_recordings cr
       JOIN leads l ON cr.leadId = l.id
       WHERE cr.outcome = 'voicemail' AND cr.calledAt > DATE_SUB(NOW(), INTERVAL 24 HOUR)
       ORDER BY cr.calledAt DESC
       LIMIT 50`
    );

    return result || [];
  } catch (error) {
    console.error("[Voicemail] Error getting pending voicemails:", error);
    return [];
  }
}

/**
 * Mark voicemail as processed
 */
export async function markVoicemailAsProcessed(
  voicemailId: number,
  action: 'callback_scheduled' | 'transferred' | 'archived'
): Promise<boolean> {
  try {
    const { query } = await import("../db");

    await query(
      `UPDATE call_recordings 
       SET outcome = ? 
       WHERE id = ?`,
      [action, voicemailId]
    );

    console.log(`[Voicemail] Marked voicemail ${voicemailId} as ${action}`);
    return true;
  } catch (error) {
    console.error("[Voicemail] Error updating voicemail:", error);
    return false;
  }
}

/**
 * Extract action items from voicemail transcription
 */
export function extractVoicemailAction(transcription: string): {
  wantsCallback: boolean;
  wantsEmail: boolean;
  urgency: 'high' | 'medium' | 'low';
  keywords: string[];
} {
  const lower = transcription.toLowerCase();

  const wantsCallback = /call.*back|please.*call|call.*me/i.test(lower);
  const wantsEmail = /email|send.*email|contact.*email/i.test(lower);

  // Urgency detection
  let urgency: 'high' | 'medium' | 'low' = 'medium';
  if (/urgent|emergency|asap|right now|immediately/i.test(lower)) {
    urgency = 'high';
  } else if (/whenever|no rush|take your time/i.test(lower)) {
    urgency = 'low';
  }

  // Extract keywords
  const keywords: string[] = [];
  const keywordPatterns = [
    /problem|issue|error|bug/i,
    /help|support|assist/i,
    /invoice|payment|billing/i,
    /question|inquir/i,
    /sales|interested|buy/i,
    /cancel|delete|remove/i,
  ];

  for (const pattern of keywordPatterns) {
    if (pattern.test(lower)) {
      keywords.push(pattern.source.split('|')[0].replace(/[\\|()]/g, ''));
    }
  }

  return {
    wantsCallback,
    wantsEmail,
    urgency,
    keywords,
  };
}

/**
 * Generate voicemail follow-up task
 */
export function generateVoicemailTask(
  voicemailId: number,
  leadId: number,
  transcription: string
): {
  type: 'callback' | 'email' | 'transfer';
  priority: 'high' | 'medium' | 'low';
  dueTime: Date;
  description: string;
} {
  const action = extractVoicemailAction(transcription);

  // Determine follow-up type
  let type: 'callback' | 'email' | 'transfer' = 'callback';
  if (action.wantsEmail && !action.wantsCallback) {
    type = 'email';
  }
  if (action.urgency === 'high') {
    type = 'callback'; // High urgency always = callback
  }

  // Determine due time
  const dueTime = new Date();
  if (action.urgency === 'high') {
    dueTime.setHours(dueTime.getHours() + 1); // 1 hour for urgent
  } else if (action.urgency === 'medium') {
    dueTime.setHours(dueTime.getHours() + 4); // 4 hours for medium
  } else {
    dueTime.setDate(dueTime.getDate() + 1); // Next day for low urgency
  }

  return {
    type,
    priority: action.urgency,
    dueTime,
    description: `Follow up on voicemail: ${transcription.substring(0, 100)}...`,
  };
}

export default {
  storeVoicemail,
  getPendingVoicemails,
  markVoicemailAsProcessed,
  extractVoicemailAction,
  generateVoicemailTask,
};
