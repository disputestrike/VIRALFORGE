// ============================================================================
// APEXAI: tRPC ROUTERS FOR ALL 20 FEATURES (PART 1: CRITICAL FEATURES)
// ============================================================================
// Stack: Node.js (TypeScript) + Express + tRPC
// Database: MySQL
// Phone Provider: SignalWire
// 
// Instructions for AI Team:
// 1. Add these routers to your tRPC appRouter
// 2. Wire database calls to your MySQL connection
// 3. Wire SignalWire API calls to your phone provider
// 4. Update error handling and logging as needed
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "@/server/trpc";

// ============================================================================
// 1. PHONE NUMBERS ROUTER
// ============================================================================
export const phoneNumbersRouter = router({
  // Provision a new dedicated phone number
  provision: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        areaCode: z.string().optional(),
        country: z.string().default("US"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Call SignalWire API to provision number
        // Example: await signalwire.phone.provision({ areaCode, country })
        
        const phoneResponse = await fetch(
          "https://api.signalwire.com/phone/provision",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.SIGNALWIRE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              areaCode: input.areaCode,
              country: input.country,
            }),
          }
        );

        const phoneData = await phoneResponse.json();

        // WIRE THIS: Save to database
        const result = await ctx.db.query(
          `INSERT INTO phone_numbers 
           (account_id, phone_number, provider, provider_id, status) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            input.accountId,
            phoneData.phoneNumber,
            "signalwire",
            phoneData.providerId,
            "active",
          ]
        );

        return {
          id: result.insertId,
          phoneNumber: phoneData.phoneNumber,
          status: "active",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to provision phone number",
          cause: error,
        });
      }
    }),

  // List all phone numbers for account
  list: publicProcedure
    .input(z.object({ accountId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        const result = await ctx.db.query(
          `SELECT * FROM phone_numbers WHERE account_id = ? AND status != 'deleted'`,
          [input.accountId]
        );

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch phone numbers",
          cause: error,
        });
      }
    }),

  // Get phone number settings
  getSettings: publicProcedure
    .input(z.object({ phoneNumberId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        const result = await ctx.db.query(
          `SELECT * FROM phone_number_settings WHERE phone_number_id = ?`,
          [input.phoneNumberId]
        );

        return result[0] || null;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch phone settings",
          cause: error,
        });
      }
    }),

  // Update phone number settings
  updateSettings: publicProcedure
    .input(
      z.object({
        phoneNumberId: z.string(),
        greetingMessage: z.string().optional(),
        voicemailEnabled: z.boolean().optional(),
        voicemailMessage: z.string().optional(),
        callRecordingEnabled: z.boolean().optional(),
        transcriptionEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Update database
        await ctx.db.query(
          `UPDATE phone_number_settings 
           SET greeting_message = COALESCE(?, greeting_message),
               voicemail_enabled = COALESCE(?, voicemail_enabled),
               voicemail_message = COALESCE(?, voicemail_message),
               call_recording_enabled = COALESCE(?, call_recording_enabled),
               transcription_enabled = COALESCE(?, transcription_enabled)
           WHERE phone_number_id = ?`,
          [
            input.greetingMessage,
            input.voicemailEnabled,
            input.voicemailMessage,
            input.callRecordingEnabled,
            input.transcriptionEnabled,
            input.phoneNumberId,
          ]
        );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update phone settings",
          cause: error,
        });
      }
    }),

  // Delete phone number
  delete: publicProcedure
    .input(z.object({ phoneNumberId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Call SignalWire to release number
        const phoneNumber = await ctx.db.query(
          `SELECT provider_id FROM phone_numbers WHERE id = ?`,
          [input.phoneNumberId]
        );

        if (phoneNumber[0]) {
          await fetch(
            `https://api.signalwire.com/phone/release/${phoneNumber[0].provider_id}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${process.env.SIGNALWIRE_API_KEY}`,
              },
            }
          );
        }

        // WIRE THIS: Update database
        await ctx.db.query(
          `UPDATE phone_numbers SET status = 'deleted' WHERE id = ?`,
          [input.phoneNumberId]
        );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete phone number",
          cause: error,
        });
      }
    }),
});

