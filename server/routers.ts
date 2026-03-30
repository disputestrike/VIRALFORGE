import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { sql } from "drizzle-orm";
// INTEGRATION: Import new services
import * as queueService from "./_core/services/queue";
import * as decisionEngine from "./_core/services/decisionEngine";
import * as twilioService from "./_core/services/signalwireService";
import * as voiceSessionManager from "./_core/services/voiceSessionManager";
import * as followUpEngine from "./_core/services/followUpEngine";
import { saasRouter } from "./routers/saasRouter";

// ─── Admin guard ──────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  return next({ ctx });
});

// ─── Leads Router ─────────────────────────────────────────────────────────────
const leadsRouter = router({
  list: protectedProcedure
    .input(z.object({ search: z.string().optional(), segment: z.string().optional(), status: z.string().optional(), verificationStatus: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => {
      return db.getLeads({ ...(input ?? {}), userId: ctx.user.id });
    }),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const lead = await db.getLeadById(input.id);
    if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
    return lead;
  }),

  create: protectedProcedure
    .input(z.object({
      firstName: z.string().min(1).max(100),
      lastName: z.string().min(1).max(100),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      industry: z.string().optional(),
      title: z.string().optional(),
      linkedinUrl: z.string().optional(),
      website: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      source: z.string().optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const score = calculateLeadScore(input);
      const segment = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
      await db.createLead({ ...input, score, segment, tags: input.tags ? JSON.stringify(input.tags) : undefined , createdBy: ctx.user.id });
      await db.logActivity({ userId: ctx.user.id, entityType: "lead", action: "created", description: `Created lead: ${input.firstName} ${input.lastName}` });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      industry: z.string().optional(),
      title: z.string().optional(),
      score: z.number().optional(),
      segment: z.enum(["hot", "warm", "cold", "unqualified"]).optional(),
      verificationStatus: z.enum(["verified", "unverified", "bounced", "pending"]).optional(),
      status: z.enum(["new", "contacted", "qualified", "converted", "lost"]).optional(),
      notes: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, tags, ...rest } = input;
      await db.updateLead(id, { ...rest, tags: tags ? JSON.stringify(tags) : undefined });
      await db.logActivity({ userId: ctx.user.id, entityType: "lead", entityId: id, action: "updated" });
      return { success: true };
    }),

  // High-speed bulk blast — queue ALL campaign contacts simultaneously
  blast: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      if (campaign.createdBy !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      const contacts = await db.getCampaignContacts(input.campaignId);
      if (!contacts.length) throw new TRPCError({ code: "BAD_REQUEST", message: "No contacts in campaign" });

      const { addCallJob } = await import("./_core/services/queue");
      let queued = 0;
      // Queue ALL simultaneously — BullMQ handles concurrency (50 at a time)
      await Promise.all(contacts.map(async (c) => {
        try {
          const lead = await db.getLeadById(c.leadId);
          if (lead?.phone) {
            await addCallJob({ leadId: lead.id, campaignId: input.campaignId });
            queued++;
          }
        } catch {}
      }));

      await db.updateCampaign(input.campaignId, { status: "active" });
      await db.logActivity({
        userId: ctx.user.id,
        entityType: "campaign",
        entityId: input.campaignId,
        action: "blast",
        description: `High-speed blast: ${queued} calls queued simultaneously`,
      });

      return { success: true, queued, message: `${queued} calls queued simultaneously` };
    }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    await db.deleteLead(input.id);
    await db.logActivity({ userId: ctx.user.id, entityType: "lead", entityId: input.id, action: "deleted" });
    return { success: true };
  }),

  verify: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const lead = await db.getLeadById(input.id);
    if (!lead) throw new TRPCError({ code: "NOT_FOUND" });
    // Simulate verification logic
    const isValid = lead.email && lead.email.includes("@") && !lead.email.includes("test");
    const status = isValid ? "verified" : "unverified";
    const scoreBoost = isValid ? 15 : 0;
    await db.updateLead(input.id, { verificationStatus: status, score: Math.min(100, (lead.score ?? 0) + scoreBoost) });
    await db.logActivity({ userId: ctx.user.id, entityType: "lead", entityId: input.id, action: "verified", description: `Verification status: ${status}` });
    return { success: true, status };
  }),

  aiSearch: protectedProcedure.input(z.object({ query: z.string() })).mutation(async ({ input, ctx }) => {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a lead search assistant. Convert natural language queries into structured search filters. Respond with ONLY a JSON object, no other text: {\"search\":\"string or null\",\"segment\":\"hot|warm|cold|unqualified or null\",\"status\":\"new|contacted|qualified|converted|lost or null\",\"verificationStatus\":\"verified|unverified|bounced|pending or null\"}. Only include values clearly specified in the query." },
        { role: "user", content: input.query },
      ],
      // json_object format handled via system prompt instruction
    });
    try {
      const filters = JSON.parse(response.choices[0].message.content as string);
      const results = await db.getLeads({ search: filters.search || undefined, segment: filters.segment || undefined, status: filters.status || undefined, verificationStatus: filters.verificationStatus || undefined, userId: ctx.user.id });
      return { filters, ...results };
    } catch {
      const results = await db.getLeads({ search: input.query, userId: ctx.user.id });
      return { filters: { search: input.query }, ...results };
    }
  }),

  importBulk: protectedProcedure
    .input(z.array(z.object({ firstName: z.string(), lastName: z.string(), email: z.string().optional(), phone: z.string().optional(), company: z.string().optional(), industry: z.string().optional(), title: z.string().optional() })))
    .mutation(async ({ input, ctx }) => {
      let created = 0;
      for (const lead of input) {
        const score = calculateLeadScore(lead);
        const segment = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
        await db.createLead({ ...lead, score, segment , createdBy: ctx.user.id });
        created++;
      }
      await db.logActivity({ userId: ctx.user.id, entityType: "lead", action: "bulk_import", description: `Imported ${created} leads` });
      return { success: true, created };
    }),
});

