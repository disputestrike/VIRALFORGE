import { createRepository } from "../src/db.mjs";
import { buildSystemStatus } from "../src/runtime/evidence.mjs";

const repo = await createRepository();
const evidence = await repo.evidence();
const status = buildSystemStatus(evidence);
await repo.close();

const failed = status.qualityMatrix.filter(gate => gate.status === "fail");
console.log(JSON.stringify(status, null, 2));
if (failed.length) {
  console.error(`Quality gate failed: ${failed.map(gate => gate.gate).join(", ")}`);
  process.exit(1);
}