// ============================================================================
// 2. KNOWLEDGE BASE ROUTER
// ============================================================================
export const knowledgeBaseRouter = router({
  // Create knowledge base
  create: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        name: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Insert into database
        const result = await ctx.db.query(
          `INSERT INTO knowledge_bases (account_id, name, description, status) 
           VALUES (?, ?, ?, 'training')`,
          [input.accountId, input.name, input.description]
        );

        return {
          id: result.insertId,
          name: input.name,
          status: "training",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create knowledge base",
          cause: error,
        });
      }
    }),

  // Add website URL to knowledge base
  addWebsiteSource: publicProcedure
    .input(
      z.object({
        knowledgeBaseId: z.string(),
        websiteUrl: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Insert source into database
        const result = await ctx.db.query(
          `INSERT INTO knowledge_base_sources 
           (knowledge_base_id, source_type, source_url, status) 
           VALUES (?, 'website', ?, 'processing')`,
          [input.knowledgeBaseId, input.websiteUrl]
        );

        // WIRE THIS: Queue background job to crawl website
        // Example: await queue.add('crawl-website', { sourceId: result.insertId, url: input.websiteUrl })
        
        // Pseudo-code for background job:
        // 1. Fetch all pages from website
        // 2. Extract text content
        // 3. Split into chunks
        // 4. Generate embeddings (OpenAI)
        // 5. Store in knowledge_base_chunks table

        return {
          id: result.insertId,
          status: "processing",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add website source",
          cause: error,
        });
      }
    }),

  // Upload document (PDF, Word, etc.)
  uploadDocument: publicProcedure
    .input(
      z.object({
        knowledgeBaseId: z.string(),
        fileName: z.string(),
        fileContent: z.instanceof(Buffer),
        fileType: z.enum(["pdf", "word", "txt", "html", "markdown"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Save file to storage
        const filePath = `/storage/kb/${input.knowledgeBaseId}/${input.fileName}`;
        // await saveFile(filePath, input.fileContent);

        // WIRE THIS: Insert source into database
        const result = await ctx.db.query(
          `INSERT INTO knowledge_base_sources 
           (knowledge_base_id, source_type, file_name, file_path, file_size, status) 
           VALUES (?, ?, ?, ?, ?, 'processing')`,
          [
            input.knowledgeBaseId,
            input.fileType,
            input.fileName,
            filePath,
            input.fileContent.length,
          ]
        );

        // WIRE THIS: Queue background job to process document
        // Example: await queue.add('process-document', { sourceId: result.insertId, filePath })

        return {
          id: result.insertId,
          status: "processing",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload document",
          cause: error,
        });
      }
    }),

  // Query knowledge base (search)
  query: publicProcedure
    .input(
      z.object({
        knowledgeBaseId: z.string(),
        question: z.string(),
        topK: z.number().default(5),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Generate embedding for question (OpenAI)
        // const questionEmbedding = await openai.embeddings.create({
        //   model: "text-embedding-3-small",
        //   input: input.question,
        // });

        // WIRE THIS: Vector search in database (MySQL 8.0+ with vector support)
        // For now, use semantic search via API
        const result = await ctx.db.query(
          `SELECT content, metadata FROM knowledge_base_chunks 
           WHERE knowledge_base_id = ? 
           LIMIT ?`,
          [input.knowledgeBaseId, input.topK]
        );

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to query knowledge base",
          cause: error,
        });
      }
    }),

  // Get knowledge base status
  getStatus: publicProcedure
    .input(z.object({ knowledgeBaseId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        const result = await ctx.db.query(
          `SELECT * FROM knowledge_bases WHERE id = ?`,
          [input.knowledgeBaseId]
        );

        return result[0] || null;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch knowledge base status",
          cause: error,
        });
      }
    }),
});

