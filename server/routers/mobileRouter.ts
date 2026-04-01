/** Mobile app device registry (push tokens, client identity). Native apps call `register` after login. */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const mobileRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => db.listMobileDevices(ctx.user.id)),

  register: protectedProcedure
    .input(
      z.object({
        platform: z.enum(["ios", "android"]),
        deviceKey: z.string().min(8).max(128),
        displayName: z.string().max(200).optional(),
        pushToken: z.string().max(512).optional(),
        appVersion: z.string().max(32).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await db.registerMobileDevice(ctx.user.id, input);
      } catch (e) {
        throw new TRPCError({ code: "BAD_REQUEST", message: (e as Error).message });
      }
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await db.removeMobileDevice(ctx.user.id, input.id);
      return { ok: true as const };
    }),
});
