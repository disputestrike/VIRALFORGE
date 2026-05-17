import { describe, expect, it } from "vitest";
import { createOmniPulseSnapshot, runOmniPulseEngine } from "./engine";

describe("OmniPulse one-engine orchestration", () => {
  it("builds a complete governed network-launch run", () => {
    const run = runOmniPulseEngine({
      topic: "Launch PulseWorld global polls and FactQuest curiosity shorts",
      objective: "Create platform packages with PolicyOS and Six Sigma controls",
      outputProfile: "network-launch",
      platforms: ["YouTube", "TikTok", "Pinterest"],
      languages: ["en-US", "es-MX"],
      targetMinutes: 12,
    });

    expect(run.modules.map((module) => module.code)).toContain("policy_os");
    expect(run.modules.map((module) => module.code)).toContain("quota_broker");
    expect(run.modules.map((module) => module.code)).toContain("idempotency_ledger");
    expect(run.channelPlan.length).toBeGreaterThanOrEqual(5);
    expect(run.contentItems.length).toBeGreaterThan(0);
    expect(run.platformPackages.length).toBe(run.contentItems.length * run.input.platforms.length);
    expect(run.qaGates.map((gate) => gate.name)).toContain("Control Gate");
    expect(run.financialModel.payPal.required).toBe(true);
  });

  it("routes high-stakes topics into the human exception queue", () => {
    const run = runOmniPulseEngine({
      topic: "Medical finance election crisis documentary",
      objective: "Generate a high-risk deep dive with claims",
      outputProfile: "documentary-deep-dive",
      platforms: ["YouTube", "TikTok", "X"],
      targetMinutes: 45,
      riskTolerance: "strict",
    });

    expect(run.documentary.enabled).toBe(true);
    expect(run.documentary.chapters.length).toBeGreaterThanOrEqual(6);
    expect(run.policyEvents.some((event) => event.ruleCode === "HIGH_STAKES_REVIEW")).toBe(true);
    expect(run.operatingDecision.requiresHumanExceptionQueue).toBe(true);
    expect(run.operatingDecision.scaleDecision).not.toBe("scale");
  });

  it("keeps the snapshot SaaS and connector ready", () => {
    const snapshot = createOmniPulseSnapshot();

    expect(snapshot.brand.palette.mainMagenta).toBe("#CB19AF");
    expect(snapshot.connectors.map((connector) => connector.platform)).toEqual(
      expect.arrayContaining(["YouTube", "TikTok", "Telegram"]),
    );
    expect(snapshot.providers.some((provider) => provider.primary === "PayPal")).toBe(true);
    expect(snapshot.sixSigmaCtqs).toEqual(expect.arrayContaining(["rights completeness", "PayPal webhook accuracy"]));
  });
});
