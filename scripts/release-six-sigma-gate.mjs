#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const checks = [
  {
    id: "CTQ-ENG-TS",
    name: "TypeScript static quality gate",
    command: "pnpm",
    args: ["run", "check"],
  },
  {
    id: "CTQ-VOICE-VAQS",
    name: "Voice quality spec compliance gate",
    command: "pnpm",
    args: ["run", "test:vaqs"],
  },
  {
    id: "CTQ-BILLING",
    name: "Billing policy guard regression tests",
    command: "pnpm",
    args: ["exec", "vitest", "run", "server/_core/services/billingPolicy.test.ts"],
  },
  {
    id: "CTQ-QUEUE",
    name: "Queue observability regression tests",
    command: "pnpm",
    args: ["exec", "vitest", "run", "server/_core/services/queue.test.ts"],
  },
  {
    id: "CTQ-COMPLIANCE",
    name: "Outbound compliance scheduling tests",
    command: "pnpm",
    args: ["exec", "vitest", "run", "server/realtime/outboundCompliance.test.ts"],
  },
  {
    id: "CTQ-BUILD",
    name: "Production build gate",
    command: "pnpm",
    args: ["build"],
  },
];

function runCheck(check) {
  const startedAt = new Date();
  const result = spawnSync(check.command, check.args, {
    shell: true,
    encoding: "utf8",
    timeout: 25 * 60 * 1000,
    maxBuffer: 1024 * 1024 * 10,
  });
  const endedAt = new Date();
  const durationMs = endedAt.getTime() - startedAt.getTime();
  const stdout = String(result.stdout ?? "");
  const stderr = String(result.stderr ?? "");
  const output = `${stdout}\n${stderr}\n${result.error ? String(result.error.message ?? result.error) : ""}`.trim();
  return {
    ...check,
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
    durationMs,
    exitCode: result.status ?? 1,
    passed: (result.status ?? 1) === 0,
    outputSample: output.slice(0, 1200),
  };
}

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

function makeReport(results) {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  const opportunities = total;
  const defects = failed;
  const firstPassYieldPct = pct(passed, total);
  const defectRatePct = pct(defects, opportunities);
  const dpmo = Math.round((defects / opportunities) * 1_000_000);
  const sigmaProxy = firstPassYieldPct;
  const releaseDecision = failed === 0 ? "APPROVED" : "BLOCKED";
  const now = new Date().toISOString();

  const rows = results
    .map(
      (r) =>
        `| ${r.id} | ${r.name} | ${r.passed ? "PASS" : "FAIL"} | ${r.exitCode} | ${(r.durationMs / 1000).toFixed(1)}s |`
    )
    .join("\n");

  const failures = results
    .filter((r) => !r.passed)
    .map((r) => `### ${r.id} — ${r.name}\n\n\`\`\`\n${r.outputSample || "No output captured."}\n\`\`\``)
    .join("\n\n");

  return {
    releaseDecision,
    markdown: `# Wave Completion Report (Six Sigma Gate)\n\n- Generated: ${now}\n- Release Decision: **${releaseDecision}**\n- Scope: Wave completion verification gates\n\n## CTQ Gate Results\n\n| ID | Gate | Result | Exit | Duration |\n| --- | --- | --- | --- | --- |\n${rows}\n\n## Six Sigma Summary (Engineering Proxy)\n\n- Opportunities: ${opportunities}\n- Defects: ${defects}\n- First-pass yield: ${firstPassYieldPct}%\n- Defect rate: ${defectRatePct}%\n- DPMO: ${Number.isFinite(dpmo) ? dpmo : 0}\n- Sigma proxy (per internal spec guidance): ${sigmaProxy}%\n\n## Control Plan\n\n1. Keep this script in CI for every merge to main.\n2. Treat any failed gate as a release blocker.\n3. Run corrective action and re-run full gate before approval.\n\n${failures ? `## Failure Evidence\n\n${failures}\n` : "## Failure Evidence\n\nNo failed gates.\n"}`,
  };
}

const results = checks.map(runCheck);
const report = makeReport(results);

const outPath = resolve(process.cwd(), "docs", "internal", "WAVE_COMPLETION_REPORT.md");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, report.markdown, "utf8");

console.log(`[SixSigmaGate] Report written: ${outPath}`);
console.log(`[SixSigmaGate] Decision: ${report.releaseDecision}`);

if (report.releaseDecision !== "APPROVED") {
  process.exit(1);
}
