#!/usr/bin/env node
/**
 * Phase 9 smoke: realtime voice unit tests + build (not a load test).
 * Usage: node scripts/voice-ci-smoke.mjs
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

console.log("[voice-ci-smoke] vitest server/realtime …");
run("pnpm", ["exec", "vitest", "run", "server/realtime"]);
console.log("[voice-ci-smoke] build …");
run("pnpm", ["run", "build"]);
console.log("[voice-ci-smoke] OK");