// ─── Campaigns Router ─────────────────────────────────────────────────────────
const campaignsRouter = router({
  list: protectedProcedure
    .input(z.object({ status: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => db.getCampaigns({ ...(input ?? {}), userId: ctx.user.id })),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const campaign = await db.getCampaignById(input.id);
    if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
    return campaign;
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      channels: z.array(z.enum(["sms", "email", "voice", "social"])).optional().default([]),
      goal: z.enum(["appointments", "demos", "sales", "awareness", "follow_up"]).default("appointments"),
      industry: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      dailyLimit: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.createCampaign({
        ...input,
        channels: JSON.stringify(input.channels),
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        createdBy: ctx.user.id,
      });
      await db.logActivity({ userId: ctx.user.id, entityType: "campaign", action: "created", description: `Created campaign: ${input.name}` });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      channels: z.array(z.enum(["sms", "email", "voice", "social"])).optional(),
      status: z.enum(["draft", "active", "paused", "completed", "archived"]).optional(),
      goal: z.enum(["appointments", "demos", "sales", "awareness", "follow_up"]).optional(),
      industry: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      dailyLimit: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, channels, startDate, endDate, ...rest } = input;
      await db.updateCampaign(id, {
        ...rest,
        channels: channels ? JSON.stringify(channels) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });
      await db.logActivity({ userId: ctx.user.id, entityType: "campaign", entityId: id, action: "updated" });
      return { success: true };
    }),

  // High-speed bulk blast — queue ALL contacts simultaneously
  blast: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const campaign = await db.getCampaignById(input.campaignId);
      if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
      if (campaign.createdBy !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      const contacts = await db.getCampaignContacts(input.campaignId);
      if (!contacts.length) throw new TRPCError({ code: "BAD_REQUEST", message: "No contacts in campaign" });
      const { addCallJob } = await import("./_core/services/queue");
      let queued = 0;
      await Promise.all(contacts.map(async (c) => {
        try {
          const lead = await db.getLeadById(c.leadId);
          if (lead?.phone) { await addCallJob({ leadId: lead.id, campaignId: input.campaignId }); queued++; }
        } catch {}
      }));
      await db.updateCampaign(input.campaignId, { status: "active" });
      await db.logActivity({ userId: ctx.user.id, entityType: "campaign", entityId: input.campaignId, action: "blast", description: `High-speed blast: ${queued} calls queued simultaneously` });
      return { success: true, queued, message: `${queued} calls queued simultaneously` };
    }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    await db.deleteCampaign(input.id);
    await db.logActivity({ userId: ctx.user.id, entityType: "campaign", entityId: input.id, action: "deleted" });
    return { success: true };
  }),

  getContacts: protectedProcedure.input(z.object({ campaignId: z.number() })).query(async ({ input }) => {
    return db.getCampaignContacts(input.campaignId);
  }),

  addContact: protectedProcedure.input(z.object({ campaignId: z.number(), leadId: z.number() })).mutation(async ({ input, ctx }) => {
    await db.addContactToCampaign(input.campaignId, input.leadId);
    await db.logActivity({ userId: ctx.user.id, entityType: "campaign", entityId: input.campaignId, action: "contact_added" });
    return { success: true };
  }),

  removeContact: protectedProcedure.input(z.object({ campaignId: z.number(), leadId: z.number() })).mutation(async ({ input, ctx }) => {
    await db.removeContactFromCampaign(input.campaignId, input.leadId);
    await db.logActivity({ userId: ctx.user.id, entityType: "campaign", entityId: input.campaignId, action: "contact_removed" });
    return { success: true };
  }),

  launch: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const campaign = await db.getCampaignById(input.id);
    if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
    await db.updateCampaign(input.id, { status: "active", startDate: new Date() });
    await db.logActivity({ userId: ctx.user.id, entityType: "campaign", entityId: input.id, action: "launched", description: `Launched campaign: ${campaign.name}` });
    return { success: true };
  }),

  pause: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    await db.updateCampaign(input.id, { status: "paused" });
    await db.logActivity({ userId: ctx.user.id, entityType: "campaign", entityId: input.id, action: "paused" });
    return { success: true };
  }),
});

