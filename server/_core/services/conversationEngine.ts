/**
 * Conversation Engine
 * 
 * Manages real-time AI conversations during calls
 * - Generates context-aware responses
 * - Handles objections
 * - Steers toward goals (appointments)
 * - Extracts qualification data
 * - Detects intents
 */

import { invokeLLM } from './llm';
import * as voiceSessionManager from './voiceSessionManager';
import * as decisionEngine from './decisionEngine';
import * as appointmentService from './appointmentService';
import * as calendarService from './calendarService';
import * as sttService from './sttService';
import * as ttsService from './ttsService';

export interface ConversationGoal {
  primary: 'appointment_setting' | 'lead_qualification' | 'objection_handling' | 'follow_up';
  secondary?: string;
}

export interface ConversationContext {
  leadName: string;
  leadCompany?: string;
  leadIndustry?: string;
  leadTitle?: string;
  campaignContext?: string;
  conversationHistory: Array<{ role: string; content: string }>;
  goal: ConversationGoal;
  attemptNumber?: number;
  previousObjections?: string[];
}

export interface AIResponse {
  text: string;
  intent: 'greeting' | 'pitch' | 'question' | 'objection_response' | 'booking_attempt' | 'closing' | 'redirect';
  qualificationUpdate?: {
    interested?: boolean;
    objection?: string;
    budget?: string;
    timeline?: string;
  };
  suggestedNextAction?: 'book_appointment' | 'follow_up' | 'transfer' | 'end_call';
}

// ─── SYSTEM PROMPTS ───────────────────────────────────────────────────────────

const BASE_PROMPT = `You are an expert appointment-setting AI agent. Your goal is to book high-value appointments for B2B services.

CORE PRINCIPLES:
1. Be conversational and human-like, not robotic
2. Listen actively - ask questions based on what they say
3. Build rapport quickly
4. Move toward booking but don't be pushy
5. Handle objections with empathy and evidence
6. Control the conversation - lead, don't follow
7. Keep responses concise (1-3 sentences max)
8. Never say "I'm an AI" or apologize for being automated

QUALIFICATION FRAMEWORK:
You need to identify:
- NEED: Do they have a problem you can solve?
- URGENCY: How soon do they need a solution?
- AUTHORITY: Are they the decision maker?
- BUDGET: Can they afford the solution?

OBJECTION HANDLING:
Common objections and responses:
- "Send me info" → "I'd be happy to! But first, let me ask..."
- "I'm not interested" → "That's fair. Can I ask why?"
- "I need to think about it" → "I understand. What's your biggest concern?"
- "We're happy with our current vendor" → "I get it. Would you be open to..."
- "Too expensive" → "Let's focus on ROI rather than cost..."

APPOINTMENT BOOKING:
When they're ready:
1. Offer 2-3 specific times
2. Get confirmation twice (voice + calendar)
3. Get email for confirmation
4. Set reminder`;

const APPOINTMENT_SETTING_PROMPT = `${BASE_PROMPT}

YOUR IMMEDIATE GOAL: Schedule an appointment for a discovery call

OPENING: Be warm, direct, and provide clear value reason for the call

QUESTIONING: Use consultative questions:
- "What's your biggest challenge with...?"
- "How are you currently handling...?"
- "What would ideal look like for you?"

BOOKING: When qualified (showed interest + need + authority):
- "Let's lock in a time. I have Tuesday 2pm or Wednesday 10am available"
- Confirm 3 times: verbal agreement + calendar + email
- "You'll get a calendar invite in about 5 minutes"`;

const QUALIFICATION_PROMPT = `${BASE_PROMPT}

YOUR IMMEDIATE GOAL: Qualify the lead and gather information

FOCUS AREAS:
1. Need: Do they have the problem?
2. Timeline: When do they need to solve it?
3. Authority: Are they decision maker?
4. Budget: Is it within range?

APPROACH: Ask one question at a time, listen deeply, qualify gradually
Do NOT ask for appointment unless they're clearly qualified`;

// ─── RESPONSE GENERATION ──────────────────────────────────────────────────────

/**
 * Generate AI response for a user input during call
 */
