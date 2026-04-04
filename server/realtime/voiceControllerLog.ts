/**
 * Structured diagnostic logging for live voice turns — failure buckets for test batches.
 */

export type VoiceControllerFailureBucket =
  | "missed_intent"
  | "asked_followup_before_answer"
  | "answer_quality_insufficient"
  | "interrupt_not_honored"
  | "spoke_too_long"
  | "premature_booking"
  | "classifier_miss"
  | "recovery_failed"
  | "repetition_loop"
  | "stale_final_fired"
  | "tts_ack_too_talky"
  // Guardrail buckets
  | "small_talk_hardcode"
  | "topic_drift"
  | "low_stt_confidence"
  | "clause_blocked"
  | "clause_replaced"
  | "full_response_guardrail"
  | "loop_detected"
  | "quality_pass"
  | "quality_issues";

export function logVoiceControllerEvent(
  callId: string,
  event: "turn" | "failure" | "info" | "guardrail" | "quality_pass" | "quality_issues",
  payload: {
    bucket?: VoiceControllerFailureBucket | string;
    detail?: string;
    transcriptSnippet?: string;
    extra?: Record<string, unknown>;
    [key: string]: unknown;
  }
): void {
  const line = {
    ts: new Date().toISOString(),
    scope: "voice_controller",
    callId,
    event,
    ...payload,
  };
  console.log(`[VOICE-CTRL] ${JSON.stringify(line)}`);
}
