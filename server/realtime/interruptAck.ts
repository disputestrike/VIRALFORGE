/**
 * Shared interrupt-ack policy (realtimeVoiceEngine + VoiceRealtimePipeline).
 */

import { ENV } from "../_core/env";

export function computeInterruptAck(args: {
  speechMs: number;
  sttConfidence: number;
  assistantResponseInProgress: boolean;
  minSpeechMs?: number;
}): boolean {
  if (!ENV.interruptAckEnabled) return false;
  const low = args.sttConfidence < ENV.voiceSttConfidenceLowThreshold;
  const minSpeechMs = args.minSpeechMs ?? ENV.interruptAckMinSpeechMs;
  if (ENV.interruptAckOnLowConfidenceOnly) {
    return low;
  }
  if (args.speechMs < minSpeechMs && !low) {
    return false;
  }
  return low || (args.speechMs >= minSpeechMs && args.assistantResponseInProgress);
}
