import http from "node:http";
import crypto from "node:crypto";
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

function sendJson(res, body, status = 200, headers = {}) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  res.end(JSON.stringify(body, null, 2));
}

async function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const body = await fs.readFile(filePath);
  res.writeHead(200, { "content-type": types[ext] || "application/octet-stream" });
  res.end(body);
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(header.split(";").map(part => {
    const index = part.indexOf("=");
    if (index === -1) return null;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    return key ? [key, decodeURIComponent(value)] : null;
  }).filter(Boolean));
}

function sign(value) {
  return crypto.createHmac("sha256", config.auth.sessionSecret).update(value).digest("base64url");
}

function timingSafeEqualText(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function createSessionCookie({ email = config.auth.adminEmail, role = "owner" } = {}) {
  const payload = Buffer.from(JSON.stringify({
    role,
    email,
    issuedAt: Date.now(),
  })).toString("base64url");
  const value = `${payload}.${sign(payload)}`;
  const secure = config.app.env === "production" ? "; Secure" : "";
  return `${config.auth.cookieName}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}${secure}`;
}

function clearSessionCookie() {
  return `${config.auth.cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

function isLocalMediaUri(uri = "") {
  return uri && !uri.startsWith("http://") && !uri.startsWith("https://") && !uri.startsWith("s3://");
}

function mediaUrlForAsset(asset) {
  if (!asset?.uri) return "";
  return isLocalMediaUri(asset.uri) ? `/media/${asset.id}` : asset.uri;
}

function buildWorkspacePayload(evidence) {
  const postsByRun = new Map();
  for (const post of evidence.posts || []) {
    const list = postsByRun.get(post.run_id) || [];
    list.push(post);
    postsByRun.set(post.run_id, list);
  }

  const assetsByRun = new Map();
  for (const asset of evidence.assets || []) {
    const list = assetsByRun.get(asset.run_id) || [];
    list.push({ ...asset, mediaUrl: mediaUrlForAsset(asset) });
    assetsByRun.set(asset.run_id, list);
  }

  const metricsByRun = new Map();
  for (const metric of evidence.analytics || []) {
    const list = metricsByRun.get(metric.run_id) || [];
    list.push(metric);
    metricsByRun.set(metric.run_id, list);
  }

  const runs = (evidence.runs || []).map(run => {
    const assets = assetsByRun.get(run.id) || [];
    const posts = postsByRun.get(run.id) || [];
    const metrics = metricsByRun.get(run.id) || [];
    const video = assets.find(asset => asset.type === "video");
    const image = assets.find(asset => asset.type === "image");
    const audio = assets.find(asset => asset.type === "audio");
    const estimatedRevenue = metrics.reduce((sum, metric) => sum + Number(metric.revenue || 0), 0);
    const actualRevenue = metrics
      .filter(metric => metric.metadata?.source !== "local_recursive_learning_evaluation")
      .reduce((sum, metric) => sum + Number(metric.revenue || 0), 0);
    return {
      id: run.id,
      status: run.status,
      decision: run.decision,
      score: Number(run.score || 0),
      topic: run.input?.topic || run.output?.brief?.title || "Autonomous run",
      pillar: run.output?.brief?.pillar || run.input?.pillar || "curiosity_gap",
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      brief: run.output?.brief || null,
      script: run.output?.script || null,
      videoUrl: mediaUrlForAsset(video),
      imageUrl: mediaUrlForAsset(image),
      audioUrl: mediaUrlForAsset(audio),
      assets,
      posts,
      metrics,
      estimatedRevenue: Number(estimatedRevenue.toFixed(2)),
      actualRevenue: Number(actualRevenue.toFixed(2)),
      canApprove: run.status === "held",
      canRetry: ["held", "failed"].includes(run.status),
    };
  });

  const estimatedRevenue = runs.reduce((sum, run) => sum + run.estimatedRevenue, 0);
  const actualRevenue = runs.reduce((sum, run) => sum + run.actualRevenue, 0);
  return {
    product: "ViralForge",
    generatedAt: new Date().toISOString(),
    status: buildSystemStatus(evidence),
    counts: evidence.counts,
    trends: evidence.trends || [],
    runs,
    reviewQueue: runs.filter(run => ["held", "failed"].includes(run.status)),
    assets: (evidence.assets || []).map(asset => ({ ...asset, mediaUrl: mediaUrlForAsset(asset) })),
    posts: evidence.posts || [],
    analytics: evidence.analytics || [],
    contents: evidence.contents || [],
    policyEvents: evidence.policyEvents || [],
    jobLogs: evidence.jobLogs || [],
    learningSignals: evidence.learningSignals || [],
    revenue: {
      actual: Number(actualRevenue.toFixed(2)),
      learningEstimate: Number(estimatedRevenue.toFixed(2)),
      mode: providerStatus().publishMode === "live" ? "live_platform_metrics" : "dry_run_no_actual_platform_revenue",
    },
  };
}

function getSession(req) {
  if (!config.auth.sessionSecret) return null;
  const value = parseCookies(req)[config.auth.cookieName];
  if (!value || !value.includes(".")) return null;
  const [payload, signature] = value.split(".");
  if (!signature || !timingSafeEqualText(signature, sign(payload))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return ["admin", "owner", "operator"].includes(session?.role) ? session : null;
  } catch {
    return null;
  }
}

function requireSession(req, res) {
  const session = getSession(req);
  if (session) return session;
  sendJson(res, { ok: false, error: "Authentication required" }, 401);
  return null;
}

async function handleApi(req, res, url) {
  if (url.pathname === "/health") {
    sendJson(res, { ok: true, product: "ViralForge", time: new Date().toISOString() });
    return true;
  }

  if (url.pathname === "/api/auth/me" && req.method === "GET") {
    const session = getSession(req);
    sendJson(res, {
      authenticated: Boolean(session),
      user: session ? { role: session.role, email: session.email } : null,
      signupEnabled: config.auth.allowSignup,
    });
    return true;
  }

  if (url.pathname === "/api/auth/config" && req.method === "GET") {
    sendJson(res, {
      signupEnabled: config.auth.allowSignup,
      localTestCredentials: config.auth.exposeLocalCredentials
        ? { email: config.auth.adminEmail, password: config.auth.adminPassword }
        : null,
    });
    return true;
  }

  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    const body = await readJson(req);
    if (!config.auth.adminPassword || !config.auth.sessionSecret) {
      sendJson(res, { ok: false, error: "Operator auth is not configured. Set VIRALFORGE_ADMIN_PASSWORD and SESSION_SECRET." }, 503);
      return true;
    }
    const emailOk = !config.auth.adminEmail || String(body.email || "").toLowerCase() === config.auth.adminEmail.toLowerCase();
    const passwordOk = timingSafeEqualText(body.password || "", config.auth.adminPassword);
    if (!emailOk || !passwordOk) {
      sendJson(res, { ok: false, error: "Invalid operator password" }, 401);
      return true;
    }
    sendJson(res, { ok: true, user: { role: "owner", email: config.auth.adminEmail } }, 200, { "set-cookie": createSessionCookie({ email: config.auth.adminEmail }) });
    return true;
  }

  if (url.pathname === "/api/auth/signup" && req.method === "POST") {
    const body = await readJson(req);
    if (!config.auth.allowSignup) {
      sendJson(res, { ok: false, error: "Signup is not enabled on this deployment yet." }, 403);
      return true;
    }
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!email.includes("@") || password.length < 8) {
      sendJson(res, { ok: false, error: "Enter a valid email and a password with at least 8 characters." }, 400);
      return true;
    }
    sendJson(res, { ok: true, user: { role: "owner", email } }, 200, { "set-cookie": createSessionCookie({ email }) });
    return true;
  }

  if (url.pathname === "/api/auth/logout" && req.method === "POST") {
    sendJson(res, { ok: true }, 200, { "set-cookie": clearSessionCookie() });
    return true;
  }

  if (url.pathname.startsWith("/api/") && !requireSession(req, res)) return true;

  if (url.pathname === "/api/status") {
    const evidence = await repo.evidence();
    sendJson(res, buildSystemStatus(evidence));
    return true;
  }

  if (url.pathname === "/api/workspace" && req.method === "GET") {
    sendJson(res, buildWorkspacePayload(await repo.evidence()));
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

  const runDetailMatch = url.pathname.match(/^\/api\/runs\/([^/]+)$/);
  if (runDetailMatch && req.method === "GET") {
    const workspace = buildWorkspacePayload(await repo.evidence());
    const run = workspace.runs.find(item => item.id === runDetailMatch[1]);
    sendJson(res, run ? { ok: true, run } : { ok: false, error: "Run not found" }, run ? 200 : 404);
    return true;
  }

  if (url.pathname === "/api/runs/start" && req.method === "POST") {
    const body = await readJson(req);
    const job = await queue.enqueue(body);
    sendJson(res, { ok: true, job, queueMode: queue.mode });
    return true;
  }

  const approveMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/approve$/);
  if (approveMatch && req.method === "POST") {
    const run = await repo.getRun(approveMatch[1]);
    if (!run) {
      sendJson(res, { ok: false, error: "Run not found" }, 404);
      return true;
    }
    const content = (await repo.evidence()).contents.find(item => item.run_id === run.id);
    await repo.addPolicyEvent({
      run_id: run.id,
      content_id: content?.id || null,
      gate: "human_exception",
      status: "pass",
      severity: "info",
      message: "Operator approved this held run for release preparation.",
      metadata: { approvedAt: new Date().toISOString(), approvedBy: getSession(req)?.email || "operator" },
    });
    await repo.addPolicyEvent({
      run_id: run.id,
      content_id: content?.id || null,
      gate: "fact_risk",
      status: "pass",
      severity: "info",
      message: "Operator reviewed and cleared factual-risk hold for this run.",
      metadata: { approvedAt: new Date().toISOString(), approvedBy: getSession(req)?.email || "operator" },
    });
    const updated = await repo.updateRun(run.id, {
      status: "completed",
      decision: "Approved by operator; ready for connected channel release",
      output: { ...run.output, operatorApproval: { approvedAt: new Date().toISOString() } },
    });
    sendJson(res, { ok: true, run: updated });
    return true;
  }

  const retryMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/retry$/);
  if (retryMatch && req.method === "POST") {
    const run = await repo.getRun(retryMatch[1]);
    if (!run) {
      sendJson(res, { ok: false, error: "Run not found" }, 404);
      return true;
    }
    const job = await queue.enqueue({
      ...run.input,
      objective: `Corrective retry for ${run.id}: ${run.input?.objective || "regenerate package"}`,
      requestedAt: new Date().toISOString(),
    });
    sendJson(res, { ok: true, job, sourceRunId: run.id });
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

async function handleMedia(req, res, url) {
  const match = url.pathname.match(/^\/media\/([^/]+)$/);
  if (!match) return false;
  if (!requireSession(req, res)) return true;
  const evidence = await repo.evidence();
  const asset = evidence.assets.find(item => item.id === match[1]);
  if (!asset || !isLocalMediaUri(asset.uri)) {
    sendJson(res, { ok: false, error: "Local media asset not found" }, 404);
    return true;
  }
  await sendFile(res, asset.uri);
  return true;
}

async function handle(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (await handleApi(req, res, url)) return;
  if (await handleMedia(req, res, url)) return;

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
