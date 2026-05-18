import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import { config } from "./config.mjs";
import { runPipeline } from "./agents.mjs";

export function createRunQueue({ repo, storage }) {
  if (!config.redis.url) {
    return {
      mode: "in_process",
      async enqueue(input) {
        const run = await runPipeline({ repo, storage, input });
        return { id: run.id, runId: run.id, mode: "in_process_completed", status: run.status };
      },
      async startWorker() {
        return { mode: "in_process", started: true };
      },
    };
  }

  const connection = new IORedis(config.redis.url, { maxRetriesPerRequest: null });
  const queue = new Queue("viralforge-runs", { connection });
  let worker = null;

  return {
    mode: "redis_bullmq",
    async enqueue(input) {
      const job = await queue.add("run-pipeline", input, {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 100,
      });
      return { id: job.id, mode: "redis_bullmq" };
    },
    async startWorker() {
      if (worker) return { mode: "redis_bullmq", started: true };
      worker = new Worker("viralforge-runs", async job => runPipeline({ repo, storage, input: job.data }), {
        connection,
        concurrency: Number(process.env.WORKER_CONCURRENCY || 2),
      });
      worker.on("failed", (job, error) => console.error("[ViralForge worker failed]", job?.id, error));
      return { mode: "redis_bullmq", started: true };
    },
  };
}
