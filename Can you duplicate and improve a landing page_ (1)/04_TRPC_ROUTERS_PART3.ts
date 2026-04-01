// ============================================================================
// APEXAI: tRPC ROUTERS FOR PHASE 2 FEATURES (11-20)
// ============================================================================
// Features 11-20: Workflow Builder, Memory, Sentiment, Ticketing, Mobile, Social, Email, RCS, Webchat, Analytics
// ============================================================================

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "@/server/trpc";

// ============================================================================
// 11. WORKFLOW BUILDER ROUTER
// ============================================================================
export const workflowBuilderRouter = router({
  // Create workflow
  create: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        name: z.string(),
        description: z.string().optional(),
        triggerType: z.enum([
          "call_received",
          "call_completed",
          "lead_created",
          "sms_received",
          "time_based",
        ]),
        workflowDefinition: z.record(z.any()), // Drag-and-drop flow JSON
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Insert into database
        const result = await ctx.db.query(
          `INSERT INTO workflows 
           (account_id, name, description, trigger_type, workflow_definition, is_active) 
           VALUES (?, ?, ?, ?, ?, true)`,
          [
            input.accountId,
            input.name,
            input.description,
            input.triggerType,
            JSON.stringify(input.workflowDefinition),
          ]
        );

        return { id: result.insertId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create workflow",
          cause: error,
        });
      }
    }),

  // Execute workflow
  execute: publicProcedure
    .input(
      z.object({
        workflowId: z.string(),
        triggerData: z.record(z.any()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Get workflow from database
        const workflow = await ctx.db.query(
          `SELECT * FROM workflows WHERE id = ?`,
          [input.workflowId]
        );

        if (!workflow[0]) {
          throw new Error("Workflow not found");
        }

        // WIRE THIS: Create execution record
        const result = await ctx.db.query(
          `INSERT INTO workflow_executions 
           (workflow_id, trigger_data, status) 
           VALUES (?, ?, 'pending')`,
          [input.workflowId, JSON.stringify(input.triggerData)]
        );

        // WIRE THIS: Queue workflow execution as background job
        // Example: await queue.add('execute-workflow', { executionId: result.insertId, workflow: workflow[0] })

        return { executionId: result.insertId, status: "pending" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to execute workflow",
          cause: error,
        });
      }
    }),

  // List workflows
  list: publicProcedure
    .input(z.object({ accountId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        const result = await ctx.db.query(
          `SELECT * FROM workflows WHERE account_id = ? AND is_active = true`,
          [input.accountId]
        );

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch workflows",
          cause: error,
        });
      }
    }),

  // Get workflow execution status
  getExecutionStatus: publicProcedure
    .input(z.object({ executionId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        const result = await ctx.db.query(
          `SELECT * FROM workflow_executions WHERE id = ?`,
          [input.executionId]
        );

        return result[0] || null;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch execution status",
          cause: error,
        });
      }
    }),
});

