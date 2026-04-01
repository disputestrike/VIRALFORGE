// ============================================================================
// APEXAI: BACKGROUND JOB HANDLERS (BullMQ)
// ============================================================================
// These jobs should be queued from your tRPC routers and executed by workers
// Wire these into your existing BullMQ setup
// ============================================================================

import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import {
  PhoneNumberService,
  KnowledgeBaseService,
  CRMLeadsService,
  CallSummariesService,
  LeadScoringService,
  VoiceOptionsService,
  SpamFilteringService,
  EscalationService,
  ZapierService,
  CRMIntegrationService,
} from "./05_SERVICE_LOGIC_PART1";
import {
  WorkflowBuilderService,
  MemoryService,
  SentimentService,
  TicketingService,
  MobileAppService,
  SocialMediaService,
  EmailService,
  RCSService,
  WebchatService,
  AnalyticsService,
} from "./06_SERVICE_LOGIC_PART2";

// Initialize Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
});

// ============================================================================
// QUEUE DEFINITIONS
// ============================================================================

// Feature 1: Phone Number Management
export const phoneNumberQueue = new Queue("phone-numbers", { connection: redis });

// Feature 2: Knowledge Base
export const knowledgeBaseQueue = new Queue("knowledge-base", {
  connection: redis,
});

// Feature 3: CRM Leads
export const crmLeadsQueue = new Queue("crm-leads", { connection: redis });

// Feature 4: Call Summaries
export const callSummariesQueue = new Queue("call-summaries", {
  connection: redis,
});

// Feature 5: Lead Scoring
export const leadScoringQueue = new Queue("lead-scoring", {
  connection: redis,
});

// Feature 6: Voice Options
export const voiceQueue = new Queue("voice-options", { connection: redis });

// Feature 7: Spam Filtering
export const spamFilteringQueue = new Queue("spam-filtering", {
  connection: redis,
});

// Feature 8: Escalation
export const escalationQueue = new Queue("escalation", { connection: redis });

// Feature 9: Zapier
export const zapierQueue = new Queue("zapier", { connection: redis });

// Feature 10: CRM Integrations
export const crmIntegrationQueue = new Queue("crm-integration", {
  connection: redis,
});

// Feature 11: Workflow Builder
export const workflowQueue = new Queue("workflows", { connection: redis });

// Feature 12: Memory
export const memoryQueue = new Queue("memory", { connection: redis });

// Feature 13: Sentiment Analysis
export const sentimentQueue = new Queue("sentiment", { connection: redis });

// Feature 14: Ticketing
export const ticketingQueue = new Queue("ticketing", { connection: redis });

// Feature 15: Mobile
export const mobileQueue = new Queue("mobile", { connection: redis });

// Feature 16: Social Media
export const socialMediaQueue = new Queue("social-media", {
  connection: redis,
});

// Feature 17: Email
export const emailQueue = new Queue("email", { connection: redis });

// Feature 18: RCS
export const rcsQueue = new Queue("rcs", { connection: redis });

// Feature 19: Webchat
export const webchatQueue = new Queue("webchat", { connection: redis });

// Feature 20: Analytics
export const analyticsQueue = new Queue("analytics", { connection: redis });

// ============================================================================
// WORKER: PHONE NUMBER MANAGEMENT
// ============================================================================
export const phoneNumberWorker = new Worker(
  "phone-numbers",
  async (job) => {
    try {
      if (job.data.action === "provision") {
        const result = await PhoneNumberService.provisionPhoneNumber(
          job.data.areaCode,
          job.data.country
        );
        return result;
      } else if (job.data.action === "release") {
        await PhoneNumberService.releasePhoneNumber(job.data.providerId);
        return { success: true };
      }
    } catch (error) {
      console.error("Phone number job failed:", error);
      throw error;
    }
  },
  { connection: redis, concurrency: 5 }
);

// ============================================================================
// WORKER: KNOWLEDGE BASE
// ============================================================================
export const knowledgeBaseWorker = new Worker(
  "knowledge-base",
  async (job) => {
    try {
      if (job.data.action === "crawl") {
        const pages = await KnowledgeBaseService.crawlWebsite(job.data.url);
        return { pagesCount: pages.length };
      } else if (job.data.action === "process_document") {
        const content = await KnowledgeBaseService.processDocument(
          job.data.filePath,
          job.data.fileType
        );

        // Chunk content
        const chunks = await KnowledgeBaseService.chunkContent(content);

        // Generate embeddings
        const embeddings = await KnowledgeBaseService.generateEmbeddings(chunks);

        return { chunksCount: chunks.length, embeddingsCount: embeddings.length };
      }
    } catch (error) {
      console.error("Knowledge base job failed:", error);
      throw error;
    }
  },
  { connection: redis, concurrency: 3 }
);

