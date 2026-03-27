/**
 * CONVERSATION ENGINE — Real AI conversation using LLM
 * Uses the existing invokeLLM infrastructure
 */

import { invokeLLM } from "../llm";

export type ConversationAction =
  | "transfer"
  | "follow_up"
  | "book_appointment"
  | "end_call"
  | "propose_times"
  | undefined;

export interface ConversationContext {
  leadId: number;
  leadName?: string;
  company?: string;
  industry?: string;
  campaignGoal?: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  userText: string;
}

export interface ConversationResult {
  response: string;
  action: ConversationAction;
  confidence: number;
}

const SYSTEM_PROMPT = `You are an AI sales assistant making outbound calls on behalf of a company.
Your goal is to qualify leads and book appointments.

Rules:
- Be conversational, warm, and professional
- Keep responses SHORT (2-3 sentences max — this is a phone call)
- If the lead is interested, guide them to book an appointment
- If they want to speak with a human, say you will transfer them
- If they are not interested, be gracious and end politely
- Detect intent: is the lead interested, uninterested, wants callback, or ready to book?

You MUST respond with ONLY a valid JSON object, no other text:
{"response":"your spoken response here","action":"follow_up|book_appointment|propose_times|transfer|end_call","confidence":0.9}`;

export async function conductConversation(context: ConversationContext): Promise<ConversationResult> {
  try {
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT + `\n\nLead info: ${context.leadName || "Unknown"}, Company: ${context.company || "Unknown"}, Industry: ${context.industry || "Unknown"}. Campaign goal: ${context.campaignGoal || "book appointment"}.` },
    ];

    // Add conversation history
    for (const turn of context.conversationHistory) {
      messages.push({ role: turn.role === "user" ? "user" : "assistant", content: turn.content });
    }

    // Add current user message
    messages.push({ role: "user", content: context.userText });

    const result = await invokeLLM({
      messages,
      // json_object response format handled via prompt instruction
    });

    const content = result.choices[0]?.message?.content;
    if (!content) throw new Error("Empty LLM response");

    // Parse JSON response
    const parsed = typeof content === "string" ? JSON.parse(content) : content;

    return {
      response: parsed.response || "How can I help you today?",
      action: (parsed.action as ConversationAction) || "follow_up",
      confidence: parsed.confidence ?? 0.7,
    };
  } catch (error) {
    console.error("[ConversationEngine] LLM error:", error);
    // Graceful fallback
    return {
      response: "I apologize, let me connect you with one of our team members.",
      action: "transfer",
      confidence: 0.5,
    };
  }
}

export async function generateConversationResponse(context: {
  history: Array<{ role: "user" | "assistant"; content: string }>;
  text: string;
  leadName?: string;
  industry?: string;
}): Promise<ConversationResult> {
  return conductConversation({
    leadId: 0,
    leadName: context.leadName,
    industry: context.industry,
    conversationHistory: context.history,
    userText: context.text,
  });
}

export async function proposeAppointmentTimes(leadId: number): Promise<{
  times: Array<{ time: Date; label: string; available: boolean }>;
}> {
  const now = new Date();
  const slots = [];

  // Generate next 5 available business slots
  for (let day = 1; day <= 5; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);
    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    for (const hour of [9, 11, 14]) {
      date.setHours(hour, 0, 0, 0);
      slots.push({
        time: new Date(date),
        label: date.toLocaleString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        available: true,
      });
      if (slots.length >= 3) break;
    }
    if (slots.length >= 3) break;
  }

  return { times: slots };
}

export async function confirmAndBookAppointment(
  leadId: number,
  time: Date
): Promise<{ appointmentId: number; time: Date; status: string }> {
  const { bookAppointment } = await import("./appointmentService");
  const result = await bookAppointment({
    leadId,
    scheduledTime: time,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
    confirmationMethod: "voice",
  });
  console.log(`[ConversationEngine] Appointment booked | leadId: ${leadId} | id: ${result.id} | time: ${time}`);
  return { appointmentId: result.id, time, status: result.status };
}

export default {
  conductConversation,
  generateConversationResponse,
  proposeAppointmentTimes,
  confirmAndBookAppointment,
};
