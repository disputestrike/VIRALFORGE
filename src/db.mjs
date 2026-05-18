import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { Pool } from "pg";
import { config } from "./config.mjs";

const emptyState = {
  runs: [],
  trends: [],
  contents: [],
  assets: [],
  policy_events: [],
  posts: [],
  analytics: [],
  learning_signals: [],
  job_logs: [],
};

export function id(prefix) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
}

function now() {
  return new Date().toISOString();
}

async function readSchema() {
  return fs.readFile(path.join(config.app.rootDir, "src", "schema.sql"), "utf8");
}

class PgRepository {
  constructor() {
    this.kind = "postgres";
    this.pool = new Pool({
      connectionString: config.db.url,
      ssl: config.db.url.includes("railway") || config.app.env === "production" ? { rejectUnauthorized: false } : undefined,
    });
  }

  async init() {
    await this.pool.query(await readSchema());
  }

  async close() {
    await this.pool.end();
  }

  async createRun(input) {
    const run = {
      id: id("run"),
      status: "created",
      input,
      decision: null,
      score: 0,
      output: {},
      created_at: now(),
      updated_at: now(),
    };
    await this.pool.query(
      "INSERT INTO runs (id,status,input,decision,score,output,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [run.id, run.status, run.input, run.decision, run.score, run.output, run.created_at, run.updated_at],
    );
    return run;
  }

  async updateRun(runId, patch) {
    const current = await this.getRun(runId);
    const next = { ...current, ...patch, updated_at: now() };
    await this.pool.query(
      "UPDATE runs SET status=$2,input=$3,decision=$4,score=$5,output=$6,updated_at=$7 WHERE id=$1",
      [runId, next.status, next.input, next.decision, next.score, next.output, next.updated_at],
    );
    return next;
  }

  async getRun(runId) {
    const result = await this.pool.query("SELECT * FROM runs WHERE id=$1", [runId]);
    return result.rows[0] || null;
  }

  async listRuns(limit = 20) {
    const result = await this.pool.query("SELECT * FROM runs ORDER BY created_at DESC LIMIT $1", [limit]);
    return result.rows;
  }

  async addTrend(trend) {
    const row = { id: id("trend"), region: "global", created_at: now(), ...trend };
    await this.pool.query(
      "INSERT INTO trends (id,source,topic,pillar,region,score,metadata,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [row.id, row.source, row.topic, row.pillar, row.region, row.score, row.metadata || {}, row.created_at],
    );
    return row;
  }

  async listTrends(limit = 50) {
    const result = await this.pool.query("SELECT * FROM trends ORDER BY score DESC, created_at DESC LIMIT $1", [limit]);
    return result.rows;
  }

  async addContent(content) {
    const row = { id: id("content"), status: "draft", brief: {}, script: {}, metadata: {}, created_at: now(), updated_at: now(), ...content };
    await this.pool.query(
      "INSERT INTO contents (id,run_id,status,brief,script,metadata,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [row.id, row.run_id, row.status, row.brief, row.script, row.metadata, row.created_at, row.updated_at],
    );
    return row;
  }

  async updateContent(contentId, patch) {
    const current = (await this.pool.query("SELECT * FROM contents WHERE id=$1", [contentId])).rows[0];
    const next = { ...current, ...patch, updated_at: now() };
    await this.pool.query(
      "UPDATE contents SET status=$2,brief=$3,script=$4,metadata=$5,updated_at=$6 WHERE id=$1",
      [contentId, next.status, next.brief, next.script, next.metadata, next.updated_at],
    );
    return next;
  }

  async addAsset(asset) {
    const row = { id: id("asset"), hash: null, metadata: {}, created_at: now(), ...asset };
    await this.pool.query(
      "INSERT INTO assets (id,run_id,content_id,type,uri,source,hash,metadata,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [row.id, row.run_id, row.content_id || null, row.type, row.uri, row.source, row.hash, row.metadata, row.created_at],
    );
    return row;
  }

  async addPolicyEvent(event) {
    const row = { id: id("policy"), severity: "info", metadata: {}, created_at: now(), ...event };
    await this.pool.query(
      "INSERT INTO policy_events (id,run_id,content_id,gate,status,severity,message,metadata,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [row.id, row.run_id, row.content_id || null, row.gate, row.status, row.severity, row.message, row.metadata, row.created_at],
    );
    return row;
  }

