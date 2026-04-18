/**
 * responseStyler.ts — Conversation-state-aware prompt block builder.
 *
 * Generates the "CONVERSATION STATE CONTROLLER" block that is prepended to
 * the strict controller block before every LLM call. This block:
 *
 *   • Locks the active topic so the LLM can't pivot mid-sentence
 *   • Tells the LLM the STAY/PIVOT/REPAIR/CLOSE decision so it knows
 *     whether to answer more concisely, acknowledge frustration, etc.
 *   • Bans mid-conversation reset phrases when hard_no_reset = true
 *   • Scales response length down as repeat_count increases
 *
 * No new information is invented — only the caller's own context is injected.
 */

import type { ConversationState } from "./conversationState";
import type { StayPivotDecision } from "./stayPivotController";

/**
 * Build the conversation-state controller block to inject before the
 * strict controller block in the LLM system prompt.
 *
 * Returns an empty string when hard_no_reset is false (first caller turn).
 */
export function buildConversationStateBlock(
  state: ConversationState,
  decision: StayPivotDecision
): string {
  // No injection on first turn — let the greeting / opening flow naturally
  if (!state.hard_no_reset) return "";

  const lines: string[] = [
    "=== CONVERSATION STATE CONTROLLER (highest priority) ===",
    "",
  ];

  // ── Active topic lock ─────────────────────────────────────────────────────
  if (state.active_topic) {
    lines.push(`ACTIVE TOPIC: "${state.active_topic}"`);
    lines.push(
      "TOPIC LOCK: You are already mid-conversation on this topic. " +
        "Do NOT introduce a new topic or re-ask questions already answered."
    );
    lines.push("");
  }

  // ── Caller's canonical question ───────────────────────────────────────────
  if (state.canonical_user_question) {
    lines.push(`CALLER'S QUESTION: "${state.canonical_user_question}"`);
  }

  // ── Last answer given (prevents contradiction + helps STAY be shorter) ────
  if (state.last_answer_summary) {
    lines.push(
      `LAST ANSWER GIVEN: "${state.last_answer_summary.slice(0, 150)}${state.last_answer_summary.length > 150 ? "…" : ""}"`
    );
  }

  lines.push("");
  lines.push(`REPEAT COUNT: ${state.repeat_count}  |  FRUSTRATION SCORE: ${state.frustration_score}/10  |  PATIENCE: ${state.patience_level.toUpperCase()}`);
  lines.push("");

  // ── Decision-specific instructions ───────────────────────────────────────
  switch (decision) {
    case "STAY":
      lines.push("ROUTING DECISION: STAY");
      lines.push(
        "The caller is repeating or clarifying the SAME question they already asked."
      );
      lines.push("REQUIRED: Answer the question directly. Lead with the answer, not a question.");
      lines.push("");

      if (state.repeat_count <= 1) {
        lines.push(
          "RESPONSE STYLE: Normal directness. Give a clear, complete answer in 2 sentences."
        );
      } else if (state.repeat_count === 2) {
        lines.push(
          "RESPONSE STYLE: SIMPLER and MORE CONCISE than last time. " +
            "Lead with the key number or fact. One sentence is fine."
        );
      } else if (state.repeat_count === 3) {
        lines.push(
          "RESPONSE STYLE: SHORT. Lead with the number/fact immediately. " +
            "Absolute maximum: 1–2 short sentences."
        );
      } else {
        lines.push(
          `RESPONSE STYLE: Ultra-direct. Give the single key fact (max 1 sentence), ` +
            `then ask: "Does that answer your question?" — nothing else.`
        );
      }

      lines.push("");
      lines.push("BANNED THIS TURN:");
      lines.push('  ✗ Do NOT ask a new discovery question');
      lines.push('  ✗ Do NOT open new topics or give background they did not ask for');
      lines.push('  ✗ Do NOT say "What can I help you with today?"');
      lines.push('  ✗ Do NOT say "How does that impact your business?"');
      lines.push('  ✗ Do NOT expand the answer — get shorter, not longer');
      break;

    case "REPAIR":
      lines.push("ROUTING DECISION: REPAIR");
      lines.push(
        "The caller is frustrated. They used a phrase like \"I said\", \"hello?\", or similar."
      );
      lines.push("REQUIRED:");
      lines.push("  1. Acknowledge briefly (ONE short phrase — \"I'm still here.\" or \"Got it.\")");
      if (state.canonical_user_question) {
        lines.push(
          `  2. Restate their question: "You're asking ${state.canonical_user_question}."`
        );
      }
      lines.push("  3. Answer it directly and concisely.");
      lines.push("");
      lines.push("BANNED THIS TURN:");
      lines.push('  ✗ Do NOT ask multiple questions');
      lines.push('  ✗ Do NOT open new topics');
      lines.push('  ✗ Do NOT repeat your introduction ("I\'m Alex…")');
      lines.push('  ✗ Do NOT ask "What would you like to know?"');
      break;

    case "CLOSE":
      lines.push("ROUTING DECISION: CLOSE");
      lines.push("The caller has confirmed or acknowledged. This topic is resolved.");
      lines.push(
        `ACTION: One short sentence acknowledging. Then: "Anything else about ${state.active_topic ?? "that"}?" — stop.`
      );
      lines.push("");
      lines.push("BANNED THIS TURN:");
      lines.push('  ✗ Do NOT say "What can I help you with today?" — be specific about the topic');
      lines.push('  ✗ Do NOT pitch new features unprompted');
      break;

    case "PIVOT":
      lines.push("ROUTING DECISION: PIVOT");
      lines.push("The caller has moved to a genuinely new topic. Answer the new question directly.");
      lines.push("BANNED THIS TURN:");
      lines.push('  ✗ Do NOT re-introduce yourself (no "I\'m Alex…" unless this is turn 1)');
      lines.push('  ✗ Do NOT re-state the previous topic');
      break;
  }

  lines.push("");

  // ── Hard no-reset rule (always present after turn 1) ─────────────────────
  lines.push("NO MID-CONVERSATION RESET (ABSOLUTE RULE):");
  lines.push("The following phrases are BANNED unless this is the very first turn of a new call:");
  lines.push('  ✗ "I\'m Alex, an AI assistant on this line"');
  lines.push('  ✗ "ApexAI, Alex speaking"');
  lines.push('  ✗ "What can I help you with today?"');
  lines.push('  ✗ "How can I help you today?"');
  lines.push('  ✗ "What would you like to know?"');
  lines.push(
    "Saying these mid-call signals to the caller that you lost the thread — " +
      "which is exactly what we are preventing."
  );

  lines.push("");
  lines.push("=== END CONVERSATION STATE CONTROLLER ===");

  return lines.join("\n");
}