// ============================================================================
// WORKER: CRM LEADS
// ============================================================================
export const crmLeadsWorker = new Worker(
  "crm-leads",
  async (job) => {
    try {
      if (job.data.action === "capture_from_call") {
        const leadId = await CRMLeadsService.captureLeadFromCall(
          job.data.callData,
          job.data.accountId,
          job.data.phoneNumberId,
          job.data.db
        );
        return { leadId };
      } else if (job.data.action === "enrich") {
        await CRMLeadsService.enrichLead(job.data.leadId, job.data.db);
        return { success: true };
      }
    } catch (error) {
      console.error("CRM leads job failed:", error);
      throw error;
    }
  },
  { connection: redis, concurrency: 10 }
);

// ============================================================================
// WORKER: CALL SUMMARIES
// ============================================================================
export const callSummariesWorker = new Worker(
  "call-summaries",
  async (job) => {
    try {
      if (job.data.action === "transcribe") {
        const transcription = await CallSummariesService.transcribeCall(
          job.data.audioUrl
        );
        return { transcription };
      } else if (job.data.action === "generate_summary") {
        const summary = await CallSummariesService.generateSummary(
          job.data.transcription,
          job.data.callDuration
        );
        return summary;
      }
    } catch (error) {
      console.error("Call summaries job failed:", error);
      throw error;
    }
  },
  { connection: redis, concurrency: 5 }
);

// ============================================================================
// WORKER: LEAD SCORING
// ============================================================================
export const leadScoringWorker = new Worker(
  "lead-scoring",
  async (job) => {
    try {
      const { score, breakdown } = await LeadScoringService.calculateScore(
        job.data.lead,
        job.data.rules,
        job.data.db
      );

      await LeadScoringService.autoQualifyLead(
        job.data.leadId,
        score,
        job.data.db
      );

      return { score, breakdown };
    } catch (error) {
      console.error("Lead scoring job failed:", error);
      throw error;
    }
  },
  { connection: redis, concurrency: 10 }
);

// ============================================================================
// WORKER: VOICE OPTIONS
// ============================================================================
export const voiceWorker = new Worker(
  "voice-options",
  async (job) => {
    try {
      if (job.data.action === "fetch_voices") {
        const voices = await VoiceOptionsService.fetchAvailableVoices(
          job.data.provider
        );
        return { voices };
      } else if (job.data.action === "synthesize") {
        const audioUrl = await VoiceOptionsService.synthesizeSpeech(
          job.data.text,
          job.data.voiceId,
          job.data.provider
        );
        return { audioUrl };
      }
    } catch (error) {
      console.error("Voice job failed:", error);
      throw error;
    }
  },
  { connection: redis, concurrency: 5 }
);

// ============================================================================
// WORKER: SPAM FILTERING
// ============================================================================
export const spamFilteringWorker = new Worker(
  "spam-filtering",
  async (job) => {
    try {
      const result = await SpamFilteringService.checkSpam(
        job.data.phoneNumber,
        job.data.callerId,
        job.data.filters
      );
      return result;
    } catch (error) {
      console.error("Spam filtering job failed:", error);
      throw error;
    }
  },
  { connection: redis, concurrency: 20 }
);

// ============================================================================
// WORKER: ESCALATION
// ============================================================================
export const escalationWorker = new Worker(
  "escalation",
  async (job) => {
    try {
      const { shouldEscalate, rule } = await EscalationService.shouldEscalate(
        job.data.callData,
        job.data.rules
      );

      if (shouldEscalate) {
        await EscalationService.escalateToAgent(
          job.data.callId,
          rule.target_phone
        );
      }

      return { escalated: shouldEscalate };
    } catch (error) {
      console.error("Escalation job failed:", error);
      throw error;
    }
  },
  { connection: redis, concurrency: 10 }
);