// ─── Messages Router ──────────────────────────────────────────────────────────
const messagesRouter = router({
  list: protectedProcedure
    .input(z.object({ campaignId: z.number().optional(), leadId: z.number().optional(), channel: z.string().optional(), limit: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => db.getMessages({ ...(input ?? {}), userId: ctx.user.id })),

  send: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      campaignId: z.number().optional(),
      channel: z.enum(["sms", "email", "voice", "social"]),
      subject: z.string().optional(),
      body: z.string(),
      templateId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const lead = await db.getLeadById(input.leadId);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });

      // Write message record as queued
      const msgResult = await db.createMessage({ ...input, status: "queued" , createdBy: ctx.user.id });
      const msgId = msgResult.insertId;

      let deliveryStatus = "queued";

      // Actually dispatch via Twilio/Resend
      if (input.channel === "sms" && lead.phone) {
        try {
          const { sendSMS } = await import("./_core/services/signalwireService");
          await sendSMS({ to: lead.phone, body: input.body });
          await db.updateMessageStatus(msgId, "sent", { sentAt: new Date(), deliveredAt: new Date() });
          deliveryStatus = "sent";
        } catch (smsErr) {
          console.error("[messages.send] SMS failed:", smsErr);
          await db.updateMessageStatus(msgId, "failed");
          deliveryStatus = "failed";
        }
      } else if (input.channel === "email" && lead.email) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: `${process.env.RESEND_FROM_NAME || "ApexAI"} <${process.env.RESEND_FROM_EMAIL || "noreply@apexai.com"}>`,
            to: lead.email,
            subject: input.subject || "Message from ApexAI",
            text: input.body,
          });
          await db.updateMessageStatus(msgId, "sent", { sentAt: new Date() });
          deliveryStatus = "sent";
        } catch (emailErr) {
          console.error("[messages.send] Email failed:", emailErr);
          await db.updateMessageStatus(msgId, "failed");
          deliveryStatus = "failed";
        }
      } else {
        // Social or no contact info — mark sent (logged only)
        await db.updateMessageStatus(msgId, "sent", { sentAt: new Date() });
        deliveryStatus = "sent";
      }

      if (input.campaignId) {
        await db.updateCampaign(input.campaignId, { sentCount: db_sql_increment("sentCount") as unknown as number });
      }
      await db.logActivity({ userId: ctx.user.id, entityType: "message", action: "sent", description: `Sent ${input.channel} to ${lead.firstName} ${lead.lastName}: ${deliveryStatus}` });
      return { success: true, status: deliveryStatus };
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["queued", "sent", "delivered", "read", "replied", "failed", "bounced"]) }))
    .mutation(async ({ input, ctx }) => {
      await db.updateMessageStatus(input.id, input.status);
      await db.logActivity({ userId: ctx.user.id, entityType: "message", entityId: input.id, action: "status_updated", description: `Updated message status to ${input.status}` });
      return { success: true };
    }),

  getCallRecordings: protectedProcedure
    .input(z.object({ campaignId: z.number().optional(), leadId: z.number().optional(), limit: z.number().optional() }).optional())
    .query(async ({ input, ctx }) => db.getCallRecordings({ ...(input ?? {}), userId: ctx.user.id })),

  clearTestRecordings: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const database = await db.getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Delete call recordings with no real callSid (test/junk data)
      // These have outcome=no_answer and were created by the persistence interval bug
      await (database as any).execute(
        "DELETE FROM call_recordings WHERE outcome = 'no_answer' AND recordingUrl IS NULL AND transcript IS NULL AND (aiSummary IS NULL OR aiSummary = '') AND duration > 30000"
      );
      console.log(`[Admin] Cleared test call recordings`);
      return { success: true };
    }),
  bulkSend: protectedProcedure
    .input(z.object({
      campaignId: z.number(),
      channel: z.enum(["sms", "email", "social"]),
      subject: z.string().optional(),
      body: z.string(),
      templateId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const contacts = await db.getCampaignContacts(input.campaignId);
      if (!contacts.length) throw new TRPCError({ code: "BAD_REQUEST", message: "No contacts assigned to this campaign" });
      let sent = 0;
      for (const contact of contacts) {
        const lead = await db.getLeadById(contact.leadId);
        if (!lead) continue;
        // Personalize body with lead data
        const personalizedBody = input.body
          .replace(/\{\{firstName\}\}/g, lead.firstName ?? "")
          .replace(/\{\{lastName\}\}/g, lead.lastName ?? "")
          .replace(/\{\{company\}\}/g, lead.company ?? "")
          .replace(/\{\{industry\}\}/g, lead.industry ?? "");
        const personalizedSubject = input.subject
          ? input.subject.replace(/\{\{firstName\}\}/g, lead.firstName ?? "").replace(/\{\{company\}\}/g, lead.company ?? "")
          : undefined;
        const msgResult = await db.createMessage({
          leadId: contact.leadId,
          campaignId: input.campaignId,
          channel: input.channel,
          subject: personalizedSubject,
          body: personalizedBody,
          templateId: input.templateId,
          status: "queued",
        createdBy: ctx.user.id });

        // Queue real delivery with explicit job ID logging for proof
        if (input.channel === "sms" && lead.phone) {
          const smsJob = await queueService.addSmsJob({
            leadId: lead.id,
            phone: lead.phone,
            type: "follow_up",
            leadName: `${lead.firstName} ${lead.lastName}`,
            msgId: msgResult.insertId,
          });
          console.log(`[BulkSend] SMS job created → jobId: ${smsJob.jobId} | status: ${smsJob.status} | leadId: ${lead.id} | msgId: ${msgResult.insertId}`);
        } else if (input.channel === "email" && lead.email) {
          const emailJob = await queueService.addEmailJob({
            leadId: lead.id,
            email: lead.email,
            type: "follow_up",
            leadName: `${lead.firstName} ${lead.lastName}`,
            msgId: msgResult.insertId,
          });
          console.log(`[BulkSend] Email job created → jobId: ${emailJob.jobId} | status: ${emailJob.status} | leadId: ${lead.id} | msgId: ${msgResult.insertId}`);
        }
        sent++;
      }
      await db.updateCampaign(input.campaignId, { sentCount: db_sql_increment("sentCount") as unknown as number });
      await db.logActivity({ userId: ctx.user.id, entityType: "campaign", entityId: input.campaignId, action: "bulk_sent", description: `Bulk sent ${input.channel} to ${sent} contacts` });
      return { success: true, sent };
    }),
  aiCompose: protectedProcedure
    .input(z.object({
      channel: z.enum(["sms", "email", "social"]),
      prompt: z.string(),
      industry: z.string().optional(),
      leadName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const channelGuide = input.channel === "sms"
        ? "Write a concise SMS under 160 characters. No subject needed."
        : input.channel === "email"
        ? "Write a professional email with a subject line and body. Format as: SUBJECT: ...\nBODY: ..."
        : "Write a friendly social media outreach message.";
      const response = await invokeLLM({
        messages: [
          { role: "system", content: `You are an expert sales copywriter specializing in outbound ${input.channel} messages. ${channelGuide} Make it personalized, compelling, and action-oriented. Industry: ${input.industry ?? "general business"}.` },
          { role: "user", content: input.prompt },
        ],
      });
      const content = response.choices[0].message.content as string;
      if (input.channel === "email" && content.includes("SUBJECT:")) {
        const lines = content.split("\n");
        const subjectLine = lines.find((l: string) => l.startsWith("SUBJECT:"));
        const bodyStart = lines.findIndex((l: string) => l.startsWith("BODY:"));
        const subject = subjectLine ? subjectLine.replace("SUBJECT:", "").trim() : "";
        const body = bodyStart >= 0 ? lines.slice(bodyStart + 1).join("\n").trim() : content;
        return { subject, body };
      }
      return { subject: "", body: content };
    }),
});
// ─── Voice AI Router ───────────────────────────────────────────────────────────
const voiceAIRouter = router({
  initiateCall: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      campaignId: z.number().optional(),
      script: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const lead = await db.getLeadById(input.leadId);
      if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      if (!lead.phone) throw new TRPCError({ code: "BAD_REQUEST", message: "Lead does not have a phone number" });

      try {
        // INTEGRATION: Evaluate if lead is ready to call using Decision Engine
        const decision = await decisionEngine.decideLeadAction(lead);

        // If decision is not to call now, return decision
        const decisionAction = (decision as any)?.action || 'DEAD';
        if (decisionAction !== 'CALL_NOW' && decisionAction !== 'RETRY_CALL') {
          console.log(`[voiceAI] Lead ${lead.id} decision: ${decisionAction} - not calling now`);
          return {
            success: false,
            reason: decisionAction,
            message: `Lead not ready to call: ${decisionAction}`,
          };
        }

        // INTEGRATION: Queue the call job (asynchronous)
        const callJob = await queueService.addCallJob({
          leadId: input.leadId,
          campaignId: input.campaignId,
          script: input.script,
        });

        const jobId = (callJob as any)?.jobId || `job_${Date.now()}`;
        console.log(`[voiceAI] Call queued for lead ${lead.id}, job ID: ${jobId}`);

        // INTEGRATION: Log activity
        await db.logActivity({
          userId: ctx.user.id,
          entityType: "call",
          entityId: lead.id,
          action: "queued",
          description: `Call queued for ${lead.firstName} ${lead.lastName} (Job: ${jobId})`,
        });

        return {
          success: true,
          jobId: jobId,
          message: `Call queued for ${lead.firstName} ${lead.lastName}`,
          decision,
          outcome: 'call_queued',
          scheduled: false,
          transcript: '',
          duration: 0,
        };
      } catch (error) {
        console.error('[voiceAI] Error queuing call:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to queue call: ${(error as Error).message}`,
        });
      }
    }),

  agentChat: protectedProcedure
    .input(z.object({
      messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
      pageContext: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Pull real live data to ground the agent in actual account state
      const [leadsResult, campaignsResult, apptStats, recentActivity] = await Promise.allSettled([
        db.getLeads({ limit: 1 }),
        db.getCampaigns({ limit: 100 }),
        db.getAppointments({ upcoming: true }),
        db.getActivityLogs(5),
      ]);

      const leads = leadsResult.status === "fulfilled" ? leadsResult.value : { total: 0, leads: [] };
      const campaigns = campaignsResult.status === "fulfilled" ? campaignsResult.value : { total: 0, campaigns: [] };
      const upcoming = apptStats.status === "fulfilled" ? apptStats.value : [];
      const activity = recentActivity.status === "fulfilled" ? recentActivity.value : [];

      // Feature flags from env
      const features = {
        voice: !!(process.env.SIGNALWIRE_PROJECT_ID && process.env.SIGNALWIRE_TOKEN),
        sms: !!(process.env.SIGNALWIRE_PROJECT_ID && process.env.SIGNALWIRE_TOKEN),
        email: !!(process.env.RESEND_API_KEY),
        stt: !!(process.env.OPENAI_API_KEY),
        tts: !!(process.env.ELEVENLABS_API_KEY || process.env.CARTESIA_API_KEY),
        ai: !!(process.env.ANTHROPIC_API_KEY),
        gcal: !!(process.env.VITE_GCAL_BOOKING_URL),
      };

      const systemPrompt = `You are the ApexAI built-in assistant. You have REAL access to this user's account data right now.

USER: ${ctx.user.name ?? ctx.user.email ?? "User"} (${ctx.user.email})
PAGE: ${input.pageContext ?? "app"}

LIVE ACCOUNT DATA:
- Total leads: ${(leads as any).total ?? 0}
- Active campaigns: ${(campaigns as any).campaigns?.filter((c: any) => c.status === "active").length ?? 0} of ${(campaigns as any).total ?? 0} total
- Upcoming appointments: ${upcoming.length}
- Recent activity: ${(activity as any[]).slice(0, 3).map((a: any) => a.description).join(" | ") || "none"}

FEATURE STATUS (what's enabled right now):
${features.ai ? "✅ AI/Script generation — working" : "❌ AI — add ANTHROPIC_API_KEY"}
${features.stt ? "✅ Voice transcription (Whisper) — working" : "❌ STT — add OPENAI_API_KEY"}
${features.voice ? "✅ Outbound calls — working" : "❌ Calls — add SIGNALWIRE_PROJECT_ID, SIGNALWIRE_TOKEN, SIGNALWIRE_SPACE_URL, SIGNALWIRE_PHONE_NUMBER"}
${features.sms ? "✅ SMS — working" : "❌ SMS — add SIGNALWIRE_PROJECT_ID, SIGNALWIRE_TOKEN, SIGNALWIRE_PHONE_NUMBER"}
${features.email ? "✅ Email — working" : "❌ Email — add RESEND_API_KEY"}
${features.tts ? "✅ AI Voice — working" : "❌ AI Voice — add ELEVENLABS_API_KEY or CARTESIA_API_KEY"}
${features.gcal ? "✅ Google Calendar booking — working" : "❌ Google Calendar — add VITE_GCAL_BOOKING_URL"}

HOW APEXAI WORKS:
- Leads flow: new → contacted → qualified → converted
- AI calls need: SignalWire (dial/stream) + ElevenLabs or Cartesia (speak) + OpenAI Whisper (transcribe) + Anthropic (respond)
- Appointments are auto-booked when AI detects prospect agreeing to a time during a call
- Bulk send queues SMS/email jobs via BullMQ/Redis — processes even without Twilio (fails gracefully with reason)
- Script generator uses Anthropic to write personalized scripts per industry
- All provider keys go in Railway → ApexAI → Variables tab

YOUR JOB:
- Answer questions about this specific account using the real data above
- Tell them exactly which Railway variable to add when something isn't working
- Be direct and specific — no vague answers
- If asked about a number (leads, appointments, campaigns), use the real numbers above
- Keep responses under 150 words unless they need more detail`;

      const response = await invokeLLM({
        messages: input.messages,
        systemPrompt,
        maxTokens: 1024,
      });
      return { reply: response.choices[0].message.content as string };
    }),

  getValuePropSuggestions: protectedProcedure
    .input(z.object({ industry: z.string(), prompt: z.string() }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "You are a sales expert. Return ONLY a JSON array of 6 short, punchy value proposition strings. No explanation, no markdown, just the JSON array. Each string should be under 15 words and highly specific to the industry.",
          },
          {
            role: "user",
            content: `Industry: ${input.industry}. ${input.prompt} Return 6 value propositions as a JSON array of strings.`,
          },
        ],
      });
      try {
        const text = response.choices[0].message.content as string;
        const clean = text.replace(/```json|```/g, "").trim();
        const suggestions = JSON.parse(clean);
        return { suggestions: Array.isArray(suggestions) ? suggestions : [] };
      } catch {
        return { suggestions: [] };
      }
    }),

  generateScript: protectedProcedure
    .input(z.object({
      industry: z.string(),
      goal: z.string(),
      tone: z.string().optional(),
      companyName: z.string().optional(),
      callerName: z.string().optional(),
      stateOrCity: z.string().optional(),
      phoneNumber: z.string().optional(),
      productDescription: z.string().optional(),
      valuePropositions: z.string().optional(),
      objectionStyle: z.enum(["soft", "direct", "empathetic", "data-driven"]).optional(),
      callObjective: z.enum(["appointment", "qualification", "follow-up", "re-engagement"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const callerName = input.callerName || "Alex";
      const companyName = input.companyName || "our company";
      const stateOrCity = input.stateOrCity || "your area";
      const tone = input.tone || "professional and friendly";
      const callObjective = input.callObjective || "appointment";
      const objectionStyle = input.objectionStyle || "empathetic";
      const productDesc = input.productDescription ? `Product/Service: ${input.productDescription}.` : "";
      const valueProps = input.valuePropositions ? `Key value propositions: ${input.valuePropositions}.` : "";

      const systemPrompt = `You are an expert sales script writer specializing in AI voice call scripts. 
Create a complete, fully personalized, human-sounding call script with NO placeholder brackets like [Name] or [Company]. 
Use the exact names and details provided. The script should sound natural, conversational, and human — not robotic.
Format the script with clear sections: Opening, Value Proposition, Qualification Questions, Objection Handling, and Closing/Appointment Setting.
Each section should have the AI caller's exact words to say.`;

      const userPrompt = `Write a complete AI voice call script with these exact details:
- AI Caller Name: ${callerName} (this is the name the AI will say when introducing itself)
- Company Name: ${companyName} (use this exact company name throughout the script)
- Industry: ${input.industry}
- Target Location: ${stateOrCity}
- Call Goal: ${callObjective === "appointment" ? "Book an appointment/consultation" : callObjective === "qualification" ? "Qualify the lead" : callObjective === "follow-up" ? "Follow up on previous contact" : "Re-engage a cold lead"}
- Tone: ${tone}
- Objection Handling Style: ${objectionStyle}
${productDesc}
${valueProps}

IMPORTANT: 
1. Use "${callerName}" as the caller name throughout — never write [AI Name] or [Caller Name]
2. Use "${companyName}" as the company name — never write [Company Name]
3. Reference "${stateOrCity}" when mentioning location — never write [Location]
4. Write the prospect's name as "[Prospect Name]" ONLY (this is the one placeholder allowed — it gets replaced per call)
5. Make it sound completely human and natural
6. Include specific objection responses for the ${input.industry} industry
7. End with a clear appointment booking close`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      return { script: response.choices[0].message.content as string };
    }),
});

// ─── Templates Router ─────────────────────────────────────────────────────────
const templatesRouter = router({
  list: protectedProcedure
    .input(z.object({ channel: z.string().optional() }).optional())
    .query(async ({ input }) => db.getTemplates(input?.channel)),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      channel: z.enum(["sms", "email", "voice", "social"]),
      subject: z.string().optional(),
      body: z.string().min(1),
      variables: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.createTemplate({ ...input, variables: input.variables ? JSON.stringify(input.variables) : undefined, createdBy: ctx.user.id });
      await db.logActivity({ userId: ctx.user.id, entityType: "template", action: "created", description: `Created ${input.channel} template: ${input.name}` });
      return { success: true };
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), name: z.string().optional(), subject: z.string().optional(), body: z.string().optional(), variables: z.array(z.string()).optional() }))
    .mutation(async ({ input, ctx }) => {
      const { id, variables, ...rest } = input;
      await db.updateTemplate(id, { ...rest, variables: variables ? JSON.stringify(variables) : undefined });
      await db.logActivity({ userId: ctx.user.id, entityType: "template", entityId: id, action: "updated" });
      return { success: true };
    }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    await db.deleteTemplate(input.id);
    await db.logActivity({ userId: ctx.user.id, entityType: "template", entityId: input.id, action: "deleted" });
    return { success: true };
  }),

  generateWithAI: protectedProcedure
    .input(z.object({ channel: z.enum(["sms", "email", "voice", "social"]), industry: z.string(), goal: z.string(), tone: z.string().optional() }))
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: `You are an expert copywriter specializing in ${input.channel} outreach for sales. Create high-converting, personalized message templates.` },
          { role: "user", content: `Create a ${input.channel} template for ${input.industry} industry. Goal: ${input.goal}. Tone: ${input.tone ?? "professional"}. Use {{firstName}}, {{company}}, {{industry}} as personalization variables. ${input.channel === "email" ? "Include subject line." : ""}` },
        ],
      });
      return { content: response.choices[0].message.content as string };
    }),
});

