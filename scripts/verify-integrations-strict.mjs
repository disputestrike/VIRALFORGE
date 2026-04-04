#!/usr/bin/env node
/**
 * Same as verify-integrations.mjs but VERIFY_STRICT=1 (exit 1 if any env group incomplete).
 * Use locally with Railway .env copied in, or wire CI secrets before enabling a strict job.
 */
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const r = spawnSync(process.execPath, [resolve(dir, "verify-integrations.mjs")], {
  stdio: "inherit",
  env: { ...process.env, VERIFY_STRICT: "1" },
});
process.exit(r.status === null ? 1 : r.status);
