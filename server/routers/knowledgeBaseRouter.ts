/**
 * Knowledge base API — website crawl, chunk, OpenAI embeddings, semantic search, voice RAG.
 * Crosswalk: Part 1 feature #2.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  knowledgeBases,
  knowledgeBaseSources,
  knowledgeBaseChunks,
} from "../../drizzle/schema";
import {
  scheduleIngestKnowledgeBaseSource,
  searchKnowledgeChunks,
} from "../_core/services/knowledgeBaseIngestion";

export const knowledgeBaseRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(knowledgeBases)
      .where(eq(knowledgeBases.userId, ctx.user.id))
      .orderBy(desc(knowledgeBases.updatedAt));
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.insert(knowledgeBases).values({
        userId: ctx.user.id,
        name: input.name,
        description: input.description ?? null,
        status: "training",
        trainingProgress: 0,
      });
      const rows = await db
        .select()
        .from(knowledgeBases)
        .where(eq(knowledgeBases.userId, ctx.user.id))
        .orderBy(desc(knowledgeBases.id))
        .limit(1);
      const row = rows[0];
      if (!row) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Insert failed" });
      return row;
    }),

  /** Register a website — background job fetches HTML, chunks, embeds, stores rows. */
  addWebsiteSource: protectedProcedure
    .input(
      z.object({
        knowledgeBaseId: z.number().int().positive(),
        url: z.string().url().max(2048),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [kb] = await db
        .select()
        .from(knowledgeBases)
        .where(eq(knowledgeBases.id, input.knowledgeBaseId))
        .limit(1);
      if (!kb || kb.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Knowledge base not found" });
      }
      await db.insert(knowledgeBaseSources).values({
        knowledgeBaseId: input.knowledgeBaseId,
        sourceType: "website",
        sourceUrl: input.url,
        status: "pending",
      });
      const rows = await db
        .select()
        .from(knowledgeBaseSources)
        .where(eq(knowledgeBaseSources.knowledgeBaseId, input.knowledgeBaseId))
        .orderBy(desc(knowledgeBaseSources.id))
        .limit(1);
      const src = rows[0];
      if (!src) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Insert failed" });
      scheduleIngestKnowledgeBaseSource(src.id);
      return { success: true as const, sourceId: src.id };
    }),

  /** Re-run failed or stale website ingest. */
  reprocessSource: protectedProcedure
    .input(z.object({ sourceId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [src] = await db
        .select()
        .from(knowledgeBaseSources)
        .where(eq(knowledgeBaseSources.id, input.sourceId))
        .limit(1);
      if (!src) throw new TRPCError({ code: "NOT_FOUND", message: "Source not found" });
      const [kb] = await db
        .select()
        .from(knowledgeBases)
        .where(eq(knowledgeBases.id, src.knowledgeBaseId))
        .limit(1);
      if (!kb || kb.userId !== ctx.user.id) throw new TRPCError({ code: "NOT_FOUND", message: "Not found" });
      await db
        .update(knowledgeBaseSources)
        .set({ status: "pending", errorMessage: null, updatedAt: new Date() })
        .where(eq(knowledgeBaseSources.id, src.id));
      scheduleIngestKnowledgeBaseSource(src.id);
      return { success: true as const };
    }),

  listSources: protectedProcedure
    .input(z.object({ knowledgeBaseId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];
      const [kb] = await db
        .select()
        .from(knowledgeBases)
        .where(eq(knowledgeBases.id, input.knowledgeBaseId))
        .limit(1);
      if (!kb || kb.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Knowledge base not found" });
      }
      return db
        .select()
        .from(knowledgeBaseSources)
        .where(eq(knowledgeBaseSources.knowledgeBaseId, input.knowledgeBaseId))
        .orderBy(desc(knowledgeBaseSources.createdAt));
    }),

  stats: protectedProcedure
    .input(z.object({ knowledgeBaseId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { chunks: 0, sources: 0, pending: 0 };
      const [kb] = await db
        .select()
        .from(knowledgeBases)
        .where(eq(knowledgeBases.id, input.knowledgeBaseId))
        .limit(1);
      if (!kb || kb.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Knowledge base not found" });
      }
      const sources = await db
        .select()
        .from(knowledgeBaseSources)
        .where(eq(knowledgeBaseSources.knowledgeBaseId, input.knowledgeBaseId));
      const pending = sources.filter((s) => s.status === "pending" || s.status === "processing").length;
      const [chunkRow] = await db
        .select({ c: sql<number>`count(*)` })
        .from(knowledgeBaseChunks)
        .where(eq(knowledgeBaseChunks.knowledgeBaseId, input.knowledgeBaseId));
      return {
        chunks: Number(chunkRow?.c ?? 0),
        sources: sources.length,
        pending,
        kbStatus: kb.status,
        trainingProgress: kb.trainingProgress,
      };
    }),

  /** Semantic / keyword search over embedded chunks (for QA tools and debugging). */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(2).max(2000),
        knowledgeBaseId: z.number().int().positive().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return searchKnowledgeChunks(ctx.user.id, input.query, 8, {
        knowledgeBaseId: input.knowledgeBaseId,
      });
    }),
});
