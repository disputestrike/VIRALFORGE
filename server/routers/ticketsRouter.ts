/** Support tickets from calls / manual — CRM sync optional later. */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const ticketsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => db.listSupportTickets(ctx.user.id)),

  create: protectedProcedure
    .input(
      z.object({
        leadId: z.number().int().positive().optional(),
        subject: z.string().min(1).max(300),
        body: z.string().min(1).max(10000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await db.createSupportTicket(ctx.user.id, input);
      } catch (e) {
        throw new TRPCError({ code: "BAD_REQUEST", message: (e as Error).message });
      }
    }),

  setStatus: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        status: z.enum(["open", "in_progress", "closed"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db.updateSupportTicketStatus(ctx.user.id, input.id, input.status);
      return { ok: true as const };
    }),
});