// ============================================================================
// 12. PERSISTENT MEMORY ROUTER
// ============================================================================
export const memoryRouter = router({
  // Store memory for lead
  store: publicProcedure
    .input(
      z.object({
        leadId: z.string(),
        accountId: z.string(),
        memoryType: z.enum(["preference", "history", "context", "action_item"]),
        keyName: z.string(),
        value: z.string(),
        source: z.enum(["call", "sms", "email", "manual"]).default("call"),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Insert into database
        const result = await ctx.db.query(
          `INSERT INTO conversation_memory 
           (lead_id, account_id, memory_type, key_name, value, source, expires_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            input.leadId,
            input.accountId,
            input.memoryType,
            input.keyName,
            input.value,
            input.source,
            input.expiresAt,
          ]
        );

        return { id: result.insertId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to store memory",
          cause: error,
        });
      }
    }),

  // Retrieve memory for lead
  retrieve: publicProcedure
    .input(
      z.object({
        leadId: z.string(),
        memoryType: z.enum(["preference", "history", "context", "action_item"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        let query = `SELECT * FROM conversation_memory WHERE lead_id = ? AND (expires_at IS NULL OR expires_at > NOW())`;
        const params: any[] = [input.leadId];

        if (input.memoryType) {
          query += ` AND memory_type = ?`;
          params.push(input.memoryType);
        }

        const result = await ctx.db.query(query, params);
        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve memory",
          cause: error,
        });
      }
    }),

  // Delete memory
  delete: publicProcedure
    .input(z.object({ memoryId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Delete from database
        await ctx.db.query(
          `DELETE FROM conversation_memory WHERE id = ?`,
          [input.memoryId]
        );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete memory",
          cause: error,
        });
      }
    }),
});

// ============================================================================
// 13. SENTIMENT ANALYSIS ROUTER
// ============================================================================
export const sentimentRouter = router({
  // Create sentiment analysis record
  create: publicProcedure
    .input(
      z.object({
        callId: z.string(),
        leadId: z.string().optional(),
        sentiment: z.enum(["very_positive", "positive", "neutral", "negative", "very_negative"]),
        sentimentScore: z.number().min(-1).max(1),
        emotionDetected: z.record(z.number()).optional(),
        keyPhrases: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Insert into database
        const result = await ctx.db.query(
          `INSERT INTO sentiment_analysis 
           (call_id, lead_id, sentiment, sentiment_score, emotion_detected, key_phrases) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            input.callId,
            input.leadId,
            input.sentiment,
            input.sentimentScore,
            JSON.stringify(input.emotionDetected || {}),
            JSON.stringify(input.keyPhrases || []),
          ]
        );

        return { id: result.insertId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create sentiment analysis",
          cause: error,
        });
      }
    }),

  // Get sentiment for call
  get: publicProcedure
    .input(z.object({ callId: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        const result = await ctx.db.query(
          `SELECT * FROM sentiment_analysis WHERE call_id = ?`,
          [input.callId]
        );

        return result[0] || null;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch sentiment analysis",
          cause: error,
        });
      }
    }),

  // Get sentiment trends for lead
  getTrends: publicProcedure
    .input(
      z.object({
        leadId: z.string(),
        days: z.number().default(30),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        const result = await ctx.db.query(
          `SELECT sentiment, sentiment_score, analyzed_at 
           FROM sentiment_analysis 
           WHERE lead_id = ? AND analyzed_at > DATE_SUB(NOW(), INTERVAL ? DAY)
           ORDER BY analyzed_at DESC`,
          [input.leadId, input.days]
        );

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch sentiment trends",
          cause: error,
        });
      }
    }),
});

// ============================================================================
// 14. TICKETING SYSTEM ROUTER
// ============================================================================
export const ticketingRouter = router({
  // Create ticket
  create: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        leadId: z.string().optional(),
        callId: z.string().optional(),
        title: z.string(),
        description: z.string(),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Insert into database
        const result = await ctx.db.query(
          `INSERT INTO support_tickets 
           (account_id, lead_id, call_id, title, description, priority, category, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, 'open')`,
          [
            input.accountId,
            input.leadId,
            input.callId,
            input.title,
            input.description,
            input.priority,
            input.category,
          ]
        );

        return { id: result.insertId, status: "open" };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create ticket",
          cause: error,
        });
      }
    }),

  // Add comment to ticket
  addComment: publicProcedure
    .input(
      z.object({
        ticketId: z.string(),
        authorId: z.string(),
        comment: z.string(),
        isInternal: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Insert into database
        const result = await ctx.db.query(
          `INSERT INTO ticket_comments 
           (ticket_id, author_id, comment, is_internal) 
           VALUES (?, ?, ?, ?)`,
          [input.ticketId, input.authorId, input.comment, input.isInternal]
        );

        return { id: result.insertId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add comment",
          cause: error,
        });
      }
    }),

  // Update ticket status
  updateStatus: publicProcedure
    .input(
      z.object({
        ticketId: z.string(),
        status: z.enum(["open", "in_progress", "waiting_customer", "resolved", "closed"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Update database
        const updateData: any = { status: input.status };

        if (input.status === "resolved") {
          updateData.resolved_at = new Date();
        }

        await ctx.db.query(
          `UPDATE support_tickets SET status = ?, resolved_at = ? WHERE id = ?`,
          [input.status, updateData.resolved_at || null, input.ticketId]
        );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update ticket status",
          cause: error,
        });
      }
    }),

  // List tickets
  list: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        status: z.string().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        let query = `SELECT * FROM support_tickets WHERE account_id = ?`;
        const params: any[] = [input.accountId];

        if (input.status) {
          query += ` AND status = ?`;
          params.push(input.status);
        }

        query += ` ORDER BY created_at DESC LIMIT ?`;
        params.push(input.limit);

        const result = await ctx.db.query(query, params);
        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch tickets",
          cause: error,
        });
      }
    }),
});

