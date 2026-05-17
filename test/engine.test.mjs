import test from "node:test";
import assert from "node:assert/strict";
import { createRun, createSnapshot } from "../src/engine.mjs";

test("creates a complete ViralForge engine run", () => {
  const run = createRun({ topic: "AI documentary network", lengthMinutes: 45, budgetUsd: 200 });

  assert.equal(run.brand.name, "ViralForge");
  assert.ok(run.modules.find(module => module.name === "PolicyOS"));
  assert.ok(run.modules.find(module => module.name === "DocumentaryEngine"));
  assert.ok(run.qa.length >= 10);
  assert.ok(run.packages.find(pkg => pkg.platform === "YouTube"));
  assert.equal(run.saas.paypalReady, "sandbox-gated");
});

test("routes high-risk topics to human review", () => {
  const run = createRun({ topic: "Legal and finance advice for creators", risk: "strict" });

  assert.equal(run.policy.mode, "human-review");
  assert.equal(run.decision, "Hold for human approval");
});

test("snapshot is standalone ViralForge", () => {
  const snapshot = createSnapshot();

  assert.equal(snapshot.brand.name, "ViralForge");
  assert.equal(snapshot.saas.tenantReady, true);
  assert.ok(snapshot.packages.length >= 8);
});
