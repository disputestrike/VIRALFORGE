import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR = path.join(os.tmpdir(), `viralforge-test-${Date.now()}`);
process.env.DATABASE_URL = "";
process.env.REDIS_URL = "";
process.env.PUBLISH_MODE = "dry_run";

const { createRepository } = await import("../src/db.mjs");
const { createStorage } = await import("../src/storage.mjs");
const { runPipeline } = await import("../src/agents.mjs");
const { buildSystemStatus } = await import("../src/runtime/evidence.mjs");
const { forgeOpsReply } = await import("../src/chatAgent.mjs");

test("runs the complete ViralForge agent pipeline and renders an MP4", async () => {
  const repo = await createRepository();
  const storage = await createStorage();
  const run = await runPipeline({
    repo,
    storage,
    input: {
      topic: "Why AI video factories are replacing media teams",
      objective: "Create a governed viral proof video.",
      budgetUsd: 120,
      risk: "standard",
    },
  });
  const evidence = await repo.evidence();
  const video = evidence.assets.find(asset => asset.type === "video");

  assert.equal(run.status, "completed");
  assert.ok(video, "video asset should exist");
  assert.ok((await fs.stat(video.uri)).size > 1000, "rendered MP4 should be non-empty");
  assert.ok(evidence.policyEvents.length >= 10);
  assert.ok(evidence.posts.length >= 8);
  assert.ok(evidence.learningSignals.length >= 1);
  await repo.close();
});

test("routes strict risk content into human review hold", async () => {
  const repo = await createRepository();
  const storage = await createStorage();
  const run = await runPipeline({
    repo,
    storage,
    input: {
      topic: "Medical finance election advice",
      objective: "Test human exception gate.",
      budgetUsd: 120,
      risk: "strict",
    },
  });
  assert.equal(run.status, "held");
  assert.equal(run.decision, "Hold for human approval");
  await repo.close();
});

test("quality matrix and ForgeOps agent expose operational proof", async () => {
  const repo = await createRepository();
  const evidence = await repo.evidence();
  const status = buildSystemStatus(evidence);
  const reply = await forgeOpsReply({
    repo,
    queue: { enqueue: async () => ({ id: "test-job" }) },
    message: "what api keys are missing",
  });

  assert.ok(Array.isArray(status.qualityMatrix));
  assert.equal(reply.action, "connector_status");
  assert.ok(reply.providers);
  await repo.close();
});
