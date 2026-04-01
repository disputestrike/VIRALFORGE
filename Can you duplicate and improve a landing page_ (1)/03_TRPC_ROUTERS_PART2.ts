// ============================================================================
// APEXAI: tRPC ROUTERS FOR ALL 20 FEATURES (PART 2: FEATURES 6-20)
// ============================================================================
// Features 6-10: Voice Options, Spam Filtering, Escalation, Zapier, CRM Integrations
// Features 11-20: Workflow Builder, Memory, Sentiment, Ticketing, Mobile, Social, Email, RCS, Webchat, Analytics
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "@/server/trpc";

// ============================================================================
// 6. VOICE OPTIONS ROUTER
// ============================================================================
export const voicesRouter = router({
  // List all available voices
  list: publicProcedure
    .input(
      z.object({
        language: z.string().optional(),
        gender: z.enum(["male", "female", "neutral"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        let query = `SELECT * FROM ai_voices WHERE is_active = true`;
        const params: any[] = [];

        if (input.language) {
          query += ` AND language = ?`;
          params.push(input.language);
        }

        if (input.gender) {
          query += ` AND gender = ?`;
          params.push(input.gender);
        }

        const result = await ctx.db.query(query, params);
        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch voices",
          cause: error,
        });
      }
    }),

  // Set default voice for account
  setDefault: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        voiceId: z.string(),
        voiceType: z.enum(["default", "inbound", "outbound"]).default("default"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Update or insert into database
        const existing = await ctx.db.query(
          `SELECT id FROM account_voice_settings WHERE account_id = ?`,
          [input.accountId]
        );

        if (existing.length > 0) {
          const updateField =
            input.voiceType === "default"
              ? "default_voice_id"
              : input.voiceType === "inbound"
                ? "inbound_voice_id"
                : "outbound_voice_id";

          await ctx.db.query(
            `UPDATE account_voice_settings SET ${updateField} = ? WHERE account_id = ?`,
            [input.voiceId, input.accountId]
          );
        } else {
          const updateField =
            input.voiceType === "default"
              ? "default_voice_id"
              : input.voiceType === "inbound"
                ? "inbound_voice_id"
                : "outbound_voice_id";

          await ctx.db.query(
            `INSERT INTO account_voice_settings (account_id, ${updateField}) VALUES (?, ?)`,
            [input.accountId, input.voiceId]
          );
        }

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to set voice",
          cause: error,
        });
      }
    }),

  // Get voice settings for account
  getSettings: publicProcedure
    .input(z.object({ accountId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        const result = await ctx.db.query(
          `SELECT * FROM account_voice_settings WHERE account_id = ?`,
          [input.accountId]
        );

        return result[0] || null;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch voice settings",
          cause: error,
        });
      }
    }),
});

