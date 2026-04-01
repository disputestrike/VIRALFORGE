/** Drip / trigger email templates — queue worker TBD. */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const emailSequencesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => db.listEmailSequences(ctx.user.id)),

  upsert: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        name: z.string().min(1).max(200),
        triggerEvent: z.string().min(1).max(64),
        bodyTemplate: z.string().min(1).max(10000),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await db.upsertEmailSequence(ctx.user.id, input);
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
      }
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteEmailSequence(ctx.user.id, input.id);
      return { ok: true as const };
    }),
});