  async addPost(post) {
    const row = { id: id("post"), platform_post_id: null, url: null, metadata: {}, created_at: now(), updated_at: now(), ...post };
    await this.pool.query(
      "INSERT INTO posts (id,run_id,content_id,platform,status,platform_post_id,url,metadata,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [row.id, row.run_id, row.content_id || null, row.platform, row.status, row.platform_post_id, row.url, row.metadata, row.created_at, row.updated_at],
    );
    return row;
  }

  async addAnalytic(metric) {
    const row = { id: id("metric"), views: 0, likes: 0, comments: 0, shares: 0, saves: 0, revenue: 0, metadata: {}, measured_at: now(), ...metric };
    await this.pool.query(
      "INSERT INTO analytics (id,post_id,run_id,platform,views,likes,comments,shares,saves,revenue,metadata,measured_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
      [row.id, row.post_id || null, row.run_id, row.platform, row.views, row.likes, row.comments, row.shares, row.saves, row.revenue, row.metadata, row.measured_at],
    );
    return row;
  }

  async upsertLearning(signal) {
    const row = { id: id("learn"), weight: 1, metadata: {}, updated_at: now(), ...signal };
    await this.pool.query(
      `INSERT INTO learning_signals (id,key,value,weight,metadata,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, weight=EXCLUDED.weight, metadata=EXCLUDED.metadata, updated_at=EXCLUDED.updated_at`,
      [row.id, row.key, row.value, row.weight, row.metadata, row.updated_at],
    );
    return row;
  }

  async addJobLog(log) {
    const row = { id: id("log"), run_id: null, metadata: {}, created_at: now(), ...log };
    await this.pool.query(
      "INSERT INTO job_logs (id,run_id,agent,status,message,metadata,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [row.id, row.run_id, row.agent, row.status, row.message, row.metadata, row.created_at],
    );
    return row;
  }

  async evidence() {
    const [runs, trends, contents, assets, policies, posts, analytics, learning, logs] = await Promise.all([
      this.pool.query("SELECT * FROM runs ORDER BY created_at DESC LIMIT 20"),
      this.pool.query("SELECT * FROM trends ORDER BY created_at DESC LIMIT 50"),
      this.pool.query("SELECT * FROM contents ORDER BY created_at DESC LIMIT 20"),
      this.pool.query("SELECT * FROM assets ORDER BY created_at DESC LIMIT 50"),
      this.pool.query("SELECT * FROM policy_events ORDER BY created_at DESC LIMIT 100"),
      this.pool.query("SELECT * FROM posts ORDER BY created_at DESC LIMIT 50"),
      this.pool.query("SELECT * FROM analytics ORDER BY measured_at DESC LIMIT 50"),
      this.pool.query("SELECT * FROM learning_signals ORDER BY updated_at DESC LIMIT 50"),
      this.pool.query("SELECT * FROM job_logs ORDER BY created_at DESC LIMIT 100"),
    ]);
    return {
      repository: this.kind,
      counts: {
        runs: Number((await this.pool.query("SELECT COUNT(*) FROM runs")).rows[0].count),
        trends: Number((await this.pool.query("SELECT COUNT(*) FROM trends")).rows[0].count),
        assets: Number((await this.pool.query("SELECT COUNT(*) FROM assets")).rows[0].count),
        posts: Number((await this.pool.query("SELECT COUNT(*) FROM posts")).rows[0].count),
        learningSignals: Number((await this.pool.query("SELECT COUNT(*) FROM learning_signals")).rows[0].count),
      },
      runs: runs.rows,
      trends: trends.rows,
      contents: contents.rows,
      assets: assets.rows,
      policyEvents: policies.rows,
      posts: posts.rows,
      analytics: analytics.rows,
      learningSignals: learning.rows,
      jobLogs: logs.rows,
    };
  }
}

class FileRepository {
  constructor() {
    this.kind = "local_file";
    this.file = path.join(config.app.dataDir, "viralforge.json");
    this.state = structuredClone(emptyState);
  }

  async init() {
    await fs.mkdir(config.app.dataDir, { recursive: true });
    try {
      this.state = JSON.parse(await fs.readFile(this.file, "utf8"));
      for (const key of Object.keys(emptyState)) this.state[key] ||= [];
    } catch {
      await this.save();
    }
  }