// ─── Analytics Router ─────────────────────────────────────────────────────────
const analyticsRouter = router({
  globalMetrics: protectedProcedure.query(async ({ ctx }) => db.getGlobalMetrics(ctx.user.id)),

  snapshots: protectedProcedure
    .input(z.object({ campaignId: z.number().optional(), channel: z.string().optional(), limit: z.number().optional() }).optional())
    .query(async ({ input }) => db.getAnalyticsSnapshots(input ?? {})),

  campaignFunnel: protectedProcedure.input(z.object({ campaignId: z.number() })).query(async ({ input }) => {
    const campaign = await db.getCampaignById(input.campaignId);
    if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
    const total = campaign.totalContacts ?? 0;
    const sent = campaign.sentCount ?? 0;
    const responses = campaign.responseCount ?? 0;
    const scheduled = campaign.scheduledCount ?? 0;
    const showed = campaign.showCount ?? 0;
    const converted = campaign.convertedCount ?? 0;
    return {
      campaign,
      funnel: [
        { stage: "Total Contacts", count: total, rate: 100 },
        { stage: "Sent", count: sent, rate: total > 0 ? Math.round((sent / total) * 100) : 0 },
        { stage: "Responded", count: responses, rate: sent > 0 ? Math.round((responses / sent) * 100) : 0 },
        { stage: "Scheduled", count: scheduled, rate: responses > 0 ? Math.round((scheduled / responses) * 100) : 0 },
        { stage: "Showed", count: showed, rate: scheduled > 0 ? Math.round((showed / scheduled) * 100) : 0 },
        { stage: "Converted", count: converted, rate: showed > 0 ? Math.round((converted / showed) * 100) : 0 },
      ],
      roi: campaign.revenueGenerated && campaign.totalContacts ? Math.round(((campaign.revenueGenerated - campaign.totalContacts * 5) / (campaign.totalContacts * 5)) * 100) : 0,
    };
  }),

  recordSnapshot: protectedProcedure
    .input(z.object({ campaignId: z.number().optional(), channel: z.enum(["sms", "email", "voice", "social", "all"]).optional() }))
    .mutation(async ({ input, ctx }) => {
      const metrics = await db.getGlobalMetrics(ctx.user.id);
      await db.createAnalyticsSnapshot({
        campaignId: input.campaignId,
        channel: input.channel ?? "all",
        totalContacts: metrics.totalLeads,
        responseRate: metrics.responseRate,
        scheduleRate: metrics.scheduleRate,
        showRate: metrics.showRate,
        conversionRate: metrics.salesIncrease,
        revenueGenerated: metrics.totalRevenue,
      });
      return { success: true };
    }),
});

