/**
 * Shared interrupt-ack policy (realtimeVoiceEngine + VoiceRealtimePipeline).
 */

import { ENV } from "../_core/env";

export function computeInterruptAck(args: {
  speechMs: number;
  sttConfidence: number;
  assistantResponseInProgress: boolean;
}): boolean {
  if (!ENV.interruptAckEnabled) return false;
  const low = args.sttConfidence < ENV.voiceSttConfidenceLowThreshold;
  if (ENV.interruptAckOnLowConfidenceOnly) {
    return low;
  }
  if (args.speechMs < ENV.interruptAckMinSpeechMs && !low) {
    return false;
  }
  return low || (args.speechMs >= ENV.interruptAckMinSpeechMs && args.assistantResponseInProgress);
}
