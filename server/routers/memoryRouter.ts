/** Per-tenant customer memory snippets (RAG / context — workers TBD). */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const memoryRouter = router({
  list: protectedProcedure
    .input(z.object({ leadId: z.number().int().positive().optional() }).optional())
    .query(async ({ ctx, input }) => db.listCustomerMemories(ctx.user.id, input?.leadId)),

  add: protectedProcedure
    .input(
      z.object({
        leadId: z.number().int().positive().optional(),
        content: z.string().min(1).max(8000),
        source: z.string().max(64).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await db.addCustomerMemory(ctx.user.id, input);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: (e as Error).message,
        });
      }
    }),
});