export async function generateConversationResponse(
  userInput: string,
  context: ConversationContext
): Promise<AIResponse> {
  try {
    // Build system prompt based on goal
    let systemPrompt = BASE_PROMPT;

    if (context.goal.primary === 'appointment_setting') {
      systemPrompt = APPOINTMENT_SETTING_PROMPT;
    } else if (context.goal.primary === 'lead_qualification') {
      systemPrompt = QUALIFICATION_PROMPT;
    }

    // Add context
    const contextSection = buildContextSection(context);

    // Build conversation history for LLM
    const messages = [
      {
        role: 'system',
        content: `${systemPrompt}\n\n${contextSection}`,
      },
      ...context.conversationHistory,
      {
        role: 'user',
        content: userInput,
      },
    ];

    // Call LLM
    const response = await invokeLLM({
      messages: messages as any,
      temperature: 0.7, // Some creativity, but consistent
      max_tokens: 150, // Keep responses concise
    });

    const aiText = (response.choices[0]?.message?.content as string) || '';

    // Analyze response
    const intent = detectIntent(aiText);
    const qualificationUpdate = extractQualificationData(userInput, aiText, context);
    const suggestedNextAction = suggestNextAction(
      aiText,
      context.goal,
      qualificationUpdate
    );

    return {
      text: aiText,
      intent,
      qualificationUpdate,
      suggestedNextAction,
    };
  } catch (error) {
    console.error('[ConversationEngine] Response generation failed:', error);

    // Fallback response
    return {
      text: 'Sorry, I need a moment. Can you say that again?',
      intent: 'redirect',
    };
  }
}

/**
 * Handle incoming user message and update session
 */
export async function processUserMessage(
  callId: string,
  userTranscript: string,
  context: ConversationContext
): Promise<{
  response: AIResponse;
  updatedSession: ReturnType<typeof voiceSessionManager.getSession>;
}> {
  // Get current session
  const session = voiceSessionManager.getSession(callId);
  if (!session) {
    throw new Error(`Session not found: ${callId}`);
  }

  // Add user message to history
  voiceSessionManager.addMessage(callId, {
    role: 'user',
    content: userTranscript,
  });

  // Generate AI response
  const aiResponse = await generateConversationResponse(userTranscript, {
    ...context,
    conversationHistory: session.conversationHistory,
  });

  // Add AI message to history
  voiceSessionManager.addMessage(callId, {
    role: 'assistant',
    content: aiResponse.text,
  });

  // Update session with qualification data
  if (aiResponse.qualificationUpdate) {
    voiceSessionManager.updateLeadQualification(
      callId,
      aiResponse.qualificationUpdate
    );
  }

  // Update sentiment based on response
  const sentiment = detectSentiment(userTranscript);
  voiceSessionManager.updateSentiment(callId, sentiment);

  // Handle suggested actions
  if (aiResponse.suggestedNextAction === 'booking_attempt') {
    // Extract time from conversation
    const proposedTime = extractProposedTime(session.conversationHistory);
    if (proposedTime) {
      voiceSessionManager.proposeAppointment(callId, proposedTime);
    }
  }

  return {
    response: aiResponse,
    updatedSession: voiceSessionManager.getSession(callId),
  };
}

// ─── INTENT & DATA EXTRACTION ─────────────────────────────────────────────────

/**
 * Detect intent from AI response
 */
function detectIntent(
  text: string
): 'greeting' | 'pitch' | 'question' | 'objection_response' | 'booking_attempt' | 'closing' | 'redirect' {
  const lower = text.toLowerCase();

  if (
    lower.includes('let me ask') ||
    lower.includes('can you tell me') ||
    lower.includes('what') ||
    lower.includes('how') ||
    lower.includes('?')
  ) {
    return 'question';
  }

  if (
    lower.includes('schedule') ||
    lower.includes('calendar') ||
    lower.includes('tuesday') ||
    lower.includes('wednesday') ||
    lower.includes('appointment') ||
    lower.includes('time work')
  ) {
    return 'booking_attempt';
  }

  if (
    lower.includes('i understand') ||
    lower.includes('that makes sense') ||
    lower.includes('many companies') ||
    lower.includes('here\'s why')
  ) {
    return 'objection_response';
  }

  if (
    lower.includes('great') &&
    lower.includes('talk') &&
    lower.includes('soon')
  ) {
    return 'closing';
  }

  if (lower.includes('can you') && lower.includes('again')) {
    return 'redirect';
  }

  return 'pitch';
}

