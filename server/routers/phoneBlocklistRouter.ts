/**
 * Tenant blocklist — inbound calls from these numbers are rejected (busy).
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { normalizeToE164US } from "../_core/phoneE164";
import * as db from "../db";

export const phoneBlocklistRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.listBlockedPhones(ctx.user.id);
  }),

  add: protectedProcedure
    .input(
      z.object({
        phone: z.string().min(7).max(40),
        note: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const phoneE164 = normalizeToE164US(input.phone);
      if (!phoneE164 || phoneE164.length < 12) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Enter a valid US phone number" });
      }
      await db.addBlockedPhone(ctx.user.id, phoneE164, input.note ?? null);
      return { ok: true as const };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await db.removeBlockedPhone(ctx.user.id, input.id);
      return { ok: true as const };
    }),
});
