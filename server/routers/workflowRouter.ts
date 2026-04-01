/** No-code workflow definitions — `lead.created` runs `definition.steps` with `http_post` actions. */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const workflowRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => db.listWorkflows(ctx.user.id)),

  upsert: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        name: z.string().min(1).max(200),
        definition: z.record(z.string(), z.unknown()),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await db.upsertWorkflow(ctx.user.id, input);
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
      }
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteWorkflow(ctx.user.id, input.id);
      return { ok: true as const };
    }),
});
