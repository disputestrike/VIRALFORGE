/**
 * A/B Testing Router — manage prompt variants and view test results.
 * Variants are selected deterministically by hash(callId) % 100 weighted by `weight`.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const abTestingRouter = router({
  /** List all active prompt variants for this tenant */
  list: protectedProcedure
    .input(z.object({ testName: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => db.listPromptVariants(ctx.user.id, input?.testName)),

  /** Create a new prompt variant */
  create: protectedProcedure
    .input(
      z.object({
        testName: z.string().min(1).max(200).default("voice_prompt"),
        variantKey: z.string().min(1).max(64),
        promptOverride: z.string().max(20000).optional(),
        promptSuffix: z.string().max(5000).optional(),
        weight: z.number().int().min(0).max(100).default(50),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await db.upsertPromptVariant(ctx.user.id, input);
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
      }
    }),

  /** Deactivate a variant */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await db.deletePromptVariant(ctx.user.id, input.id);
      return { ok: true as const };
    }),

  /** Get aggregated results per variant for a test */
  summary: protectedProcedure
    .input(z.object({ testName: z.string().min(1).default("voice_prompt") }))
    .query(async ({ ctx, input }) => db.getAbTestSummary(ctx.user.id, input.testName)),

  /** Pick a variant for a given callId (deterministic) */
  selectVariant: protectedProcedure
    .input(z.object({ callId: z.string().min(1), testName: z.string().optional() }))
    .query(async ({ ctx, input }) =>
      db.selectAbVariantForCall(ctx.user.id, input.callId, input.testName ?? "voice_prompt")
    ),
});
