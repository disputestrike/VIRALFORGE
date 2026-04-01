/**
 * CRM connections — tenant records per provider; full OAuth token exchange is configured per vendor in your CRM developer console.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

const provider = z.enum(["salesforce", "hubspot", "pipedrive"]);

export const crmRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.listCrmConnections(ctx.user.id);
  }),

  /** Registers intent to connect (row in `crm_connections` for the chosen provider). */
  startConnect: protectedProcedure.input(z.object({ provider })).mutation(async ({ ctx, input }) => {
    try {
      await db.upsertCrmConnectionStub(ctx.user.id, input.provider);
      return { ok: true as const };
    } catch (e) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
    }
  }),

  disconnect: protectedProcedure.input(z.object({ provider })).mutation(async ({ ctx, input }) => {
    try {
      await db.setCrmDisconnected(ctx.user.id, input.provider);
      return { ok: true as const };
    } catch (e) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
    }
  }),
});
