/**
 * Knowledge base: fetch URL → text → chunk → OpenAI embeddings → MySQL chunks.
 * Search: embedding cosine similarity, or keyword overlap when OPENAI_API_KEY is unset.
 */
import * as cheerio from "cheerio";
import { createHash } from "crypto";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getDb } from "../../db";
import {
  knowledgeBases,
  knowledgeBaseSources,
  knowledgeBaseChunks,
} from "../../../drizzle/schema";
import { ENV } from "../env";

const CHUNK_SIZE = 900;
const CHUNK_OVERLAP = 120;
const MAX_FETCH_BYTES = 2_500_000;
const FETCH_TIMEOUT_MS = 25_000;
const EMBED_MODEL = "text-embedding-3-small";

export function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < t.length) {
    const end = Math.min(t.length, i + size);
    let slice = t.slice(i, end);
    if (end < t.length) {
      const lastBreak = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf(" "));
      if (lastBreak > size * 0.4) slice = slice.slice(0, lastBreak + 1);
    }
    chunks.push(slice.trim());
    if (end >= t.length) break;
    i += Math.max(1, slice.length - overlap);
  }
  return chunks.filter((c) => c.length > 40);
}

function parseEmbedding(raw: string | null): number[] | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as unknown;
    if (Array.isArray(j) && j.every((x) => typeof x === "number")) return j as number[];
  } catch {}
  return null;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || !a.length) return 0;
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}

async function fetchWebsiteText(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ApexAI-KB/1.0; +https://apexai.app) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_FETCH_BYTES) throw new Error("Page too large");
    const html = Buffer.from(buf).toString("utf-8");
    const $ = cheerio.load(html);
    $("script, style, nav, footer, noscript, iframe").remove();
    const text = $("body").text() || $.root().text();
    return text.replace(/\s+/g, " ").trim();
  } finally {
    clearTimeout(t);
  }
}

async function embedTexts(texts: string[]): Promise<(number[] | null)[]> {
  const key = ENV.openAiApiKey?.trim();
  if (!key || texts.length === 0) return texts.map(() => null);

  const OpenAI = (await import("openai")).default;
  const client = new OpenAI({ apiKey: key });
  const out: (number[] | null)[] = [];
  const batch = 16;
  try {
    for (let i = 0; i < texts.length; i += batch) {
      const slice = texts.slice(i, i + batch);
      const resp = await client.embeddings.create({
        model: EMBED_MODEL,
        input: slice,
      });
      for (const item of resp.data) {
        const v = item.embedding;
        out.push(Array.isArray(v) ? (v as number[]) : null);
      }
    }
  } catch (e) {
    console.warn("[KB] OpenAI embeddings failed — chunks stored without vectors; keyword search still works.", e);
    return texts.map(() => null);
  }
  return out;
}

