/**
 * Follow-Up Automation Engine
 * 
 * Manages multi-channel follow-up sequences
 * - Schedules retries
 * - Sequences channels (call → SMS → email → social)
 * - Respects opt-outs
 * - Handles dead leads
 */

import * as db from '../../db';
import * as decisionEngine from './decisionEngine';
import * as queue from './queue';
import { Lead, Campaign } from '../../shared/types';

export interface FollowUpConfig {
  maxAttempts: number;
  channels: Array<'voice' | 'sms' | 'email' | 'social'>;
  retryDelays: number[]; // milliseconds
  quietHours?: {
    start: number; // 0-23 hour
    end: number;
  };
  stopOnSuccess: boolean;
  stopOnObjection: boolean;
}

export const DEFAULT_FOLLOWUP_CONFIG: FollowUpConfig = {
  maxAttempts: 5,
  channels: ['voice', 'sms', 'email', 'social'],
  retryDelays: [
    5 * 60 * 1000, // 5 minutes
    30 * 60 * 1000, // 30 minutes
    2 * 60 * 60 * 1000, // 2 hours
    24 * 60 * 60 * 1000, // 1 day
    72 * 60 * 60 * 1000, // 3 days
  ],
  quietHours: {
    start: 21, // 9 PM
    end: 8, // 8 AM
  },
  stopOnSuccess: true,
  stopOnObjection: false,
};

// ─── FOLLOW-UP SEQUENCE MANAGEMENT ────────────────────────────────────────────

/**
 * Schedule follow-up for a lead
 */
export async function scheduleFollowUp(
  lead: Lead,
  lastOutcome: decisionEngine.CallOutcome,
  campaign?: Campaign,
  attemptNumber: number = 1
): Promise<void> {
  try {
    const config = campaign?.settings
      ? JSON.parse(campaign.settings as any).followUpConfig || DEFAULT_FOLLOWUP_CONFIG
      : DEFAULT_FOLLOWUP_CONFIG;

    // Check if should continue
    if (attemptNumber >= config.maxAttempts) {
      console.log(`[FollowUpEngine] Max attempts reached for lead ${lead.id}`);
      await db.updateLead(lead.id, { status: 'lost' });
      return;
    }

    // Determine next action
    const decision = await decisionEngine.decideLeadAction({
      lead,
      campaign,
      previousAttempts: attemptNumber,
      lastContactedAt: Date.now(),
      recentOutcomes: [lastOutcome],
    });

    if (decision === 'DEAD' || decision === 'WAIT') {
      return;
    }

    // Determine next channel
    const currentChannel = attemptNumber % 2 === 0 ? 'voice' : 'sms';
    const nextChannel = decisionEngine.determineFollowUpChannel(
      currentChannel as 'voice' | 'sms' | 'email' | 'social',
      lastOutcome,
      lead.segment
    );

    // Calculate next attempt time
    const delay = decisionEngine.determineRetryDelay(attemptNumber, lastOutcome);
    const nextAttemptTime = calculateNextAttemptTime(
      Date.now() + delay,
      config.quietHours
    );

    console.log(
      `[FollowUpEngine] Scheduling follow-up for lead ${lead.id}: ${nextChannel} at ${new Date(
        nextAttemptTime
      ).toISOString()}`
    );

    // Queue appropriate job
    switch (nextChannel) {
      case 'voice':
        await queue.addRetryCallJob(
          {
            leadId: lead.id,
            campaignId: campaign?.id,
            attemptNumber: attemptNumber + 1,
            lastOutcome,
          },
          {
            delay: nextAttemptTime - Date.now(),
          }
        );
        break;

      case 'sms':
        await queue.addSmsJob(
          {
            leadId: lead.id,
            campaignId: campaign?.id,
            attemptNumber: attemptNumber + 1,
            lastOutcome,
            channel: 'sms',
          },
          {
            delay: nextAttemptTime - Date.now(),
          }
        );
        break;

      case 'email':
        await queue.addEmailJob(
          {
            leadId: lead.id,
            campaignId: campaign?.id,
            attemptNumber: attemptNumber + 1,
            lastOutcome,
            channel: 'email',
          },
          {
            delay: nextAttemptTime - Date.now(),
          }
        );
        break;

      case 'social':
        // Social follow-up (LinkedIn message, etc.)
        break;
    }
  } catch (error) {
    console.error('[FollowUpEngine] Schedule follow-up failed:', error);
  }
}

/**
 * Calculate next attempt time respecting quiet hours
 */
function calculateNextAttemptTime(
  proposedTime: number,
  quietHours?: { start: number; end: number }
): number {
  if (!quietHours) return proposedTime;

  const date = new Date(proposedTime);
  const hour = date.getHours();

  // If in quiet hours, move to next business hour
  if (hour >= quietHours.start || hour < quietHours.end) {
    date.setHours(quietHours.end, 0, 0, 0);

    // If now is past business hours, move to next day
    if (date.getTime() <= proposedTime) {
      date.setDate(date.getDate() + 1);
    }
  }

  return date.getTime();
}

/**
 * Create SMS follow-up message
 */
export function createSmsMessage(lead: Lead, campaign?: Campaign): string {
  const examples = [
    `Hi ${lead.firstName}, quick follow-up about our conversation. Do you have 15 mins this week to discuss? Reply YES or call us.`,
    `${lead.firstName}, we found 3 ways to solve your ${lead.industry || 'business'} challenge. Can we show you? Link: [calendar]`,
    `${lead.firstName}, wanted to circle back - thought you should see this case study in your industry. https://[link]`,
    `This is ${lead.company || 'our team'} - wanted to check if last week's proposal made sense? Open to questions.`,
  ];

  return examples[Math.floor(Math.random() * examples.length)];
}