// ============================================================================
// 15. MOBILE APP BACKEND ROUTER
// ============================================================================
export const mobileRouter = router({
  // Register device
  registerDevice: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        userId: z.string().optional(),
        deviceToken: z.string(),
        deviceType: z.enum(["ios", "android"]),
        deviceName: z.string().optional(),
        appVersion: z.string(),
        osVersion: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Insert or update device in database
        const result = await ctx.db.query(
          `INSERT INTO mobile_devices 
           (account_id, user_id, device_token, device_type, device_name, app_version, os_version, is_active) 
           VALUES (?, ?, ?, ?, ?, ?, ?, true)
           ON DUPLICATE KEY UPDATE 
           last_seen_at = NOW(), is_active = true`,
          [
            input.accountId,
            input.userId,
            input.deviceToken,
            input.deviceType,
            input.deviceName,
            input.appVersion,
            input.osVersion,
          ]
        );

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to register device",
          cause: error,
        });
      }
    }),

  // Send push notification
  sendNotification: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        deviceId: z.string().optional(),
        title: z.string(),
        body: z.string(),
        data: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Get device token from database
        const device = await ctx.db.query(
          `SELECT device_token, device_type FROM mobile_devices WHERE id = ?`,
          [input.deviceId]
        );

        if (!device[0]) {
          throw new Error("Device not found");
        }

        // WIRE THIS: Send push notification (FCM or APNs)
        // For FCM: await firebase.messaging().send({ token, notification, data })
        // For APNs: await apns.send({ deviceToken, alert, payload })

        // WIRE THIS: Log notification
        const result = await ctx.db.query(
          `INSERT INTO push_notifications 
           (account_id, device_id, title, body, data, status) 
           VALUES (?, ?, ?, ?, ?, 'sent')`,
          [input.accountId, input.deviceId, input.title, input.body, JSON.stringify(input.data || {})]
        );

        return { id: result.insertId, sent: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send notification",
          cause: error,
        });
      }
    }),
});

