import { config } from "./src/config.mjs";
import { createRepository } from "./src/db.mjs";
import { createStorage } from "./src/storage.mjs";
import { createRunQueue } from "./src/queue.mjs";
import { runAutopilotTick } from "./src/agents.mjs";

const repo = await createRepository();
const storage = await createStorage();
const queue = createRunQueue({ repo, storage });
await queue.startWorker();

if (config.app.autopilotEnabled) {
  await runAutopilotTick({ repo, storage }).catch(error => console.error("[autopilot bootstrap]", error));
  setInterval(() => {
    runAutopilotTick({ repo, storage }).catch(error => console.error("[autopilot]", error));
  }, Number(process.env.AUTOPILOT_INTERVAL_MS || 60 * 60 * 1000));
}

console.log(`ViralForge worker online. mode=${queue.mode} autopilot=${config.app.autopilotEnabled}`);