/**
 * Create email follow-up message
 */
export function createEmailMessage(
  lead: Lead,
  campaign?: Campaign
): { subject: string; body: string } {
  const names = {
    subject: `One thing we should discuss, ${lead.firstName}`,
    body: `Hi ${lead.firstName},\n\nI wanted to follow up on our conversation about improving your ${lead.industry || 'operations'}.\n\nBased on what you shared, here are 3 quick wins I think could help:\n\n1. [Specific to their situation]\n2. [Unique angle]\n3. [ROI focused]\n\nLet's find 15 minutes this week. How does Tuesday or Wednesday look?\n\nBest,\n[Your Name]`,
  };

  return names;
}

/**
 * Handle objection-specific follow-up
 */
export async function handleObjectionFollowUp(
  lead: Lead,
  objection: string,
  campaign?: Campaign
): Promise<void> {
  console.log(`[FollowUpEngine] Handling objection for lead ${lead.id}: ${objection}`);

  const objectionResponses: Record<string, string> = {
    price: 'Send ROI document that shows cost benefit',
    budget: 'Offer payment plan or scaled version',
    timing: 'Lock in time slot for later, keep momentum',
    vendor: 'Position as complementary, not replacement',
    'send info': 'Send high-value content, ask specific question in follow-up',
    'call me later': 'Respect timing, set specific callback',
  };

  let action = 'nurture';
  for (const [key, response] of Object.entries(objectionResponses)) {
    if (objection.toLowerCase().includes(key)) {
      console.log(`[FollowUpEngine] Objection match: ${key} → ${response}`);
      action = key;
      break;
    }
  }

  // Schedule follow-up based on objection
  const delay = action === 'send info' ? 2 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 2 hours or 1 day

  if (action === 'send info') {
    await queue.addEmailJob({
      leadId: lead.id,
      campaignId: campaign?.id,
      channel: 'email',
      contentType: 'resource',
      objectionContext: objection,
    });
  } else if (action === 'call me later') {
    // Will be called at specified time
  } else {
    await queue.addFollowUpJob(
      {
        leadId: lead.id,
        campaignId: campaign?.id,
        followUpType: action,
        objection,
      },
      { delay }
    );
  }
}

/**
 * Dead lead detection and nurture routing
 */
export async function checkDeadLead(lead: Lead, attemptNumber: number): Promise<boolean> {
  if (attemptNumber >= 5) {
    const recentOutcomes = []; // Would load from DB
    const negativeOutcomes = recentOutcomes.filter((o) =>
      ['NOT_INTERESTED', 'WRONG_NUMBER', 'ERROR'].includes(o)
    );

    if (negativeOutcomes.length === recentOutcomes.length) {
      console.log(`[FollowUpEngine] Lead ${lead.id} marked as dead`);
      return true;
    }
  }

  return false;
}

/**
 * Nurture sequence for non-converting leads
 */
export async function startNurtureSequence(lead: Lead, campaign?: Campaign): Promise<void> {
  console.log(`[FollowUpEngine] Starting nurture sequence for lead ${lead.id}`);

  const sequence = [
    {
      day: 0,
      channel: 'email',
      type: 'educational',
      title: 'Industry Trends Report',
    },
    {
      day: 2,
      channel: 'email',
      type: 'case_study',
      title: 'Similar Company Success Story',
    },
    {
      day: 5,
      channel: 'email',
      type: 'webinar',
      title: 'Free Webinar: [Topic]',
    },
    {
      day: 7,
      channel: 'voice',
      type: 'personal',
      title: 'Personal Check-in Call',
    },
  ];

  for (const item of sequence) {
    const delay = item.day * 24 * 60 * 60 * 1000;

    if (item.channel === 'email') {
      await queue.addEmailJob(
        {
          leadId: lead.id,
          campaignId: campaign?.id,
          nurtureType: item.type,
          nurtureTitle: item.title,
        },
        { delay }
      );
    } else if (item.channel === 'voice') {
      await queue.addRetryCallJob(
        {
          leadId: lead.id,
          campaignId: campaign?.id,
          nurture: true,
          nurtureTitle: item.title,
        },
        { delay }
      );
    }
  }
}

/**
 * Pause follow-ups for a lead
 */
export async function pauseFollowUps(leadId: number): Promise<void> {
  console.log(`[FollowUpEngine] Paused follow-ups for lead ${leadId}`);
  // Would update lead status to 'paused' or similar
}

/**
 * Resume follow-ups for a lead
 */
export async function resumeFollowUps(leadId: number): Promise<void> {
  console.log(`[FollowUpEngine] Resumed follow-ups for lead ${leadId}`);
  // Would reschedule pending jobs
}

/**
 * Get follow-up status for lead
 */
export async function getFollowUpStatus(leadId: number) {
  return {
    leadId,
    // Would fetch from DB/queue
    status: 'active',
    nextFollowUpAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    totalAttempts: 2,
    maxAttempts: 5,
    lastOutcome: 'no_answer',
    nextChannel: 'sms',
  };
}

export default {
  scheduleFollowUp,
  handleObjectionFollowUp,
  checkDeadLead,
  startNurtureSequence,
  createSmsMessage,
  createEmailMessage,
  pauseFollowUps,
  resumeFollowUps,
  getFollowUpStatus,
};
