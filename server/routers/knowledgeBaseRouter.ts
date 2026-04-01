/**
 * Knowledge base API — website URL + document sources (ingestion worker TBD).
 * Crosswalk: Part 1 feature #2.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { knowledgeBases, knowledgeBaseSources } from "../../drizzle/schema";

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

  /** Register a website to crawl — processing is async (worker TBD). */
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
});