async function refreshKbStatus(knowledgeBaseId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const sources = await db
    .select()
    .from(knowledgeBaseSources)
    .where(eq(knowledgeBaseSources.knowledgeBaseId, knowledgeBaseId));

  const pending = sources.filter((s) => s.status === "pending" || s.status === "processing").length;
  const failed = sources.filter((s) => s.status === "failed").length;
  const completed = sources.filter((s) => s.status === "completed").length;
  const total = sources.length || 1;
  const progress = Math.round(((completed + failed) / total) * 100);

  let status: "training" | "active" | "failed" = "training";
  if (pending === 0) {
    if (completed === 0 && failed > 0) status = "failed";
    else status = "active";
  }

  const [chunkRow] = await db
    .select({ c: sql<number>`count(*)` })
    .from(knowledgeBaseChunks)
    .where(eq(knowledgeBaseChunks.knowledgeBaseId, knowledgeBaseId));

  const chunkCount = Number(chunkRow?.c ?? 0);
  if (pending === 0 && chunkCount === 0 && failed > 0) status = "failed";

  await db
    .update(knowledgeBases)
    .set({
      status,
      trainingProgress: Math.min(100, progress),
      lastTrainedAt: pending === 0 && chunkCount > 0 ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(knowledgeBases.id, knowledgeBaseId));
}

/** Background: crawl + chunk + embed + persist. */
export async function ingestKnowledgeBaseSource(sourceId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const [src] = await db
    .select()
    .from(knowledgeBaseSources)
    .where(eq(knowledgeBaseSources.id, sourceId))
    .limit(1);
  if (!src) return;

  const [kb] = await db
    .select()
    .from(knowledgeBases)
    .where(eq(knowledgeBases.id, src.knowledgeBaseId))
    .limit(1);
  if (!kb) return;

  await db
    .update(knowledgeBaseSources)
    .set({ status: "processing", errorMessage: null, updatedAt: new Date() })
    .where(eq(knowledgeBaseSources.id, sourceId));

  try {
    let text: string;
    if (src.sourceType === "website" && src.sourceUrl) {
      text = await fetchWebsiteText(src.sourceUrl);
    } else {
      throw new Error(`Unsupported source type for auto-ingest: ${src.sourceType}`);
    }

    if (!text || text.length < 80) {
      throw new Error("Not enough text extracted from page");
    }

    const hash = createHash("sha256").update(text).digest("hex");
    await db
      .update(knowledgeBaseSources)
      .set({ contentHash: hash, updatedAt: new Date() })
      .where(eq(knowledgeBaseSources.id, sourceId));

    await db.delete(knowledgeBaseChunks).where(eq(knowledgeBaseChunks.sourceId, sourceId));

    const parts = chunkText(text);
    if (!parts.length) throw new Error("Chunking produced no segments");

    const embeddings = await embedTexts(parts);

    for (let i = 0; i < parts.length; i++) {
      const emb = embeddings[i];
      await db.insert(knowledgeBaseChunks).values({
        knowledgeBaseId: src.knowledgeBaseId,
        sourceId: src.id,
        content: parts[i]!,
        embedding: emb ? JSON.stringify(emb) : null,
        metadata: JSON.stringify({ index: i, url: src.sourceUrl }),
      });
    }

    await db
      .update(knowledgeBaseSources)
      .set({ status: "completed", errorMessage: null, updatedAt: new Date() })
      .where(eq(knowledgeBaseSources.id, sourceId));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db
      .update(knowledgeBaseSources)
      .set({ status: "failed", errorMessage: msg.slice(0, 2000), updatedAt: new Date() })
      .where(eq(knowledgeBaseSources.id, sourceId));
  }

  await refreshKbStatus(src.knowledgeBaseId);
}

export function scheduleIngestKnowledgeBaseSource(sourceId: number): void {
  setImmediate(() => {
    ingestKnowledgeBaseSource(sourceId).catch((err) =>
      console.error("[KB] ingest failed", sourceId, err)
    );
  });
}

/** Top-K chunks for tenant + query (semantic if embeddings exist). */
export async function searchKnowledgeChunks(
  userId: number,
  query: string,
  topK = 6,
  options?: { knowledgeBaseId?: number }
): Promise<{ content: string; score: number }[]> {
  const db = await getDb();
  if (!db) return [];

  const whereKb =
    options?.knowledgeBaseId != null
      ? and(eq(knowledgeBases.userId, userId), eq(knowledgeBases.id, options.knowledgeBaseId))
      : and(eq(knowledgeBases.userId, userId), eq(knowledgeBases.status, "active"));

  const kbs = await db.select().from(knowledgeBases).where(whereKb);

  if (!kbs.length) return [];

  const kbIds = kbs.map((k) => k.id);
  const chunksRows = await db
    .select()
    .from(knowledgeBaseChunks)
    .where(inArray(knowledgeBaseChunks.knowledgeBaseId, kbIds));

  if (!chunksRows.length) return [];

  const q = query.trim().slice(0, 2000);
  const queryEmb = (await embedTexts([q]))[0];

  if (queryEmb) {
    const scored = chunksRows
      .map((row) => {
        const emb = parseEmbedding(row.embedding);
        const score = emb ? cosineSimilarity(queryEmb, emb) : keywordScore(q, row.content);
        return { content: row.content, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    return scored;
  }

  return chunksRows
    .map((row) => ({ content: row.content, score: keywordScore(q, row.content) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

function keywordScore(query: string, content: string): number {
  const words = query
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
  const qw = Array.from(new Set(words));
  const cw = content.toLowerCase();
  let hits = 0;
  for (let i = 0; i < qw.length; i++) {
    if (cw.includes(qw[i]!)) hits++;
  }
  return hits / Math.max(1, qw.length);
}
