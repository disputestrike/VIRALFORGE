/** Social channel connections — stub OAuth until Meta / LinkedIn apps are wired. */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

const provider = z.enum(["linkedin", "facebook", "instagram", "x"]);

export const socialRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => db.listSocialConnections(ctx.user.id)),

  startConnect: protectedProcedure.input(z.object({ provider })).mutation(async ({ ctx, input }) => {
    try {
      await db.upsertSocialConnectionStub(ctx.user.id, input.provider);
      return { ok: true as const };
    } catch (e) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
    }
  }),

  disconnect: protectedProcedure.input(z.object({ provider })).mutation(async ({ ctx, input }) => {
    try {
      await db.setSocialDisconnected(ctx.user.id, input.provider);
      return { ok: true as const };
    } catch (e) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
    }
  }),
});