// ============================================================================
// WORKER: ZAPIER
// ============================================================================
export const zapierWorker = new Worker(
  "zapier",
  async (job) => {
    try {
      await ZapierService.sendEvent(
        job.data.webhookUrl,
        job.data.triggerType,
        job.data.payload
      );
      return { success: true };
    } catch (error) {
      console.error("Zapier job failed:", error);
      throw error;
    }
  },
  { connection: redis, concurrency: 10 }
);

// ============================================================================
// WORKER: CRM INTEGRATION
// ============================================================================
export const crmIntegrationWorker = new Worker(
  "crm-integration",
  async (job) => {
    try {
      if (job.data.crmType === "salesforce") {
        await CRMIntegrationService.syncToSalesforce(
          job.data.lead,
          job.data.accessToken,
          job.data.instanceUrl,
          job.data.fieldMappings
        );
      } else if (job.data.crmType === "hubspot") {
        await CRMIntegrationService.syncToHubSpot(
          job.data.lead,
          job.data.accessToken,
          job.data.fieldMappings
        );
      } else if (job.data.crmType === "pipedrive") {
        await CRMIntegrationService.syncToPipedrive(
          job.data.lead,
          job.data.accessToken,
          job.data.fieldMappings
        );
      }

      return { success: true };
    } catch (error) {
      console.error("CRM integration job failed:", error);
      throw error;
    }
  },
  { connection: redis, concurrency: 5 }
);

// ============================================================================
// WORKER: WORKFLOW BUILDER
// ============================================================================
export const workflowWorker = new Worker(
  "workflows",
  async (job) => {
    try {
      await WorkflowBuilderService.executeWorkflow(
        job.data.workflowDefinition,
        job.data.triggerData,
        job.data.db
      );
      return { success: true };
    } catch (error) {
      console.error("Workflow job failed:", error);
      throw error;
    }
  },
  { connection: redis, concurrency: 10 }
);

// ============================================================================
// WORKER: SENTIMENT ANALYSIS
// ============================================================================
export const sentimentWorker = new Worker(
  "sentiment",
  async (job) => {
    try {
      const analysis = await SentimentService.analyzeSentiment(
        job.data.transcription
      );
      return analysis;
    } catch (error) {
      console.error("Sentiment job failed:", error);
      throw error;
    }
  },
  { connection: redis, concurrency: 5 }
);

// ============================================================================
// WORKER: TICKETING
// ============================================================================
export const ticketingWorker = new Worker(
  "ticketing",
  async (job) => {
    try {
      if (job.data.action === "create_from_call") {
        const ticketId = await TicketingService.createTicketFromCall(
          job.data.callData,
          job.data.accountId,
          job.data.db
        );
        return { ticketId };
      } else if (job.data.action === "sync_external") {
        await TicketingService.syncTicketToExternal(
          job.data.ticket,
          job.data.externalSystem,
          job.data.credentials
        );
        return { success: true };
      }
    } catch (error) {
      console.error("Ticketing job failed:", error);
      throw error;
    }
  },
  { connection: redis, concurrency: 10 }
);

// ============================================================================
// WORKER: MOBILE
// ============================================================================
export const mobileWorker = new Worker(
  "mobile",
  async (job) => {
    try {
      if (job.data.deviceType === "ios") {
        await MobileAppService.sendPushNotificationAPNs(
          job.data.deviceToken,
          job.data.title,
          job.data.body,
          job.data.data
        );
      } else if (job.data.deviceType === "android") {
        await MobileAppService.sendPushNotificationFCM(
          job.data.deviceToken,
          job.data.title,
          job.data.body,
          job.data.data
        );
      }

      return { success: true };
    } catch (error) {
      console.error("Mobile job failed:", error);
      throw error;
    }
  },
  { connection: redis, concurrency: 20 }
);

// ============================================================================
// WORKER: SOCIAL MEDIA
// ============================================================================
export const socialMediaWorker = new Worker(
  "social-media",
  async (job) => {
    try {
      if (job.data.platform === "instagram") {
        await SocialMediaService.handleInstagramMessage(
          job.data.message,
          job.data.integrationId,
          job.data.accountId,
          job.data.db
        );
      } else if (job.data.platform === "whatsapp") {
        await SocialMediaService.sendWhatsAppMessage(
          job.data.phoneNumber,
          job.data.messageText,
          job.data.accessToken
        );
      }

      return { success: true };
    } catch (error) {
      console.error("Social media job failed:", error);
      throw error;
    }
  },
  { connection: redis, concurrency: 10 }
);

