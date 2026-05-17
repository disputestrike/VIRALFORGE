import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { createOmniPulseSnapshot, runOmniPulseEngine } from "../_core/omnipulse/engine";

const outputProfileSchema = z.enum(["network-launch", "daily-shorts", "documentary-deep-dive"]);
const riskToleranceSchema = z.enum(["strict", "balanced", "aggressive"]);

export const omnipulseRouter = router({
  overview: publicProcedure.query(() => createOmniPulseSnapshot()),

  run: publicProcedure
    .input(
      z.object({
        topic: z.string().min(3).max(300),
        objective: z.string().min(3).max(600),
        outputProfile: outputProfileSchema.default("network-launch"),
        targetMinutes: z.number().int().min(1).max(60).default(12),
        platforms: z.array(z.string().min(1).max(40)).min(1).max(8).default(["YouTube", "TikTok", "Instagram/Reels", "Pinterest"]),
        languages: z.array(z.string().min(2).max(20)).min(1).max(12).default(["en-US"]),
        riskTolerance: riskToleranceSchema.default("balanced"),
        budgetCeilingUsd: z.number().min(5).max(500).default(75),
      }),
    )
    .mutation(({ input, ctx }) =>
      runOmniPulseEngine({
        ...input,
        tenantId: ctx.user ? `user_${ctx.user.id}` : "public_preview",
      }),
    ),
});

export default omnipulseRouter;