/**
 * Extract qualification data from conversation
 */
function extractQualificationData(
  userInput: string,
  aiResponse: string,
  context: ConversationContext
): AIResponse['qualificationUpdate'] {
  const input = userInput.toLowerCase();
  const update: AIResponse['qualificationUpdate'] = {};

  // Interest signals
  if (input.includes('sounds good') || input.includes('interested') || input.includes('yes')) {
    update.interested = true;
  }
  if (input.includes('not interested') || input.includes('no thanks') || input.includes('pass')) {
    update.interested = false;
  }

  // Objections
  if (input.includes('but') && !input.includes('yes')) {
    const objection = extractObjection(input);
    if (objection) {
      update.objection = objection;
    }
  }

  // Budget mentions
  if (input.includes('budget') || input.includes('price') || input.includes('cost')) {
    const budget = extractBudget(input);
    if (budget) {
      update.budget = budget;
    }
  }

  // Timeline
  if (input.includes('need') || input.includes('timeline') || input.includes('when')) {
    const timeline = extractTimeline(input);
    if (timeline) {
      update.timeline = timeline;
    }
  }

  return Object.keys(update).length > 0 ? update : undefined;
}

/**
 * Detect sentiment from user input
 */
function detectSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  const positive = /great|excellent|perfect|love|amazing|awesome|fantastic|wonderful|interested|yes/i;
  const negative = /terrible|hate|awful|bad|problem|issue|concern|worried|no thanks|not interested|pass/i;

  if (negative.test(text)) return 'negative';
  if (positive.test(text)) return 'positive';
  return 'neutral';
}