  async save() {
    await fs.writeFile(this.file, JSON.stringify(this.state, null, 2));
  }

  async close() {}

  async createRun(input) {
    const row = { id: id("run"), status: "created", input, decision: null, score: 0, output: {}, created_at: now(), updated_at: now() };
    this.state.runs.push(row);
    await this.save();
    return row;
  }

  async updateRun(runId, patch) {
    const row = this.state.runs.find(item => item.id === runId);
    Object.assign(row, patch, { updated_at: now() });
    await this.save();
    return row;
  }

  async getRun(runId) {
    return this.state.runs.find(item => item.id === runId) || null;
  }

  async listRuns(limit = 20) {
    return [...this.state.runs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
  }

  async addTrend(trend) {
    const row = { id: id("trend"), region: "global", created_at: now(), ...trend };
    this.state.trends.push(row);
    await this.save();
    return row;
  }

  async listTrends(limit = 50) {
    return [...this.state.trends].sort((a, b) => b.score - a.score || b.created_at.localeCompare(a.created_at)).slice(0, limit);
  }

  async addContent(content) {
    const row = { id: id("content"), status: "draft", brief: {}, script: {}, metadata: {}, created_at: now(), updated_at: now(), ...content };
    this.state.contents.push(row);
    await this.save();
    return row;
  }

  async updateContent(contentId, patch) {
    const row = this.state.contents.find(item => item.id === contentId);
    Object.assign(row, patch, { updated_at: now() });
    await this.save();
    return row;
  }

  async addAsset(asset) {
    const row = { id: id("asset"), hash: null, metadata: {}, created_at: now(), ...asset };
    this.state.assets.push(row);
    await this.save();
    return row;
  }

  async addPolicyEvent(event) {
    const row = { id: id("policy"), severity: "info", metadata: {}, created_at: now(), ...event };
    this.state.policy_events.push(row);
    await this.save();
    return row;
  }

  async addPost(post) {
    const row = { id: id("post"), platform_post_id: null, url: null, metadata: {}, created_at: now(), updated_at: now(), ...post };
    this.state.posts.push(row);
    await this.save();
    return row;
  }

  async addAnalytic(metric) {
    const row = { id: id("metric"), views: 0, likes: 0, comments: 0, shares: 0, saves: 0, revenue: 0, metadata: {}, measured_at: now(), ...metric };
    this.state.analytics.push(row);
    await this.save();
    return row;
  }

  async upsertLearning(signal) {
    const existing = this.state.learning_signals.find(item => item.key === signal.key);
    const row = { id: id("learn"), weight: 1, metadata: {}, updated_at: now(), ...signal };
    if (existing) Object.assign(existing, row, { id: existing.id });
    else this.state.learning_signals.push(row);
    await this.save();
    return existing || row;
  }

  async addJobLog(log) {
    const row = { id: id("log"), run_id: null, metadata: {}, created_at: now(), ...log };
    this.state.job_logs.push(row);
    await this.save();
    return row;
  }

  async evidence() {
    return {
      repository: this.kind,
      counts: {
        runs: this.state.runs.length,
        trends: this.state.trends.length,
        assets: this.state.assets.length,
        posts: this.state.posts.length,
        learningSignals: this.state.learning_signals.length,
      },
      runs: [...this.state.runs].reverse().slice(0, 20),
      trends: [...this.state.trends].reverse().slice(0, 50),
      contents: [...this.state.contents].reverse().slice(0, 20),
      assets: [...this.state.assets].reverse().slice(0, 50),
      policyEvents: [...this.state.policy_events].reverse().slice(0, 100),
      posts: [...this.state.posts].reverse().slice(0, 50),
      analytics: [...this.state.analytics].reverse().slice(0, 50),
      learningSignals: [...this.state.learning_signals].reverse().slice(0, 50),
      jobLogs: [...this.state.job_logs].reverse().slice(0, 100),
    };
  }
}

export async function createRepository() {
  if (config.db.url) {
    const repo = new PgRepository();
    try {
      await repo.init();
      return repo;
    } catch (error) {
      if (config.app.env === "production") throw error;
      console.warn(`[ViralForge] DATABASE_URL failed locally; using file fallback. ${error.message}`);
    }
  }
  const repo = new FileRepository();
  await repo.init();
  return repo;
}
