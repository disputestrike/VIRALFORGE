/** RCS brand / agent registration — carrier + Google Jibe hooks TBD. */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const rcsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => db.getRcsRegistration(ctx.user.id)),

  upsert: protectedProcedure
    .input(
      z.object({
        brandName: z.string().min(1).max(200),
        agentId: z.string().max(200).optional(),
        status: z.enum(["draft", "submitted", "verified"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await db.upsertRcsRegistration(ctx.user.id, input);
        return { ok: true as const };
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
      }
    }),
});