function extractObjection(text: string): string | null {
  const patterns = [
    /not interested in (.+?)(?:\.|,|$)/i,
    /can't (.+?)(?:\.|,|$)/i,
    /don't (.+?)(?:\.|,|$)/i,
    /too (.+?)(?:\.|,|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function extractBudget(text: string): string | null {
  const matches = text.match(/\$[\d,]+|\d{4,}/);
  if (matches) return `$${matches[0].replace(/\$/, '')}`;
  return null;
}

function extractTimeline(text: string): string | null {
  const patterns = [
    /(?:need|want) (?:it|this) (?:by|within|in) (.+?)(?:\.|,|$)/i,
    /(asap|urgent|immediately|next week|next month|Q\d|this quarter|this year)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function extractProposedTime(conversationHistory: any[]): number | null {
  // Look for time mentions in recent messages
  const recentMessages = conversationHistory.slice(-5);
  const text = recentMessages.map((m) => m.content).join(' ');

  // Simple parsing for demo
  if (text.includes('2pm') || text.includes('14:00')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    return tomorrow.getTime();
  }

  return null;
}

function suggestNextAction(
  aiResponse: string,
  goal: ConversationGoal,
  qualificationUpdate?: AIResponse['qualificationUpdate']
): AIResponse['suggestedNextAction'] | undefined {
  // If booking attempt in response
  if (
    aiResponse.toLowerCase().includes('schedule') ||
    aiResponse.toLowerCase().includes('calendar')
  ) {
    return 'booking_attempt';
  }

  // If should follow up
  if (
    qualificationUpdate?.interested === false ||
    aiResponse.toLowerCase().includes('follow')
  ) {
    return 'follow_up';
  }

  return undefined;
}

function buildContextSection(context: ConversationContext): string {
  let section = `CURRENT CONVERSATION:\n`;
  section += `Lead: ${context.leadName}`;
  if (context.leadCompany) section += `, ${context.leadCompany}`;
  if (context.leadTitle) section += `, ${context.leadTitle}`;
  section += `\n`;
  section += `Industry: ${context.leadIndustry || 'Unknown'}\n`;
  section += `Goal: ${context.goal.primary}\n`;

  if (context.campaignContext) {
    section += `Context: ${context.campaignContext}\n`;
  }

  if (context.previousObjections && context.previousObjections.length > 0) {
    section += `Previous Objections: ${context.previousObjections.join(', ')}\n`;
  }

  section += `Attempt: #${context.attemptNumber || 1}\n`;

  return section;
}

/**
 * Detect if user is confirming an appointment time slot
 */
function extractAppointmentConfirmation(
  userText: string,
  proposedSlots: Date[]
): { confirmed: boolean; selectedSlot?: Date } {
  const lower = userText.toLowerCase();

  // Check for explicit confirmation
  if (lower.includes('perfect') || lower.includes('yes') || lower.includes('works for me') || 
      lower.includes('sounds good') || lower.includes('that works')) {
    // Assume first slot if multiple proposed
    if (proposedSlots.length > 0) {
      return { confirmed: true, selectedSlot: proposedSlots[0] };
    }
    return { confirmed: true };
  }

  // Check for numbered selection (e.g., "2" or "second one" or "option 2")
  const numberMatch = userText.match(/(?:first|second|third|option\s*)?\s*(\d)\b/);
  if (numberMatch) {
    const index = parseInt(numberMatch[1]) - 1;
    if (index >= 0 && index < proposedSlots.length) {
      return { confirmed: true, selectedSlot: proposedSlots[index] };
    }
  }

  return { confirmed: false };
}

/**
 * Propose available appointment times
 */
export async function proposeAppointmentTimes(
  callId: string,
  leadId: number,
  campaignId?: number
): Promise<{ slots: Date[]; message: string }> {
  try {
    // Get next 3 available slots
    const slots = await calendarService.getNextAvailableSlots(3);

    if (slots.length === 0) {
      return {
        slots: [],
        message:
          "I apologize, but I don't have any availability right now. Can I get your email to send you available times?",
      };
    }

    // Format slots for speech
    const slotMessages = slots.map((s) => calendarService.formatTimeslotForSpeech(s)).join(", or ");

    const message = `Perfect! I have a few times available: ${slotMessages}. Which works best for you?`;

    // Store proposed slots in session for later confirmation
    const session = voiceSessionManager.getSession(callId);
    if (session) {
      (session as any).proposedSlots = slots;
    }

    return { slots, message };
  } catch (error) {
    console.error("[ConversationEngine] Error proposing appointments:", error);
    return {
      slots: [],
      message: "I'm having trouble checking my calendar. Can I call you back with available times?",
    };
  }
}

/**
 * Book appointment when confirmed
 */
export async function confirmAndBookAppointment(
  callId: string,
  leadId: number,
  appointmentTime: Date,
  campaignId?: number
): Promise<{ success: boolean; appointmentId?: number; message: string }> {
  try {
    // Validate time is during business hours
    if (!calendarService.isValidAppointmentTime(appointmentTime)) {
      return {
        success: false,
        message: "That time is outside our business hours. Let me suggest some other options.",
      };
    }

    // Book the appointment
    const appointment = await appointmentService.bookAppointment(
      leadId,
      appointmentTime,
      campaignId,
      undefined // voiceSessionId - would be populated if we had it
    );

    console.log(
      `[ConversationEngine] Appointment booked: ${appointment.id} for lead ${leadId} at ${appointmentTime.toISOString()}`
    );

    // Update session
    const session = voiceSessionManager.getSession(callId);
    if (session) {
      session.appointmentProposed = {
        time: appointmentTime.getTime(),
        confirmed: true,
      };
    }

    const timeStr = calendarService.formatTimeSlot(appointmentTime);
    return {
      success: true,
      appointmentId: appointment.id,
      message: `Excellent! Your appointment is confirmed for ${timeStr}. You'll receive a confirmation SMS and email shortly with all the details.`,
    };
  } catch (error) {
    console.error("[ConversationEngine] Error booking appointment:", error);
    return {
      success: false,
      message: "I'm having trouble booking your appointment. Can I get your email and someone will follow up with you?",
    };
  }
}

export default {
  generateConversationResponse,
  processUserMessage,
  proposeAppointmentTimes,
  confirmAndBookAppointment,
  detectIntent,
  extractQualificationData,
  detectSentiment,
};