// ============================================================================
// 3. CRM LEADS ROUTER
// ============================================================================
export const crmLeadsRouter = router({
  // Create lead
  create: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        phoneNumberId: z.string().optional(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email().optional(),
        phone: z.string(),
        company: z.string().optional(),
        source: z.enum(["inbound_call", "outbound_call", "sms", "website", "email", "import"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Insert into database
        const result = await ctx.db.query(
          `INSERT INTO crm_leads 
           (account_id, phone_number_id, first_name, last_name, email, phone, company, source, notes, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
          [
            input.accountId,
            input.phoneNumberId,
            input.firstName,
            input.lastName,
            input.email,
            input.phone,
            input.company,
            input.source,
            input.notes,
          ]
        );

        return {
          id: result.insertId,
          status: "new",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create lead",
          cause: error,
        });
      }
    }),

  // Get lead
  get: publicProcedure
    .input(z.object({ leadId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        const result = await ctx.db.query(
          `SELECT * FROM crm_leads WHERE id = ?`,
          [input.leadId]
        );

        return result[0] || null;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch lead",
          cause: error,
        });
      }
    }),

  // Update lead
  update: publicProcedure
    .input(
      z.object({
        leadId: z.string(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        company: z.string().optional(),
        status: z.enum(["new", "contacted", "qualified", "unqualified", "converted", "lost"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Update database
        await ctx.db.query(
          `UPDATE crm_leads 
           SET first_name = COALESCE(?, first_name),
               last_name = COALESCE(?, last_name),
               email = COALESCE(?, email),
               company = COALESCE(?, company),
               status = COALESCE(?, status),
               notes = COALESCE(?, notes)
           WHERE id = ?`,
          [
            input.firstName,
            input.lastName,
            input.email,
            input.company,
            input.status,
            input.notes,
            input.leadId,
          ]
        );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update lead",
          cause: error,
        });
      }
    }),

  // List leads for account
  list: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        status: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        let query = `SELECT * FROM crm_leads WHERE account_id = ?`;
        const params: any[] = [input.accountId];

        if (input.status) {
          query += ` AND status = ?`;
          params.push(input.status);
        }

        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(input.limit, input.offset);

        const result = await ctx.db.query(query, params);
        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch leads",
          cause: error,
        });
      }
    }),

  // Add activity to lead
  addActivity: publicProcedure
    .input(
      z.object({
        leadId: z.string(),
        activityType: z.enum(["call", "sms", "email", "note", "status_change", "qualification_update"]),
        description: z.string(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Insert into database
        const result = await ctx.db.query(
          `INSERT INTO crm_lead_activities 
           (lead_id, activity_type, description, metadata) 
           VALUES (?, ?, ?, ?)`,
          [input.leadId, input.activityType, input.description, JSON.stringify(input.metadata || {})]
        );

        return { id: result.insertId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add activity",
          cause: error,
        });
      }
    }),
});

// ============================================================================
// 4. CALL SUMMARIES ROUTER
// ============================================================================
export const callSummariesRouter = router({
  // Create call summary (called after call ends)
  create: publicProcedure
    .input(
      z.object({
        callId: z.string(),
        accountId: z.string(),
        leadId: z.string().optional(),
        summary: z.string(),
        keyPoints: z.array(z.string()).optional(),
        sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
        duration: z.number().optional(),
        transcription: z.string().optional(),
        actionItems: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Insert into database
        const result = await ctx.db.query(
          `INSERT INTO call_summaries 
           (call_id, account_id, lead_id, summary, key_points, sentiment, duration, transcription, action_items) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            input.callId,
            input.accountId,
            input.leadId,
            input.summary,
            JSON.stringify(input.keyPoints || []),
            input.sentiment,
            input.duration,
            input.transcription,
            JSON.stringify(input.actionItems || []),
          ]
        );

        return { id: result.insertId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create call summary",
          cause: error,
        });
      }
    }),

  // Get call summary
  get: publicProcedure
    .input(z.object({ callId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        const result = await ctx.db.query(
          `SELECT * FROM call_summaries WHERE call_id = ?`,
          [input.callId]
        );

        return result[0] || null;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch call summary",
          cause: error,
        });
      }
    }),

  // List summaries for account
  list: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        const result = await ctx.db.query(
          `SELECT * FROM call_summaries 
           WHERE account_id = ? 
           ORDER BY created_at DESC 
           LIMIT ? OFFSET ?`,
          [input.accountId, input.limit, input.offset]
        );

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch call summaries",
          cause: error,
        });
      }
    }),
});

