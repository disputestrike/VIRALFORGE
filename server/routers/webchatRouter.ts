/** Embeddable webchat widgets — public relay endpoint TBD. */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const webchatRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => db.listWebchatWidgets(ctx.user.id)),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        welcomeMessage: z.string().max(2000).optional(),
        allowedOrigins: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await db.createWebchatWidget(ctx.user.id, input);
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(200).optional(),
        welcomeMessage: z.string().max(2000).nullable().optional(),
        allowedOrigins: z.string().max(2000).nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input;
      try {
        await db.updateWebchatWidget(ctx.user.id, id, rest);
        return { ok: true as const };
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
      }
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteWebchatWidget(ctx.user.id, input.id);
      return { ok: true as const };
    }),
});
