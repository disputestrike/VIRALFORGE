import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_PUBLIC_DEMO_PHONE_NUMBER,
  DEFAULT_TENANT_VOICE_RUNTIME,
  getPublicDemoConfig,
  isPublicDemoPhoneNumber,
  getInterruptAckMinSpeechMs,
  getLatencyBudgetForMode,
  mergeTenantVoiceRuntimeProfile,
  resolveSessionConversationMode,
} from "./tenantVoiceRuntime";

describe("tenantVoiceRuntime", () => {
  const originalPublicDemoNumber = process.env.PUBLIC_DEMO_PHONE_NUMBER;

  beforeEach(() => {
    delete process.env.PUBLIC_DEMO_PHONE_NUMBER;
  });

  afterEach(() => {
    if (originalPublicDemoNumber === undefined) {
      delete process.env.PUBLIC_DEMO_PHONE_NUMBER;
    } else {
      process.env.PUBLIC_DEMO_PHONE_NUMBER = originalPublicDemoNumber;
    }
  });

  it("merges defaults and normalizes pronunciation hints", () => {
    const profile = mergeTenantVoiceRuntimeProfile({
      assistantName: "Jamie",
      pronunciationHintsText: "Tesla\nDaikin,Net metering",
      interruptionSensitivity: "patient",
    });
    expect(profile.assistantName).toBe("Jamie");
    expect(profile.pronunciationHints).toEqual([
      "Tesla",
      "Daikin",
      "Net metering",
    ]);
    expect(profile.fillerPolicy).toBe(DEFAULT_TENANT_VOICE_RUNTIME.fillerPolicy);
  });

  it("resolves session mode from call direction and demo brand", () => {
    expect(
      resolveSessionConversationMode({
        businessName: "ApexAI",
        callDirection: "inbound",
      })
    ).toBe("platform_demo");
    expect(
      resolveSessionConversationMode({
        businessName: "Acme Solar",
        callDirection: "outbound",
      })
    ).toBe("outbound_sales");
  });

  it("adjusts latency and interruption thresholds by behavior profile", () => {
    expect(
      getLatencyBudgetForMode({ mode: "outbound_sales", pace: "fast" })
    ).toBeLessThan(
      getLatencyBudgetForMode({ mode: "outbound_sales", pace: "relaxed" })
    );
    expect(getInterruptAckMinSpeechMs("aggressive")).toBeLessThan(
      getInterruptAckMinSpeechMs("patient")
    );
  });

  it("uses the ApexAI public demo number by default", () => {
    const config = getPublicDemoConfig();
    expect(config.phoneNumber).toBe(DEFAULT_PUBLIC_DEMO_PHONE_NUMBER);
    expect(isPublicDemoPhoneNumber("8336596005")).toBe(true);
    expect(isPublicDemoPhoneNumber("+18336596005")).toBe(true);
    expect(isPublicDemoPhoneNumber("+13055551212")).toBe(false);
  });
});
