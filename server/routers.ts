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
import * as twilioService from "./_core/services/twilioService";
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
    .query(async ({ input }) => {
      return db.getLeads(input ?? {});
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
      await db.createLead({ ...input, score, segment, tags: input.tags ? JSON.stringify(input.tags) : undefined });
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

  aiSearch: protectedProcedure.input(z.object({ query: z.string() })).mutation(async ({ input }) => {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a lead search assistant. Convert natural language queries into structured search filters. Return JSON with fields: search (string), segment (hot|warm|cold|unqualified|null), status (new|contacted|qualified|converted|lost|null), verificationStatus (verified|unverified|bounced|pending|null). Only include fields that are clearly specified." },
        { role: "user", content: input.query },
      ],
      response_format: { type: "json_schema", json_schema: { name: "search_filters", strict: true, schema: { type: "object", properties: { search: { type: "string" }, segment: { type: "string" }, status: { type: "string" }, verificationStatus: { type: "string" } }, required: ["search", "segment", "status", "verificationStatus"], additionalProperties: false } } },
    });
    try {
      const filters = JSON.parse(response.choices[0].message.content as string);
      const results = await db.getLeads({ search: filters.search || undefined, segment: filters.segment || undefined, status: filters.status || undefined, verificationStatus: filters.verificationStatus || undefined });
      return { filters, ...results };
    } catch {
      const results = await db.getLeads({ search: input.query });
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
        await db.createLead({ ...lead, score, segment });
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
    .query(async ({ input }) => db.getCampaigns(input ?? {})),

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
    .query(async ({ input }) => db.getMessages(input ?? {})),

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
      // Simulate sending
      await db.createMessage({ ...input, status: "sent", sentAt: new Date(), deliveredAt: new Date() });
      if (input.campaignId) {
        await db.updateCampaign(input.campaignId, { sentCount: db_sql_increment("sentCount") as unknown as number });
      }
      await db.logActivity({ userId: ctx.user.id, entityType: "message", action: "sent", description: `Sent ${input.channel} to lead ${input.leadId}` });
      return { success: true };
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
    .query(async ({ input }) => db.getCallRecordings(input ?? {})),
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
        await db.createMessage({
          leadId: contact.leadId,
          campaignId: input.campaignId,
          channel: input.channel,
          subject: personalizedSubject,
          body: personalizedBody,
          templateId: input.templateId,
          status: "sent",
          sentAt: new Date(),
          deliveredAt: new Date(),
        });
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
        const decision = await decisionEngine.decideLeadAction({
          lead,
          campaign: input.campaignId ? await db.getCampaignById(input.campaignId) : undefined,
          previousAttempts: 0,
          lastContactedAt: Date.now(),
        });

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
  globalMetrics: protectedProcedure.query(async () => db.getGlobalMetrics()),

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
    .mutation(async ({ input }) => {
      const metrics = await db.getGlobalMetrics();
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
      const steps: string[] = JSON.parse(record.completedSteps ?? "[]");
      const updatedSet = input.completed ? Array.from(new Set([...steps, input.step])) : steps.filter((s) => s !== input.step);
      const updated = updatedSet;
      const allSteps = ["account_setup", "campaign_config", "lead_import", "template_setup", "test_campaign", "go_live", "week1_review", "week2_optimization", "week3_scaling", "week4_handoff"];
      const status = updated.length >= allSteps.length ? "completed" : updated.length > 0 ? "in_progress" : "not_started";
      await db.updateOnboarding(input.id, { completedSteps: JSON.stringify(updated), status });
      return { success: true, completedSteps: updated, status };
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
  voiceAI: voiceAIRouter,
  templates: templatesRouter,
  analytics: analyticsRouter,
  testimonials: testimonialsRouter,
  onboarding: onboardingRouter,
  admin: adminRouter,
  saas: saasRouter,
  // INTEGRATION: Add Omni AI webhook endpoints
  webhooks: webhooksRouter,
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
