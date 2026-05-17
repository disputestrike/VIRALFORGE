import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRun, createSnapshot } from "./src/engine.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || 3001);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

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

async function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const body = await fs.readFile(filePath);
  res.writeHead(200, { "content-type": types[ext] || "application/octet-stream" });
  res.end(body);
}

async function handle(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/status") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, product: "ViralForge", snapshot: createSnapshot() }));
    return;
  }

  if (url.pathname === "/api/run") {
    const body = req.method === "POST" ? await readJson(req) : {};
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(createRun(body)));
    return;
  }

  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = path.normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, safePath);

  try {
    const stat = await fs.stat(filePath);
    if (stat.isFile()) {
      await sendFile(res, filePath);
      return;
    }
  } catch {
    // fall through to SPA shell
  }

  await sendFile(res, path.join(publicDir, "index.html"));
}

http.createServer((req, res) => {
  handle(req, res).catch(error => {
    console.error(error);
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end("ViralForge server error");
  });
}).listen(port, "0.0.0.0", () => {
  console.log(`ViralForge running on http://localhost:${port}/`);
});
