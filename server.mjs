import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config, connectorStatus, providerStatus } from "./src/config.mjs";
import { createRepository } from "./src/db.mjs";
import { createStorage } from "./src/storage.mjs";
import { createRunQueue } from "./src/queue.mjs";
import { runAutopilotTick } from "./src/agents.mjs";
import { forgeOpsReply } from "./src/chatAgent.mjs";
import { buildSystemStatus } from "./src/runtime/evidence.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
};

const repo = await createRepository();
const storage = await createStorage();
const queue = createRunQueue({ repo, storage });
if (config.app.runWorkerInWeb) await queue.startWorker();

if (config.app.autopilotEnabled) {
  setInterval(() => {
    runAutopilotTick({ repo, storage }).catch(error => console.error("[autopilot]", error));
  }, Number(process.env.AUTOPILOT_INTERVAL_MS || 60 * 60 * 1000));
  setTimeout(() => runAutopilotTick({ repo, storage }).catch(error => console.error("[autopilot bootstrap]", error)), 2500);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}

function sendJson(res, body, status = 200) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body, null, 2));
}

async function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const body = await fs.readFile(filePath);
  res.writeHead(200, { "content-type": types[ext] || "application/octet-stream" });
  res.end(body);
}

async function handleApi(req, res, url) {
  if (url.pathname === "/health") {
    sendJson(res, { ok: true, product: "ViralForge", time: new Date().toISOString() });
    return true;
  }

  if (url.pathname === "/api/status") {
    const evidence = await repo.evidence();
    sendJson(res, buildSystemStatus(evidence));
    return true;
  }

  if (url.pathname === "/api/evidence") {
    sendJson(res, await repo.evidence());
    return true;
  }

  if (url.pathname === "/api/connectors") {
    sendJson(res, { providers: providerStatus(), connectors: connectorStatus() });
    return true;
  }

  if (url.pathname === "/api/runs" && req.method === "GET") {
    sendJson(res, { runs: await repo.listRuns(50) });
    return true;
  }

  if (url.pathname === "/api/runs/start" && req.method === "POST") {
    const body = await readJson(req);
    const job = await queue.enqueue(body);
    sendJson(res, { ok: true, job, queueMode: queue.mode });
    return true;
  }

  if (url.pathname === "/api/autopilot/tick" && req.method === "POST") {
    const run = await runAutopilotTick({ repo, storage });
    sendJson(res, { ok: true, run });
    return true;
  }

  if (url.pathname === "/api/chat" && req.method === "POST") {
    const body = await readJson(req);
    sendJson(res, await forgeOpsReply({ repo, queue, message: body.message }));
    return true;
  }

  if (url.pathname === "/api/compliance" && req.method === "GET") {
    const evidence = await repo.evidence();
    sendJson(res, {
      qualityMatrix: buildSystemStatus(evidence).qualityMatrix,
      complianceTracker: buildSystemStatus(evidence).complianceTracker,
    });
    return true;
  }

  return false;
}

async function handle(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (await handleApi(req, res, url)) return;

  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path.normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, safePath);

  try {
    const stat = await fs.stat(filePath);
    if (stat.isFile()) {
      await sendFile(res, filePath);
      return;
    }
  } catch {}

  await sendFile(res, path.join(publicDir, "index.html"));
}

http.createServer((req, res) => {
  handle(req, res).catch(error => {
    console.error(error);
    sendJson(res, { ok: false, error: error.message, stack: config.app.env === "development" ? error.stack : undefined }, 500);
  });
}).listen(config.app.port, "0.0.0.0", () => {
  console.log(`ViralForge running on http://localhost:${config.app.port}/`);
  console.log(JSON.stringify({ providers: providerStatus(), connectors: connectorStatus(), queueMode: queue.mode }, null, 2));
});
