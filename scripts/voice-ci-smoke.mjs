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
  const isWindows = process.platform === "win32";
  const command = isWindows ? (process.env.ComSpec || "cmd.exe") : cmd;
  const commandArgs = isWindows ? ["/d", "/s", "/c", cmd, ...args] : args;
  const r = spawnSync(command, commandArgs, { cwd: root, stdio: "inherit", shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

console.log("[voice-ci-smoke] vitest server/realtime …");
run("pnpm", ["exec", "vitest", "run", "server/realtime"]);
console.log("[voice-ci-smoke] voice QA reference transcript …");
run("pnpm", ["voice:qa", "--file", "scripts/fixtures/voice-qa-reference.txt", "--min-score", "88"]);
console.log("[voice-ci-smoke] build …");
run("pnpm", ["run", "build"]);
console.log("[voice-ci-smoke] OK");
