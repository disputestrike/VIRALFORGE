/**
 * Tenant lead scoring rules (JSON). Default ruleset adds bonus points on `leads.create`.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

const ruleEntry = z.object({
  field: z.string().min(1).max(64),
  op: z.enum(["eq", "contains", "present"]),
  value: z.string().max(500).optional(),
  points: z.number().int().min(-100).max(100),
});

export const leadScoringRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.listLeadScoringRules(ctx.user.id);
  }),

  upsert: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive().optional(),
        name: z.string().min(1).max(200),
        rules: z.array(ruleEntry).min(1).max(50),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await db.upsertLeadScoringRule(ctx.user.id, {
          id: input.id,
          name: input.name,
          rules: input.rules,
          isDefault: input.isDefault,
        });
      } catch (e) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: (e as Error).message,
        });
      }
    }),
});