// ============================================================================
// WORKER: EMAIL
// ============================================================================
export const emailWorker = new Worker(
  "email",
  async (job) => {
    try {
      if (job.data.action === "send") {
        await EmailService.sendEmail(
          job.data.to,
          job.data.subject,
          job.data.body,
          job.data.from
        );
      } else if (job.data.action === "campaign") {
        await EmailService.executeEmailCampaign(job.data.campaignId, job.data.db);
      }

      return { success: true };
    } catch (error) {
      console.error("Email job failed:", error);
      throw error;
    }
  },
  { connection: redis, concurrency: 10 }
);

// ============================================================================
// WORKER: RCS
// ============================================================================
export const rcsWorker = new Worker(
  "rcs",
  async (job) => {
    try {
      await RCSService.sendRCSMessage(
        job.data.phoneNumber,
        job.data.messageText,
        job.data.richContent,
        job.data.provider
      );
      return { success: true };
    } catch (error) {
      console.error("RCS job failed:", error);
      throw error;
    }
  },
  { connection: redis, concurrency: 10 }
);

// ============================================================================
// WORKER: WEBCHAT
// ============================================================================
export const webchatWorker = new Worker(
  "webchat",
  async (job) => {
    try {
      if (job.data.action === "route_to_agent") {
        const agentId = await WebchatService.routeToAgent(
          job.data.conversationId,
          job.data.db
        );
        return { agentId };
      } else if (job.data.action === "auto_respond") {
        const botMessage = await WebchatService.autoRespond(
          job.data.conversationId,
          job.data.visitorMessage,
          job.data.db
        );
        return { botMessage };
      }
    } catch (error) {
      console.error("Webchat job failed:", error);
      throw error;
    }
  },
  { connection: redis, concurrency: 10 }
);

// ============================================================================
// WORKER: ANALYTICS
// ============================================================================
export const analyticsWorker = new Worker(
  "analytics",
  async (job) => {
    try {
      await AnalyticsService.generateDailySummary(
        job.data.accountId,
        job.data.date,
        job.data.db
      );
      return { success: true };
    } catch (error) {
      console.error("Analytics job failed:", error);
      throw error;
    }
  },
  { connection: redis, concurrency: 5 }
);

// ============================================================================
// QUEUE HELPER FUNCTIONS
// ============================================================================

export async function queuePhoneNumberJob(
  action: string,
  data: any
): Promise<void> {
  await phoneNumberQueue.add(action, data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}

export async function queueKnowledgeBaseJob(
  action: string,
  data: any
): Promise<void> {
  await knowledgeBaseQueue.add(action, data, {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
  });
}

export async function queueCRMLeadsJob(
  action: string,
  data: any
): Promise<void> {
  await crmLeadsQueue.add(action, data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}

export async function queueCallSummaryJob(
  action: string,
  data: any
): Promise<void> {
  await callSummariesQueue.add(action, data, {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
  });
}

export async function queueLeadScoringJob(data: any): Promise<void> {
  await leadScoringQueue.add("score", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  });
}

export async function queueWorkflowJob(data: any): Promise<void> {
  await workflowQueue.add("execute", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}

export async function queueEmailJob(action: string, data: any): Promise<void> {
  await emailQueue.add(action, data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  });
}

export async function queueAnalyticsJob(data: any): Promise<void> {
  await analyticsQueue.add("generate_summary", data, {
    attempts: 2,
    backoff: { type: "exponential", delay: 10000 },
  });
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on("SIGTERM", async () => {
  console.log("Shutting down workers...");
  await Promise.all([
    phoneNumberWorker.close(),
    knowledgeBaseWorker.close(),
    crmLeadsWorker.close(),
    callSummariesWorker.close(),
    leadScoringWorker.close(),
    voiceWorker.close(),
    spamFilteringWorker.close(),
    escalationWorker.close(),
    zapierWorker.close(),
    crmIntegrationWorker.close(),
    workflowWorker.close(),
    sentimentWorker.close(),
    ticketingWorker.close(),
    mobileWorker.close(),
    socialMediaWorker.close(),
    emailWorker.close(),
    rcsWorker.close(),
    webchatWorker.close(),
    analyticsWorker.close(),
  ]);
  console.log("Workers shut down");
  process.exit(0);
});
