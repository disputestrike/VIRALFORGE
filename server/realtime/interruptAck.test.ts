import { afterEach, describe, expect, it } from "vitest";

import { ENV } from "../_core/env";
import { computeInterruptAck } from "./interruptAck";

const ORIGINAL_ENV = {
  interruptAckEnabled: ENV.interruptAckEnabled,
  interruptAckOnLowConfidenceOnly: ENV.interruptAckOnLowConfidenceOnly,
  voiceSttConfidenceLowThreshold: ENV.voiceSttConfidenceLowThreshold,
  voiceSttConfidenceHighThreshold: ENV.voiceSttConfidenceHighThreshold,
};

afterEach(() => {
  ENV.interruptAckEnabled = ORIGINAL_ENV.interruptAckEnabled;
  ENV.interruptAckOnLowConfidenceOnly = ORIGINAL_ENV.interruptAckOnLowConfidenceOnly;
  ENV.voiceSttConfidenceLowThreshold = ORIGINAL_ENV.voiceSttConfidenceLowThreshold;
  ENV.voiceSttConfidenceHighThreshold = ORIGINAL_ENV.voiceSttConfidenceHighThreshold;
});

describe("computeInterruptAck", () => {
  it("stays silent on a high-confidence barge-in", () => {
    ENV.interruptAckEnabled = true;
    ENV.interruptAckOnLowConfidenceOnly = false;
    ENV.voiceSttConfidenceLowThreshold = 0.82;
    ENV.voiceSttConfidenceHighThreshold = 0.92;

    expect(
      computeInterruptAck({
        speechMs: 1800,
        sttConfidence: 0.97,
        assistantResponseInProgress: true,
        minSpeechMs: 120,
      })
    ).toBe(false);
  });

  it("still allows an ack on low-confidence interruption when enabled", () => {
    ENV.interruptAckEnabled = true;
    ENV.interruptAckOnLowConfidenceOnly = false;
    ENV.voiceSttConfidenceLowThreshold = 0.82;
    ENV.voiceSttConfidenceHighThreshold = 0.92;

    expect(
      computeInterruptAck({
        speechMs: 1800,
        sttConfidence: 0.6,
        assistantResponseInProgress: true,
        minSpeechMs: 120,
      })
    ).toBe(true);
  });
});
