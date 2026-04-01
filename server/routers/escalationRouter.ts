/**
 * Keyword → live transfer escalation (uses per-rule number or Settings transfer number).
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { normalizeToE164US } from "../_core/phoneE164";
import * as db from "../db";

export const escalationRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.listEscalationRules(ctx.user.id);
  }),

  upsert: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        name: z.string().min(1).max(200),
        keyword: z.string().min(1).max(200),
        transferNumber: z.string().max(24).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let transfer: string | null | undefined = input.transferNumber;
      if (transfer?.trim()) {
        const n = normalizeToE164US(transfer);
        transfer = n || transfer.trim();
      } else {
        transfer = null;
      }
      try {
        return await db.upsertEscalationRule(ctx.user.id, {
          id: input.id,
          name: input.name,
          keyword: input.keyword,
          transferNumber: transfer,
          isActive: input.isActive,
        });
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
      }
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await db.deleteEscalationRule(ctx.user.id, input.id);
      return { ok: true as const };
    }),
});
