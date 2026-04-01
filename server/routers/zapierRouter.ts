/**
 * Zapier webhook URL — store target; event delivery worker TBD.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const zapierRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return db.getZapierWebhook(ctx.user.id);
  }),

  save: protectedProcedure
    .input(
      z.object({
        targetUrl: z.string().url().max(2048),
        events: z.string().max(500).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await db.upsertZapierWebhook(ctx.user.id, {
          targetUrl: input.targetUrl,
          events: input.events ?? null,
          isActive: input.isActive ?? true,
        });
      } catch (e) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: (e as Error).message,
        });
      }
    }),

  /** POST a sample payload — verifies URL responds (Zapier catch hook test). */
  test: protectedProcedure.mutation(async ({ ctx }) => {
    const row = await db.getZapierWebhook(ctx.user.id);
    if (!row?.targetUrl) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Save a webhook URL first" });
    }
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(row.targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "apexai.test",
          userId: ctx.user.id,
          sentAt: new Date().toISOString(),
        }),
        signal: controller.signal,
      });
      return { ok: res.ok, status: res.status };
    } catch (e) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: (e as Error).message,
      });
    } finally {
      clearTimeout(t);
    }
  }),
});