// ============================================================================
// 16. SOCIAL MEDIA INTEGRATION ROUTER
// ============================================================================
export const socialMediaRouter = router({
  // Connect social platform
  connect: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        platform: z.enum(["instagram", "facebook", "whatsapp", "telegram"]),
        platformAccountId: z.string(),
        accessToken: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Encrypt token before storing
        // const encryptedToken = encrypt(input.accessToken);

        // WIRE THIS: Insert into database
        const result = await ctx.db.query(
          `INSERT INTO social_media_integrations 
           (account_id, platform, platform_account_id, access_token, is_active) 
           VALUES (?, ?, ?, ?, true)`,
          [input.accountId, input.platform, input.platformAccountId, input.accessToken]
        );

        return { id: result.insertId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to connect social platform",
          cause: error,
        });
      }
    }),

  // Send social message
  sendMessage: publicProcedure
    .input(
      z.object({
        integrationId: z.string(),
        recipientId: z.string(),
        messageText: z.string(),
        messageType: z.enum(["text", "image", "video", "file"]).default("text"),
        mediaUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Get integration from database
        const integration = await ctx.db.query(
          `SELECT * FROM social_media_integrations WHERE id = ?`,
          [input.integrationId]
        );

        if (!integration[0]) {
          throw new Error("Integration not found");
        }

        // WIRE THIS: Send message via social platform API
        // This depends on the specific platform (Instagram, Facebook, WhatsApp, Telegram)

        // WIRE THIS: Log message
        const result = await ctx.db.query(
          `INSERT INTO social_messages 
           (integration_id, platform_message_id, sender_id, message_text, message_type, direction, status) 
           VALUES (?, ?, ?, ?, ?, 'outbound', 'sent')`,
          [integration[0].id, "temp_id", integration[0].platform_account_id, input.messageText, input.messageType]
        );

        return { id: result.insertId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send social message",
          cause: error,
        });
      }
    }),

  // Receive social message (webhook)
  receiveMessage: publicProcedure
    .input(
      z.object({
        integrationId: z.string(),
        platformMessageId: z.string(),
        senderId: z.string(),
        senderName: z.string(),
        messageText: z.string(),
        messageType: z.enum(["text", "image", "video", "file"]).default("text"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Log incoming message
        const result = await ctx.db.query(
          `INSERT INTO social_messages 
           (integration_id, platform_message_id, sender_id, sender_name, message_text, message_type, direction, status) 
           VALUES (?, ?, ?, ?, ?, ?, 'inbound', 'received')`,
          [
            input.integrationId,
            input.platformMessageId,
            input.senderId,
            input.senderName,
            input.messageText,
            input.messageType,
          ]
        );

        // WIRE THIS: Create lead if not exists
        // WIRE THIS: Trigger workflows

        return { id: result.insertId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to receive social message",
          cause: error,
        });
      }
    }),
});

// ============================================================================
// 17. EMAIL AUTOMATION ROUTER
// ============================================================================
export const emailRouter = router({
  // Create email template
  createTemplate: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        name: z.string(),
        subject: z.string(),
        body: z.string(),
        variables: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Insert into database
        const result = await ctx.db.query(
          `INSERT INTO email_templates 
           (account_id, name, subject, body, variables, is_active) 
           VALUES (?, ?, ?, ?, ?, true)`,
          [input.accountId, input.name, input.subject, input.body, JSON.stringify(input.variables || [])]
        );

        return { id: result.insertId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create email template",
          cause: error,
        });
      }
    }),

  // Send email
  send: publicProcedure
    .input(
      z.object({
        templateId: z.string(),
        recipientEmail: z.string().email(),
        variables: z.record(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Get template from database
        const template = await ctx.db.query(
          `SELECT * FROM email_templates WHERE id = ?`,
          [input.templateId]
        );

        if (!template[0]) {
          throw new Error("Template not found");
        }

        // WIRE THIS: Replace variables in template
        let subject = template[0].subject;
        let body = template[0].body;

        if (input.variables) {
          for (const [key, value] of Object.entries(input.variables)) {
            subject = subject.replace(`{{${key}}}`, String(value));
            body = body.replace(`{{${key}}}`, String(value));
          }
        }

        // WIRE THIS: Send email via SMTP or email service (SendGrid, Mailgun, etc.)
        // await emailService.send({ to: input.recipientEmail, subject, body });

        // WIRE THIS: Log email
        const result = await ctx.db.query(
          `INSERT INTO email_logs 
           (template_id, recipient_email, subject, status) 
           VALUES (?, ?, ?, 'sent')`,
          [input.templateId, input.recipientEmail, subject]
        );

        return { id: result.insertId, sent: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send email",
          cause: error,
        });
      }
    }),
});