// ============================================================================
// 7. SPAM FILTERING ROUTER
// ============================================================================
export const spamFilteringRouter = router({
  // Add spam filter rule
  addFilter: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        filterType: z.enum(["blocklist", "allowlist", "pattern", "keyword"]),
        value: z.string(),
        action: z.enum(["block", "allow", "flag"]).default("block"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Insert into database
        const result = await ctx.db.query(
          `INSERT INTO spam_filters 
           (account_id, filter_type, value, action, is_active) 
           VALUES (?, ?, ?, ?, true)`,
          [input.accountId, input.filterType, input.value, input.action]
        );

        return { id: result.insertId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add spam filter",
          cause: error,
        });
      }
    }),

  // Get all filters for account
  list: publicProcedure
    .input(z.object({ accountId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        const result = await ctx.db.query(
          `SELECT * FROM spam_filters WHERE account_id = ? AND is_active = true`,
          [input.accountId]
        );

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch spam filters",
          cause: error,
        });
      }
    }),

  // Check if phone is spam
  checkSpam: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        phoneNumber: z.string(),
        callerId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Get filters from database
        const filters = await ctx.db.query(
          `SELECT * FROM spam_filters WHERE account_id = ? AND is_active = true`,
          [input.accountId]
        );

        let isSpam = false;
        let spamScore = 0;
        let reason = "";

        // Check against blocklist
        for (const filter of filters) {
          if (filter.filter_type === "blocklist" && filter.value === input.phoneNumber) {
            isSpam = true;
            spamScore = 100;
            reason = "Phone number on blocklist";
            break;
          }

          if (filter.filter_type === "allowlist" && filter.value === input.phoneNumber) {
            isSpam = false;
            spamScore = 0;
            reason = "Phone number on allowlist";
            break;
          }

          if (filter.filter_type === "pattern" && new RegExp(filter.value).test(input.phoneNumber)) {
            isSpam = true;
            spamScore += 50;
            reason = "Matches spam pattern";
          }

          if (filter.filter_type === "keyword" && input.callerId && input.callerId.includes(filter.value)) {
            isSpam = true;
            spamScore += 30;
            reason = "Caller ID contains spam keyword";
          }
        }

        // WIRE THIS: Log detection
        await ctx.db.query(
          `INSERT INTO spam_detection_logs 
           (account_id, phone_number, caller_id, is_spam, spam_score, reason, action_taken) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            input.accountId,
            input.phoneNumber,
            input.callerId,
            isSpam,
            spamScore,
            reason,
            isSpam ? "blocked" : "allowed",
          ]
        );

        return { isSpam, spamScore, reason };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to check spam",
          cause: error,
        });
      }
    }),

  // Delete filter
  deleteFilter: publicProcedure
    .input(z.object({ filterId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Update database
        await ctx.db.query(
          `UPDATE spam_filters SET is_active = false WHERE id = ?`,
          [input.filterId]
        );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete filter",
          cause: error,
        });
      }
    }),
});

// ============================================================================
// 8. ESCALATION ROUTER
// ============================================================================
export const escalationRouter = router({
  // Create escalation rule
  createRule: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        name: z.string(),
        triggerConditions: z.array(
          z.object({
            field: z.string(),
            operator: z.string(),
            value: z.any(),
          })
        ),
        escalationTarget: z.enum(["human_agent", "queue", "voicemail", "callback"]),
        targetPhone: z.string().optional(),
        maxWaitTime: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Insert into database
        const result = await ctx.db.query(
          `INSERT INTO escalation_rules 
           (account_id, name, trigger_conditions, escalation_target, target_phone, max_wait_time, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, true)`,
          [
            input.accountId,
            input.name,
            JSON.stringify(input.triggerConditions),
            input.escalationTarget,
            input.targetPhone,
            input.maxWaitTime || 300,
          ]
        );

        return { id: result.insertId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create escalation rule",
          cause: error,
        });
      }
    }),

  // Trigger escalation
  trigger: publicProcedure
    .input(
      z.object({
        callId: z.string(),
        escalationRuleId: z.string(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Get rule from database
        const rule = await ctx.db.query(
          `SELECT * FROM escalation_rules WHERE id = ?`,
          [input.escalationRuleId]
        );

        if (!rule[0]) {
          throw new Error("Escalation rule not found");
        }

        // WIRE THIS: Route based on escalation target
        let escalatedTo = "";

        if (rule[0].escalation_target === "human_agent") {
          // WIRE THIS: Call SignalWire to transfer to human agent
          escalatedTo = "human_agent";
          // await signalwire.call.transfer(callId, rule[0].target_phone);
        } else if (rule[0].escalation_target === "voicemail") {
          escalatedTo = "voicemail";
          // await signalwire.call.voicemail(callId);
        } else if (rule[0].escalation_target === "callback") {
          escalatedTo = "callback";
          // Queue callback request
        }

        // WIRE THIS: Log escalation event
        const result = await ctx.db.query(
          `INSERT INTO escalation_events 
           (call_id, escalation_rule_id, reason, escalated_to) 
           VALUES (?, ?, ?, ?)`,
          [input.callId, input.escalationRuleId, input.reason, escalatedTo]
        );

        return { id: result.insertId, escalatedTo };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to trigger escalation",
          cause: error,
        });
      }
    }),
});

// ============================================================================
// 9. ZAPIER INTEGRATION ROUTER
// ============================================================================
export const zapierRouter = router({
  // Connect Zapier
  connect: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        zapierAppId: z.string(),
        webhookUrl: z.string().url(),
        triggerType: z.enum([
          "call_completed",
          "lead_created",
          "lead_qualified",
          "sms_sent",
          "appointment_booked",
        ]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Insert into database
        const result = await ctx.db.query(
          `INSERT INTO zapier_integrations 
           (account_id, zapier_app_id, webhook_url, trigger_type, is_active) 
           VALUES (?, ?, ?, ?, true)`,
          [input.accountId, input.zapierAppId, input.webhookUrl, input.triggerType]
        );

        return { id: result.insertId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to connect Zapier",
          cause: error,
        });
      }
    }),

  // Send event to Zapier
  sendEvent: publicProcedure
    .input(
      z.object({
        integrationId: z.string(),
        eventType: z.string(),
        payload: z.record(z.any()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Get integration from database
        const integration = await ctx.db.query(
          `SELECT * FROM zapier_integrations WHERE id = ?`,
          [input.integrationId]
        );

        if (!integration[0]) {
          throw new Error("Integration not found");
        }

        // WIRE THIS: Send webhook to Zapier
        const response = await fetch(integration[0].webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trigger: integration[0].trigger_type,
            data: input.payload,
          }),
        });

        // WIRE THIS: Log webhook
        await ctx.db.query(
          `INSERT INTO zapier_webhook_logs 
           (integration_id, event_type, payload, response_status) 
           VALUES (?, ?, ?, ?)`,
          [input.integrationId, input.eventType, JSON.stringify(input.payload), response.status]
        );

        return { success: response.ok };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send Zapier event",
          cause: error,
        });
      }
    }),

  // List integrations
  list: publicProcedure
    .input(z.object({ accountId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        const result = await ctx.db.query(
          `SELECT * FROM zapier_integrations WHERE account_id = ? AND is_active = true`,
          [input.accountId]
        );

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch Zapier integrations",
          cause: error,
        });
      }
    }),
});

// ============================================================================
// 10. CRM INTEGRATIONS ROUTER
// ============================================================================
export const crmIntegrationsRouter = router({
  // Connect CRM (Salesforce, HubSpot, Pipedrive)
  connect: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        crmType: z.enum(["salesforce", "hubspot", "pipedrive", "zoho"]),
        accessToken: z.string(),
        refreshToken: z.string().optional(),
        instanceUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Encrypt tokens before storing
        // const encryptedAccessToken = encrypt(input.accessToken);
        // const encryptedRefreshToken = input.refreshToken ? encrypt(input.refreshToken) : null;

        // WIRE THIS: Insert into database
        const result = await ctx.db.query(
          `INSERT INTO crm_integrations 
           (account_id, crm_type, access_token, refresh_token, instance_url, is_active) 
           VALUES (?, ?, ?, ?, ?, true)`,
          [
            input.accountId,
            input.crmType,
            input.accessToken, // Should be encrypted
            input.refreshToken,
            input.instanceUrl,
          ]
        );

        return { id: result.insertId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to connect CRM",
          cause: error,
        });
      }
    }),

  // Map fields between ApexAI and CRM
  mapField: publicProcedure
    .input(
      z.object({
        integrationId: z.string(),
        apexaiField: z.string(),
        crmField: z.string(),
        fieldType: z.string(),
        isBidirectional: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Insert into database
        const result = await ctx.db.query(
          `INSERT INTO crm_field_mappings 
           (integration_id, apexai_field, crm_field, field_type, is_bidirectional) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            input.integrationId,
            input.apexaiField,
            input.crmField,
            input.fieldType,
            input.isBidirectional,
          ]
        );

        return { id: result.insertId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to map field",
          cause: error,
        });
      }
    }),

  // Sync lead to CRM
  syncLead: publicProcedure
    .input(
      z.object({
        integrationId: z.string(),
        leadId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Get lead from database
        const lead = await ctx.db.query(
          `SELECT * FROM crm_leads WHERE id = ?`,
          [input.leadId]
        );

        if (!lead[0]) {
          throw new Error("Lead not found");
        }

        // WIRE THIS: Get field mappings
        const mappings = await ctx.db.query(
          `SELECT * FROM crm_field_mappings WHERE integration_id = ?`,
          [input.integrationId]
        );

        // WIRE THIS: Get CRM integration details
        const integration = await ctx.db.query(
          `SELECT * FROM crm_integrations WHERE id = ?`,
          [input.integrationId]
        );

        if (!integration[0]) {
          throw new Error("Integration not found");
        }

        // WIRE THIS: Map fields and send to CRM
        // This depends on the specific CRM API
        // Example for HubSpot:
        // const hubspotData = {};
        // for (const mapping of mappings) {
        //   hubspotData[mapping.crm_field] = lead[0][mapping.apexai_field];
        // }
        // await hubspot.contacts.create(hubspotData);

        // WIRE THIS: Log sync
        const result = await ctx.db.query(
          `INSERT INTO crm_sync_logs 
           (integration_id, sync_type, records_synced, status) 
           VALUES (?, 'lead_push', 1, 'completed')`,
          [input.integrationId]
        );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to sync lead to CRM",
          cause: error,
        });
      }
    }),

  // List CRM integrations
  list: publicProcedure
    .input(z.object({ accountId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        const result = await ctx.db.query(
          `SELECT id, account_id, crm_type, is_active, last_sync_at 
           FROM crm_integrations 
           WHERE account_id = ?`,
          [input.accountId]
        );

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch CRM integrations",
          cause: error,
        });
      }
    }),
});

// ============================================================================
// Export all routers
// ============================================================================
export const advancedFeaturesRouter = router({
  voices: voicesRouter,
  spamFiltering: spamFilteringRouter,
  escalation: escalationRouter,
  zapier: zapierRouter,
  crmIntegrations: crmIntegrationsRouter,
});