// ============================================================================
// 5. LEAD SCORING ROUTER
// ============================================================================
export const leadScoringRouter = router({
  // Create scoring rule
  createRule: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        name: z.string(),
        description: z.string().optional(),
        rules: z.array(
          z.object({
            field: z.string(),
            operator: z.enum(["equals", "contains", "gt", "lt", "in"]),
            value: z.any(),
            points: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Insert into database
        const result = await ctx.db.query(
          `INSERT INTO lead_scoring_rules 
           (account_id, name, description, rules, is_active) 
           VALUES (?, ?, ?, ?, true)`,
          [input.accountId, input.name, input.description, JSON.stringify(input.rules)]
        );

        return { id: result.insertId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create scoring rule",
          cause: error,
        });
      }
    }),

  // Calculate score for lead
  calculateScore: publicProcedure
    .input(
      z.object({
        leadId: z.string(),
        scoringRuleId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Fetch lead and scoring rule from database
        const lead = await ctx.db.query(
          `SELECT * FROM crm_leads WHERE id = ?`,
          [input.leadId]
        );

        const rule = await ctx.db.query(
          `SELECT * FROM lead_scoring_rules WHERE id = ?`,
          [input.scoringRuleId]
        );

        if (!lead[0] || !rule[0]) {
          throw new Error("Lead or rule not found");
        }

        // WIRE THIS: Calculate score based on rules
        const rules = JSON.parse(rule[0].rules);
        let totalScore = 0;
        const breakdown: any = {};

        for (const r of rules) {
          let matched = false;

          if (r.operator === "equals" && lead[0][r.field] === r.value) {
            matched = true;
          } else if (r.operator === "contains" && String(lead[0][r.field]).includes(r.value)) {
            matched = true;
          } else if (r.operator === "gt" && lead[0][r.field] > r.value) {
            matched = true;
          } else if (r.operator === "lt" && lead[0][r.field] < r.value) {
            matched = true;
          } else if (r.operator === "in" && Array.isArray(r.value) && r.value.includes(lead[0][r.field])) {
            matched = true;
          }

          if (matched) {
            totalScore += r.points;
            breakdown[r.field] = r.points;
          }
        }

        // WIRE THIS: Save score to database
        const result = await ctx.db.query(
          `INSERT INTO lead_scores 
           (lead_id, scoring_rule_id, score, breakdown) 
           VALUES (?, ?, ?, ?)`,
          [input.leadId, input.scoringRuleId, totalScore, JSON.stringify(breakdown)]
        );

        // WIRE THIS: Update lead qualification_score
        await ctx.db.query(
          `UPDATE crm_leads SET qualification_score = ? WHERE id = ?`,
          [totalScore, input.leadId]
        );

        return { score: totalScore, breakdown };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to calculate score",
          cause: error,
        });
      }
    }),

  // Get score for lead
  getScore: publicProcedure
    .input(z.object({ leadId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        const result = await ctx.db.query(
          `SELECT * FROM lead_scores WHERE lead_id = ? ORDER BY calculated_at DESC LIMIT 1`,
          [input.leadId]
        );

        return result[0] || null;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch lead score",
          cause: error,
        });
      }
    }),
});

// ============================================================================
// Export all routers
// ============================================================================
export const criticalFeaturesRouter = router({
  phoneNumbers: phoneNumbersRouter,
  knowledgeBase: knowledgeBaseRouter,
  crmLeads: crmLeadsRouter,
  callSummaries: callSummariesRouter,
  leadScoring: leadScoringRouter,
});