// ============================================================================
// 18. RCS ROUTER
// ============================================================================
export const rcsRouter = router({
  // Send RCS message
  send: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        leadId: z.string().optional(),
        phoneNumber: z.string(),
        messageText: z.string(),
        richContent: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Send RCS message via provider (SignalWire, Twilio, etc.)
        // await signalwire.rcs.send({ to: input.phoneNumber, body: input.messageText, richContent: input.richContent });

        // WIRE THIS: Log message
        const result = await ctx.db.query(
          `INSERT INTO rcs_messages 
           (account_id, lead_id, phone_number, message_text, rich_content, status) 
           VALUES (?, ?, ?, ?, ?, 'sent')`,
          [
            input.accountId,
            input.leadId,
            input.phoneNumber,
            input.messageText,
            JSON.stringify(input.richContent || {}),
          ]
        );

        return { id: result.insertId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send RCS message",
          cause: error,
        });
      }
    }),
});

// ============================================================================
// 19. WEBCHAT ROUTER
// ============================================================================
export const webchatRouter = router({
  // Create conversation
  createConversation: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        visitorId: z.string(),
        visitorName: z.string().optional(),
        visitorEmail: z.string().email().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Insert into database
        const result = await ctx.db.query(
          `INSERT INTO webchat_conversations 
           (account_id, visitor_id, visitor_name, visitor_email, status) 
           VALUES (?, ?, ?, ?, 'active')`,
          [input.accountId, input.visitorId, input.visitorName, input.visitorEmail]
        );

        return { id: result.insertId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create conversation",
          cause: error,
        });
      }
    }),

  // Send message
  sendMessage: publicProcedure
    .input(
      z.object({
        conversationId: z.string(),
        senderType: z.enum(["visitor", "agent", "bot"]),
        senderId: z.string().optional(),
        messageText: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Insert into database
        const result = await ctx.db.query(
          `INSERT INTO webchat_messages 
           (conversation_id, sender_type, sender_id, message_text, message_type) 
           VALUES (?, ?, ?, ?, 'text')`,
          [input.conversationId, input.senderType, input.senderId, input.messageText]
        );

        return { id: result.insertId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send message",
          cause: error,
        });
      }
    }),
});

// ============================================================================
// 20. ANALYTICS ROUTER
// ============================================================================
export const analyticsRouter = router({
  // Log analytics event
  logEvent: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        eventType: z.string(),
        eventData: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Insert into database
        const result = await ctx.db.query(
          `INSERT INTO analytics_events 
           (account_id, event_type, event_data) 
           VALUES (?, ?, ?)`,
          [input.accountId, input.eventType, JSON.stringify(input.eventData || {})]
        );

        return { id: result.insertId };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to log event",
          cause: error,
        });
      }
    }),

  // Get daily summary
  getDailySummary: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        date: z.date(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        const result = await ctx.db.query(
          `SELECT * FROM analytics_daily_summary WHERE account_id = ? AND date = ?`,
          [input.accountId, input.date]
        );

        return result[0] || null;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch daily summary",
          cause: error,
        });
      }
    }),

  // Get analytics report
  getReport: publicProcedure
    .input(
      z.object({
        accountId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // WIRE THIS: Query from database
        const result = await ctx.db.query(
          `SELECT * FROM analytics_daily_summary 
           WHERE account_id = ? AND date BETWEEN ? AND ?
           ORDER BY date DESC`,
          [input.accountId, input.startDate, input.endDate]
        );

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch analytics report",
          cause: error,
        });
      }
    }),
});

// ============================================================================
// Export all routers
// ============================================================================
export const phase2FeaturesRouter = router({
  workflowBuilder: workflowBuilderRouter,
  memory: memoryRouter,
  sentiment: sentimentRouter,
  ticketing: ticketingRouter,
  mobile: mobileRouter,
  socialMedia: socialMediaRouter,
  email: emailRouter,
  rcs: rcsRouter,
  webchat: webchatRouter,
  analytics: analyticsRouter,
});