// ─── Testimonials Router ──────────────────────────────────────────────────────
const testimonialsRouter = router({
  list: publicProcedure.input(z.object({ featuredOnly: z.boolean().optional() }).optional()).query(async ({ input }) => db.getTestimonials(input?.featuredOnly)),

  create: adminProcedure
    .input(z.object({
      clientName: z.string().min(1),
      industry: z.string().min(1),
      company: z.string().optional(),
      quote: z.string().min(1),
      beforeMetric: z.string().optional(),
      afterMetric: z.string().optional(),
      specificResult: z.string().optional(),
      resultValue: z.string().optional(),
      featured: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      await db.createTestimonial(input);
      return { success: true };
    }),

  update: adminProcedure
    .input(z.object({ id: z.number(), clientName: z.string().optional(), industry: z.string().optional(), quote: z.string().optional(), beforeMetric: z.string().optional(), afterMetric: z.string().optional(), specificResult: z.string().optional(), resultValue: z.string().optional(), featured: z.boolean().optional(), isActive: z.boolean().optional() }))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      await db.updateTestimonial(id, rest);
      return { success: true };
    }),

  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.deleteTestimonial(input.id);
    return { success: true };
  }),
});

// ─── Onboarding Router ────────────────────────────────────────────────────────
const onboardingRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const isAdmin = ctx.user.role === "admin";
    return db.getOnboardings(isAdmin ? undefined : ctx.user.id);
  }),

  create: protectedProcedure
    .input(z.object({
      clientName: z.string().min(1),
      industry: z.string().optional(),
      specialistName: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const setupDay = new Date();
      const supportEndDate = new Date(setupDay.getTime() + 30 * 24 * 60 * 60 * 1000);
      await db.createOnboarding({ ...input, userId: ctx.user.id, setupDay, supportEndDate, status: "in_progress" });
      await db.logActivity({ userId: ctx.user.id, entityType: "onboarding", action: "created", description: `Started onboarding for ${input.clientName}` });
      return { success: true };
    }),

  updateStep: protectedProcedure
    .input(z.object({ id: z.number(), step: z.string(), completed: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const onboarding = await db.getOnboardings(ctx.user.id);
      const record = onboarding.find((o) => o.id === input.id);
      if (!record) throw new TRPCError({ code: "NOT_FOUND" });
      const steps: string[] = (() => { try { const p = JSON.parse(record.completedSteps ?? "[]"); return Array.isArray(p) ? p : []; } catch { return []; } })();
      const updatedSet = input.completed ? Array.from(new Set([...steps, input.step])) : steps.filter((s) => s !== input.step);
      const updated = updatedSet;
      const allSteps = ["account_setup", "industry_select", "phone_provision", "campaign_config", "lead_import", "template_setup", "test_campaign", "go_live"];
      const status = updated.length >= allSteps.length ? "completed" : updated.length > 0 ? "in_progress" : "not_started";
      await db.updateOnboarding(input.id, { completedSteps: JSON.stringify(updated), status });
      return { success: true, completedSteps: updated, status };
    }),

  // Provision a phone number for the user during onboarding
  provisionNumber: protectedProcedure
    .input(z.object({
      areaCode: z.string().length(3).optional(),
      industry: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { RestClient } = require("@signalwire/compatibility-api");
        const client = RestClient(
          process.env.SIGNALWIRE_PROJECT_ID!,
          process.env.SIGNALWIRE_TOKEN!,
          { signalwireSpaceUrl: process.env.SIGNALWIRE_SPACE_URL! }
        );

        // Search for available numbers
        const searchOpts: Record<string, unknown> = { limit: 1 };
        if (input.areaCode) searchOpts.areaCode = input.areaCode;

        const available = await client.availablePhoneNumbers("US").local.list(searchOpts);
        if (!available.length) {
          // Fallback: search without area code
          const fallback = await client.availablePhoneNumbers("US").local.list({ limit: 1 });
          if (!fallback.length) throw new Error("No numbers available");
          available.push(fallback[0]);
        }

        const numberToBuy = available[0].phoneNumber;
        const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
          ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
          : "https://apexai-production-d567.up.railway.app";

        // Purchase the number
        const purchased = await client.incomingPhoneNumbers.create({
          phoneNumber: numberToBuy,
          voiceUrl: `${baseUrl}/api/voice/start`,
          voiceMethod: "POST",
          smsUrl: `${baseUrl}/api/sms/inbound`,
          smsMethod: "POST",
          friendlyName: `ApexAI - ${ctx.user.name || ctx.user.email}`,
        });

        // Save to user record
        await db.logActivity({
          userId: ctx.user.id,
          entityType: "phone_number",
          action: "provisioned",
          description: `Provisioned number ${numberToBuy} for user ${ctx.user.id}`,
          metadata: { phoneNumber: numberToBuy, sid: purchased.sid, industry: input.industry }
        });

        console.log(`[Onboarding] Provisioned ${numberToBuy} for user ${ctx.user.id}`);
        return {
          success: true,
          phoneNumber: numberToBuy,
          formattedNumber: numberToBuy.replace(/(\+1)(\d{3})(\d{3})(\d{4})/, "($2) $3-$4"),
          sid: purchased.sid,
        };
      } catch (err: any) {
        console.error("[Onboarding] Number provisioning failed:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Could not provision phone number: ${err.message}`,
        });
      }
    }),
});

// ─── Admin Router ─────────────────────────────────────────────────────────────
const adminRouter = router({
  users: adminProcedure.query(async () => db.getAllUsers()),

  updateUserRole: adminProcedure
    .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
    .mutation(async ({ input, ctx }) => {
      await db.updateUserRole(input.userId, input.role);
      await db.logActivity({ userId: ctx.user.id, entityType: "user", entityId: input.userId, action: "role_updated", description: `Role changed to ${input.role}` });
      return { success: true };
    }),

  activityLogs: adminProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(async ({ input }) => db.getActivityLogs(input?.limit ?? 50)),

  systemStats: adminProcedure.query(async () => {
    const [metrics, users, campaigns, leads] = await Promise.all([
      db.getGlobalMetrics(),
      db.getAllUsers(),
      db.getCampaigns(),
      db.getLeads({ limit: 1 }),
    ]);
    return {
      metrics,
      totalUsers: users.length,
      adminUsers: users.filter((u) => u.role === "admin").length,
      totalCampaigns: campaigns.total,
      totalLeads: leads.total,
    };
  }),
  getConfig: adminProcedure.query(async () => db.getSystemConfig()),
  setConfig: adminProcedure
    .input(z.object({ key: z.string(), value: z.string(), category: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      await db.setSystemConfig(input.key, input.value, input.category);
      await db.logActivity({ userId: ctx.user.id, entityType: "config", action: "config_updated", description: `${input.key} set to ${input.value}` });
      return { success: true };
    }),
});

// INTEGRATION: Import webhooks router
import { webhooksRouter } from "./routers/webhooksRouter";

// ─── App Router ───────────────────────────────────────────────────────────────
const appointmentsRouter = router({
  list: protectedProcedure
    .input(z.object({
      leadId: z.number().optional(),
      status: z.string().optional(),
      upcoming: z.boolean().optional(),
    }).optional())
    .query(async ({ input, ctx }) => db.getAppointments({ ...(input ?? {}), userId: ctx.user.id })),

  create: protectedProcedure
    .input(z.object({
      leadId: z.number(),
      scheduledTime: z.string(),
      duration: z.number().optional(),
      notes: z.string().optional(),
      timezone: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await db.createManualAppointment({
        leadId: input.leadId,
        scheduledTime: new Date(input.scheduledTime),
        duration: input.duration,
        notes: input.notes,
        timezone: input.timezone,
      });
      await db.logActivity({
        userId: ctx.user.id,
        entityType: "appointment",
        entityId: result.insertId,
        action: "created",
        description: `Manual appointment created for lead ${input.leadId}`,
      });
      return { success: true, insertId: result.insertId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      confirmationStatus: z.enum(["proposed", "confirmed", "declined", "cancelled", "completed"]).optional(),
      showStatus: z.enum(["pending", "showed", "no_show", "rescheduled"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await db.updateAppointment(input.id, {
        confirmationStatus: input.confirmationStatus,
        showStatus: input.showStatus,
        notes: input.notes,
      });
      return { success: true };
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const all = await db.getAppointments({ userId: ctx.user.id });
    const upcoming = await db.getAppointments({ upcoming: true, userId: ctx.user.id });
    const showed = (all as any[]).filter((a) => a.showStatus === "showed").length;
    const noShow = (all as any[]).filter((a) => a.showStatus === "no_show").length;
    const showRate = showed + noShow > 0 ? Math.round((showed / (showed + noShow)) * 100) : 0;
    return { total: all.length, upcoming: upcoming.length, showed, noShow, showRate };
  }),
});



// ─── User Settings Router ─────────────────────────────────────────────────────
const settingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const db_mod = await import("./db");
    const { getUserVoiceSettings } = await import("./_core/services/voiceProfiles");
    const [user] = await (await db_mod.getDb() as any)
      .select()
      .from((await import("../drizzle/schema")).users)
      .where((await import("drizzle-orm")).eq((await import("../drizzle/schema")).users.id, ctx.user.id))
      .limit(1);
    const voiceSettings = await getUserVoiceSettings(ctx.user.id);
    return { ...(user ?? ctx.user), ...voiceSettings };
  }),

  voiceProfiles: protectedProcedure.query(async () => {
    const { listVoiceProfiles } = await import("./_core/services/voiceProfiles");
    return listVoiceProfiles();
  }),

  update: protectedProcedure
    .input(z.object({
      transferNumber: z.string().optional(),
      language: z.enum(["en","es","fr","de","pt","it","nl","pl","ru","zh","ja","ko"]).optional(),
      plan: z.string().optional(),
      agencyName: z.string().optional(),
      voiceProfileId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db_mod = await import("./db");
      const drizzle_orm = await import("drizzle-orm");
      const schema = await import("../drizzle/schema");
      const { setUserVoiceProfileId } = await import("./_core/services/voiceProfiles");
      const db_inst = await db_mod.getDb();
      if (!db_inst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const { voiceProfileId, ...userInput } = input;

      await (db_inst as any).update(schema.users)
        .set({ ...userInput, updatedAt: new Date() })
        .where(drizzle_orm.eq(schema.users.id, ctx.user.id));

      if (voiceProfileId) {
        await setUserVoiceProfileId(ctx.user.id, voiceProfileId);
      }

      await db_mod.logActivity({
        userId: ctx.user.id,
        entityType: "user_settings",
        action: "updated",
        description: `Settings updated: ${JSON.stringify(input)}`,
      });
      return { success: true };
    }),
});



// ─── Agency Router ────────────────────────────────────────────────────────────
const agencyRouter = router({
  // List all clients under this agency
  listClients: protectedProcedure.query(async ({ ctx }) => {
    const db_inst = await db.getDb();
    if (!db_inst) return [];
    const { agencyClients } = await import("../drizzle/schema");
    const { eq, desc } = await import("drizzle-orm");
    return (db_inst as any).select().from(agencyClients)
      .where(eq(agencyClients.agencyUserId, ctx.user.id))
      .orderBy(desc(agencyClients.createdAt));
  }),

  // Add a new client
  addClient: protectedProcedure
    .input(z.object({
      clientName: z.string().min(1),
      clientEmail: z.string().email().optional(),
      clientPhone: z.string().optional(),
      businessName: z.string().optional(),
      industry: z.string().optional(),
      plan: z.string().optional().default("starter"),
      monthlyRate: z.number().optional().default(149),
      minutesIncluded: z.number().optional().default(500),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db_inst = await db.getDb();
      if (!db_inst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { agencyClients } = await import("../drizzle/schema");

      await (db_inst as any).insert(agencyClients).values({
        agencyUserId: ctx.user.id,
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        clientPhone: input.clientPhone,
        businessName: input.businessName,
        industry: input.industry,
        plan: input.plan,
        monthlyRate: input.monthlyRate,
        minutesIncluded: input.minutesIncluded,
        notes: input.notes,
        status: "active",
      });

      await db.logActivity({
        userId: ctx.user.id,
        entityType: "agency_client",
        action: "added",
        description: `Added agency client: ${input.clientName}`,
      });

      return { success: true };
    }),

  // Update client
  updateClient: protectedProcedure
    .input(z.object({
      id: z.number(),
      clientName: z.string().optional(),
      clientEmail: z.string().optional(),
      businessName: z.string().optional(),
      industry: z.string().optional(),
      plan: z.string().optional(),
      status: z.enum(["active","paused","cancelled","pending"]).optional(),
      monthlyRate: z.number().optional(),
      minutesIncluded: z.number().optional(),
      transferNumber: z.string().optional(),
      language: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db_inst = await db.getDb();
      if (!db_inst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { agencyClients } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const { id, ...rest } = input;

      await (db_inst as any).update(agencyClients)
        .set({ ...rest, updatedAt: new Date() })
        .where(and(eq(agencyClients.id, id), eq(agencyClients.agencyUserId, ctx.user.id)));

      return { success: true };
    }),

  // Provision a phone number for a client
  provisionClientNumber: protectedProcedure
    .input(z.object({ clientId: z.number(), areaCode: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db_inst = await db.getDb();
      if (!db_inst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { agencyClients } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");

      // Verify ownership
      const [client] = await (db_inst as any).select().from(agencyClients)
        .where(and(eq(agencyClients.id, input.clientId), eq(agencyClients.agencyUserId, ctx.user.id)))
        .limit(1);
      if (!client) throw new TRPCError({ code: "NOT_FOUND" });

      // Buy number from SignalWire
      const RestClient = require("@signalwire/compatibility-api").RestClient;
      const swClient = RestClient(
        process.env.SIGNALWIRE_PROJECT_ID!,
        process.env.SIGNALWIRE_TOKEN!,
        { signalwireSpaceUrl: process.env.SIGNALWIRE_SPACE_URL! }
      );

      const searchOpts: Record<string, unknown> = { limit: 1 };
      if (input.areaCode) searchOpts.areaCode = input.areaCode;
      const available = await swClient.availablePhoneNumbers("US").local.list(searchOpts);
      if (!available.length) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No numbers available" });

      const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : "https://apexai-production-d567.up.railway.app";

      const purchased = await swClient.incomingPhoneNumbers.create({
        phoneNumber: available[0].phoneNumber,
        voiceUrl: `${baseUrl}/api/voice/start`,
        voiceMethod: "POST",
        smsUrl: `${baseUrl}/api/sms/inbound`,
        smsMethod: "POST",
        friendlyName: `ApexAI Agency - ${client.clientName}`,
      });

      // Save to client record
      await (db_inst as any).update(agencyClients)
        .set({ aiPhoneNumber: available[0].phoneNumber, signalwireSid: purchased.sid })
        .where(eq(agencyClients.id, input.clientId));

      await db.logActivity({
        userId: ctx.user.id,
        entityType: "agency_client",
        entityId: input.clientId,
        action: "number_provisioned",
        description: `Provisioned ${available[0].phoneNumber} for ${client.clientName}`,
      });

      return { success: true, phoneNumber: available[0].phoneNumber, sid: purchased.sid };
    }),

  // Remove client
  removeClient: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db_inst = await db.getDb();
      if (!db_inst) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { agencyClients } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");

      await (db_inst as any).update(agencyClients)
        .set({ status: "cancelled" })
        .where(and(eq(agencyClients.id, input.id), eq(agencyClients.agencyUserId, ctx.user.id)));

      return { success: true };
    }),

  // Agency stats
  stats: protectedProcedure.query(async ({ ctx }) => {
    const db_inst = await db.getDb();
    if (!db_inst) return { totalClients: 0, activeClients: 0, monthlyRevenue: 0, totalMinutes: 0 };
    const { agencyClients } = await import("../drizzle/schema");
    const { eq, sql } = await import("drizzle-orm");

    const clients = await (db_inst as any).select().from(agencyClients)
      .where(eq(agencyClients.agencyUserId, ctx.user.id));

    const active = clients.filter((c: any) => c.status === "active");
    const revenue = active.reduce((sum: number, c: any) => sum + (c.monthlyRate || 0), 0);
    const minutes = clients.reduce((sum: number, c: any) => sum + (c.minutesUsed || 0), 0);

    return {
      totalClients: clients.length,
      activeClients: active.length,
      monthlyRevenue: revenue,
      totalMinutes: minutes,
    };
  }),
});

// ─── Business Extractor Router ────────────────────────────────────────────────
const extractorRouter = router({
  // Extract from URL — crawl website and return structured business info
  fromUrl: protectedProcedure
    .input(z.object({ url: z.string().min(3) }))
    .mutation(async ({ input }) => {
      const { extractFromUrl } = await import("./_core/services/businessExtractor");
      const result = await extractFromUrl(input.url);
      return result;
    }),

  // Extract from plain text / pasted content
  fromText: protectedProcedure
    .input(z.object({ text: z.string().min(20) }))
    .mutation(async ({ input }) => {
      const { extractFromText } = await import("./_core/services/businessExtractor");
      const result = await extractFromText(input.text);
      return result;
    }),
});

// ─── Demo Call Router (PUBLIC — for landing page "call me now") ───────────────
const demoCallRouter = router({
  // Trigger an outbound AI demo call from the landing page — captures lead data
  request: publicProcedure
    .input(z.object({
      firstName: z.string().min(1),
      phone: z.string().min(10),
      email: z.string().email().optional(),
      industry: z.string().optional().default("general"),
    }))
    .mutation(async ({ input }) => {
      try {
        // Save as a lead first
        const leadResult = await db.createLead({
          firstName: input.firstName,
          lastName: "Demo",
          phone: input.phone,
          email: input.email,
          source: "demo_call",
          status: "new",
          score: 70,
          segment: "hot",
          industry: input.industry,
          createdBy: 1, // system account — demo leads
        });

        // Trigger outbound call immediately
        const { initiateCall } = await import("./_core/services/signalwireService");
        const result = await initiateCall({
          leadId: leadResult.insertId,
          phoneNumber: input.phone,
        });

        await db.logActivity({
          entityType: "demo_call",
          entityId: leadResult.insertId,
          action: "demo_requested",
          description: `Demo call requested by ${input.firstName} (${input.phone}) — industry: ${input.industry}`,
          metadata: { callSid: result.callSid, phone: input.phone, email: input.email },
        });

        console.log(`[DemoCall] Triggered for ${input.firstName} at ${input.phone} | callSid: ${result.callSid}`);
        return { success: true, message: "Your AI demo call is connecting now!" };
      } catch (err: any) {
        console.error("[DemoCall] Failed:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not connect demo call. Please try again.",
        });
      }
    }),
});

// ─── GoHighLevel Webhook Router (PUBLIC) ──────────────────────────────────────
const ghlRouter = router({
  // Webhook endpoint for GoHighLevel to trigger outbound AI calls
  triggerCall: publicProcedure
    .input(z.object({
      contactId: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().min(10),
      email: z.string().email().optional(),
      industry: z.string().optional(),
      campaignId: z.number().optional(),
      apiKey: z.string().optional(), // optional webhook secret
    }))
    .mutation(async ({ input }) => {
      // Validate webhook secret if configured
      const expectedKey = process.env.GHL_WEBHOOK_SECRET;
      if (expectedKey && input.apiKey !== expectedKey) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid webhook key" });
      }

      try {
        // Upsert lead
        let lead = await db.getLeadByPhone(input.phone);
        if (!lead) {
          const result = await db.createLead({
            firstName: input.firstName || "GHL",
            lastName: input.lastName || "Lead",
            phone: input.phone,
            email: input.email,
            source: "gohighlevel",
            status: "new",
            score: 65,
            segment: "warm",
            industry: input.industry,
            createdBy: 1,
          });
          lead = { id: result.insertId } as any;
        }

        // Queue outbound call
        const { addCallJob } = await import("./_core/services/queue");
        await addCallJob({
          leadId: (lead as any).id,
          campaignId: input.campaignId,
        });

        console.log(`[GHL Webhook] Call queued for ${input.phone} (contactId: ${input.contactId})`);
        return { success: true, leadId: (lead as any).id };
      } catch (err: any) {
        console.error("[GHL Webhook] Failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
      }
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  leads: leadsRouter,
  campaigns: campaignsRouter,
  messages: messagesRouter,
  appointments: appointmentsRouter,
  voiceAI: voiceAIRouter,
  templates: templatesRouter,
  analytics: analyticsRouter,
  testimonials: testimonialsRouter,
  onboarding: onboardingRouter,
  admin: adminRouter,
  saas: saasRouter,
  // INTEGRATION: Add Omni AI webhook endpoints
  webhooks: webhooksRouter,
  settings: settingsRouter,
  agency: agencyRouter,
  extractor: extractorRouter,
  demoCall: demoCallRouter,
  ghl: ghlRouter,
});

export type AppRouter = typeof appRouter;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calculateLeadScore(lead: { email?: string; phone?: string; company?: string; industry?: string; title?: string; linkedinUrl?: string }): number {
  let score = 0;
  if (lead.email) score += 20;
  if (lead.phone) score += 20;
  if (lead.company) score += 15;
  if (lead.industry) score += 10;
  if (lead.title) score += 15;
  if (lead.linkedinUrl) score += 10;
  // Bonus for decision-maker titles
  const dmTitles = ["ceo", "cto", "cfo", "vp", "director", "president", "owner", "founder"];
  if (lead.title && dmTitles.some((t) => lead.title!.toLowerCase().includes(t))) score += 10;
  return Math.min(100, score);
}

// SQL increment helper using drizzle sql template
function db_sql_increment(field: string) {
  return sql`${sql.raw(field)} + 1`;
}
