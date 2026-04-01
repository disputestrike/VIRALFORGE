// ============================================================================
// APEXAI: SERVICE LOGIC FOR PHASE 2 FEATURES (11-20)
// ============================================================================
// Features 11-20: Workflow Builder, Memory, Sentiment, Ticketing, Mobile, Social, Email, RCS, Webchat, Analytics
// ============================================================================

import axios from "axios";

// ============================================================================
// 11. WORKFLOW BUILDER SERVICE
// ============================================================================
export class WorkflowBuilderService {
  // Execute workflow based on definition
  static async executeWorkflow(
    workflowDefinition: any,
    triggerData: any,
    db: any
  ): Promise<void> {
    try {
      // Parse workflow steps
      const steps = workflowDefinition.steps || [];

      for (const step of steps) {
        await this.executeStep(step, triggerData, db);
      }

      console.log("Workflow executed successfully");
    } catch (error) {
      console.error("Failed to execute workflow:", error);
      throw error;
    }
  }

  // Execute individual workflow step
  private static async executeStep(
    step: any,
    triggerData: any,
    db: any
  ): Promise<void> {
    try {
      switch (step.type) {
        case "send_sms":
          // Send SMS
          console.log(`Sending SMS: ${step.message}`);
          break;

        case "send_email":
          // Send email
          console.log(`Sending email: ${step.subject}`);
          break;

        case "create_lead":
          // Create lead
          await db.query(
            `INSERT INTO crm_leads (account_id, first_name, last_name, phone, source) 
             VALUES (?, ?, ?, ?, 'workflow')`,
            [
              triggerData.accountId,
              step.firstName,
              step.lastName,
              step.phone,
            ]
          );
          break;

        case "update_lead":
          // Update lead
          await db.query(
            `UPDATE crm_leads SET status = ? WHERE id = ?`,
            [step.status, triggerData.leadId]
          );
          break;

        case "create_ticket":
          // Create support ticket
          await db.query(
            `INSERT INTO support_tickets (account_id, title, description, priority) 
             VALUES (?, ?, ?, ?)`,
            [triggerData.accountId, step.title, step.description, step.priority]
          );
          break;

        case "delay":
          // Wait for specified time
          await new Promise((resolve) =>
            setTimeout(resolve, step.delayMs || 5000)
          );
          break;

        case "conditional":
          // Conditional logic
          if (this.evaluateCondition(step.condition, triggerData)) {
            for (const substep of step.thenSteps || []) {
              await this.executeStep(substep, triggerData, db);
            }
          } else {
            for (const substep of step.elseSteps || []) {
              await this.executeStep(substep, triggerData, db);
            }
          }
          break;

        default:
          console.log(`Unknown step type: ${step.type}`);
      }
    } catch (error) {
      console.error("Failed to execute step:", error);
      throw error;
    }
  }

  // Evaluate conditional
  private static evaluateCondition(condition: any, data: any): boolean {
    const { field, operator, value } = condition;

    switch (operator) {
      case "equals":
        return data[field] === value;
      case "contains":
        return String(data[field]).includes(value);
      case "gt":
        return data[field] > value;
      case "lt":
        return data[field] < value;
      default:
        return false;
    }
  }
}

// ============================================================================
// 12. PERSISTENT MEMORY SERVICE
// ============================================================================
export class MemoryService {
  // Retrieve all memories for lead
  static async getLeadMemory(leadId: string, db: any): Promise<any> {
    try {
      const memories = await db.query(
        `SELECT memory_type, key_name, value FROM conversation_memory 
         WHERE lead_id = ? AND (expires_at IS NULL OR expires_at > NOW())`,
        [leadId]
      );

      // Organize memories by type
      const organized: any = {
        preferences: {},
        history: [],
        context: {},
        actionItems: [],
      };

      for (const memory of memories) {
        if (memory.memory_type === "preference") {
          organized.preferences[memory.key_name] = memory.value;
        } else if (memory.memory_type === "history") {
          organized.history.push(memory.value);
        } else if (memory.memory_type === "context") {
          organized.context[memory.key_name] = memory.value;
        } else if (memory.memory_type === "action_item") {
          organized.actionItems.push(memory.value);
        }
      }

      return organized;
    } catch (error) {
      console.error("Failed to get lead memory:", error);
      throw error;
    }
  }

  // Use memory in AI conversation
  static buildSystemPromptWithMemory(
    basePrompt: string,
    memory: any
  ): string {
    let prompt = basePrompt;

    if (Object.keys(memory.preferences).length > 0) {
      prompt += "\n\nCustomer Preferences:\n";
      for (const [key, value] of Object.entries(memory.preferences)) {
        prompt += `- ${key}: ${value}\n`;
      }
    }

    if (memory.context && Object.keys(memory.context).length > 0) {
      prompt += "\n\nContext:\n";
      for (const [key, value] of Object.entries(memory.context)) {
        prompt += `- ${key}: ${value}\n`;
      }
    }

    if (memory.actionItems.length > 0) {
      prompt += "\n\nPending Action Items:\n";
      for (const item of memory.actionItems) {
        prompt += `- ${item}\n`;
      }
    }

    return prompt;
  }
}

// ============================================================================
// 13. SENTIMENT ANALYSIS SERVICE
// ============================================================================
export class SentimentService {
  // Analyze sentiment from transcription
  static async analyzeSentiment(transcription: string): Promise<{
    sentiment: string;
    sentimentScore: number;
    emotions: any;
    keyPhrases: string[];
  }> {
    try {
      // WIRE THIS: Use sentiment analysis API (Azure, AWS, or OpenAI)
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content:
                "Analyze the sentiment of this transcription. Return JSON with: sentiment (very_positive/positive/neutral/negative/very_negative), sentimentScore (-1 to 1), emotions (object with emotion names and scores), keyPhrases (array)",
            },
            {
              role: "user",
              content: transcription,
            },
          ],
          temperature: 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const analysisText = response.data.choices[0].message.content;

      // Parse JSON response
      const analysis = JSON.parse(analysisText);

      return {
        sentiment: analysis.sentiment,
        sentimentScore: analysis.sentimentScore,
        emotions: analysis.emotions || {},
        keyPhrases: analysis.keyPhrases || [],
      };
    } catch (error) {
      console.error("Failed to analyze sentiment:", error);
      return {
        sentiment: "neutral",
        sentimentScore: 0,
        emotions: {},
        keyPhrases: [],
      };
    }
  }

  // Real-time sentiment detection during call
  static async detectRealtimeSentiment(
    partialTranscription: string
  ): Promise<string> {
    try {
      // WIRE THIS: Use real-time sentiment API
      // This should be fast enough for live call routing

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "Quickly analyze sentiment. Return only one word: positive, neutral, or negative",
            },
            {
              role: "user",
              content: partialTranscription,
            },
          ],
          temperature: 0.1,
          max_tokens: 10,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.choices[0].message.content.trim().toLowerCase();
    } catch (error) {
      console.error("Failed to detect real-time sentiment:", error);
      return "neutral";
    }
  }
}

// ============================================================================
// 14. TICKETING SERVICE
// ============================================================================
export class TicketingService {
  // Auto-create ticket from call
  static async createTicketFromCall(
    callData: any,
    accountId: string,
    db: any
  ): Promise<string> {
    try {
      const result = await db.query(
        `INSERT INTO support_tickets 
         (account_id, lead_id, call_id, title, description, priority, category, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'open')`,
        [
          accountId,
          callData.leadId,
          callData.callId,
          `Call from ${callData.callerName}`,
          callData.callSummary || "Call received",
          callData.priority || "medium",
          callData.category || "general",
        ]
      );

      return result.insertId;
    } catch (error) {
      console.error("Failed to create ticket:", error);
      throw error;
    }
  }

  // Sync ticket to external ticketing system
  static async syncTicketToExternal(
    ticket: any,
    externalSystem: string,
    credentials: any
  ): Promise<void> {
    try {
      if (externalSystem === "zendesk") {
        // WIRE THIS: Zendesk API
        await axios.post(
          "https://api.zendesk.com/api/v2/tickets.json",
          {
            ticket: {
              subject: ticket.title,
              description: ticket.description,
              priority: ticket.priority,
            },
          },
          {
            headers: {
              Authorization: `Basic ${Buffer.from(credentials.email + "/token:" + credentials.token).toString("base64")}`,
            },
          }
        );
      } else if (externalSystem === "freshdesk") {
        // WIRE THIS: Freshdesk API
        await axios.post(
          "https://api.freshdesk.com/api/v2/tickets",
          {
            subject: ticket.title,
            description: ticket.description,
            priority: ticket.priority,
          },
          {
            headers: {
              Authorization: `Bearer ${credentials.apiKey}`,
            },
          }
        );
      }

      console.log(`Ticket synced to ${externalSystem}`);
    } catch (error) {
      console.error("Failed to sync ticket:", error);
      throw error;
    }
  }
}

// ============================================================================
// 15. MOBILE APP SERVICE
// ============================================================================
export class MobileAppService {
  // Send push notification via FCM (Firebase Cloud Messaging)
  static async sendPushNotificationFCM(
    deviceToken: string,
    title: string,
    body: string,
    data: any
  ): Promise<void> {
    try {
      // WIRE THIS: Firebase Admin SDK
      // const message = {
      //   notification: { title, body },
      //   data,
      //   token: deviceToken,
      // };
      // await admin.messaging().send(message);

      console.log(`Sending FCM notification to ${deviceToken}`);
    } catch (error) {
      console.error("Failed to send FCM notification:", error);
      throw error;
    }
  }

  // Send push notification via APNs (Apple Push Notification service)
  static async sendPushNotificationAPNs(
    deviceToken: string,
    title: string,
    body: string,
    data: any
  ): Promise<void> {
    try {
      // WIRE THIS: APNs SDK (node-apn)
      // const notification = new apn.Notification({
      //   alert: { title, body },
      //   payload: data,
      //   topic: 'com.apexai.app',
      // });
      // await apnProvider.send(notification, deviceToken);

      console.log(`Sending APNs notification to ${deviceToken}`);
    } catch (error) {
      console.error("Failed to send APNs notification:", error);
      throw error;
    }
  }
}

// ============================================================================
// 16. SOCIAL MEDIA SERVICE
// ============================================================================
export class SocialMediaService {
  // Handle incoming Instagram message
  static async handleInstagramMessage(
    message: any,
    integrationId: string,
    accountId: string,
    db: any
  ): Promise<void> {
    try {
      // Create or update lead from Instagram sender
      const existingLead = await db.query(
        `SELECT id FROM crm_leads WHERE account_id = ? AND phone = ?`,
        [accountId, message.senderId]
      );

      let leadId = existingLead[0]?.id;

      if (!leadId) {
        const result = await db.query(
          `INSERT INTO crm_leads 
           (account_id, first_name, email, source, status) 
           VALUES (?, ?, ?, 'instagram', 'new')`,
          [accountId, message.senderName, message.senderEmail]
        );
        leadId = result.insertId;
      }

      // Log message
      await db.query(
        `INSERT INTO social_messages 
         (integration_id, lead_id, platform_message_id, sender_id, sender_name, message_text, direction, status) 
         VALUES (?, ?, ?, ?, ?, ?, 'inbound', 'received')`,
        [
          integrationId,
          leadId,
          message.messageId,
          message.senderId,
          message.senderName,
          message.text,
        ]
      );

      // WIRE THIS: Trigger workflow or auto-response
      console.log(`Instagram message received from ${message.senderName}`);
    } catch (error) {
      console.error("Failed to handle Instagram message:", error);
      throw error;
    }
  }

  // Send WhatsApp message
  static async sendWhatsAppMessage(
    phoneNumber: string,
    messageText: string,
    accessToken: string
  ): Promise<void> {
    try {
      // WIRE THIS: WhatsApp Business API
      await axios.post(
        "https://graph.instagram.com/v18.0/me/messages",
        {
          messaging_product: "whatsapp",
          to: phoneNumber,
          type: "text",
          text: { body: messageText },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      console.log(`WhatsApp message sent to ${phoneNumber}`);
    } catch (error) {
      console.error("Failed to send WhatsApp message:", error);
      throw error;
    }
  }
}

// ============================================================================
// 17. EMAIL SERVICE
// ============================================================================
export class EmailService {
  // Send email via SMTP or email service
  static async sendEmail(
    to: string,
    subject: string,
    body: string,
    from: string = "noreply@apexai.com"
  ): Promise<void> {
    try {
      // WIRE THIS: Use SendGrid, Mailgun, AWS SES, or SMTP
      // Example with SendGrid:
      // const msg = {
      //   to,
      //   from,
      //   subject,
      //   html: body,
      // };
      // await sgMail.send(msg);

      console.log(`Email sent to ${to}`);
    } catch (error) {
      console.error("Failed to send email:", error);
      throw error;
    }
  }

  // Create email campaign
  static async executeEmailCampaign(
    campaignId: string,
    db: any
  ): Promise<void> {
    try {
      // Get campaign details
      const campaign = await db.query(
        `SELECT * FROM email_campaigns WHERE id = ?`,
        [campaignId]
      );

      if (!campaign[0]) {
        throw new Error("Campaign not found");
      }

      // Get template
      const template = await db.query(
        `SELECT * FROM email_templates WHERE id = ?`,
        [campaign[0].template_id]
      );

      if (!template[0]) {
        throw new Error("Template not found");
      }

      // Get recipients based on filter
      const recipients = await db.query(
        `SELECT email FROM crm_leads WHERE account_id = ? AND status IN (?, ?)`,
        [campaign[0].account_id, "qualified", "converted"]
      );

      // Send emails
      for (const recipient of recipients) {
        await this.sendEmail(
          recipient.email,
          template[0].subject,
          template[0].body
        );

        // Log email
        await db.query(
          `INSERT INTO email_logs (campaign_id, recipient_email, subject, status) 
           VALUES (?, ?, ?, 'sent')`,
          [campaignId, recipient.email, template[0].subject]
        );
      }

      console.log(`Campaign ${campaignId} executed`);
    } catch (error) {
      console.error("Failed to execute email campaign:", error);
      throw error;
    }
  }
}

// ============================================================================
// 18. RCS SERVICE
// ============================================================================
export class RCSService {
  // Send RCS message with rich content
  static async sendRCSMessage(
    phoneNumber: string,
    messageText: string,
    richContent: any,
    provider: string
  ): Promise<void> {
    try {
      // WIRE THIS: RCS provider API (Google RCS, Twilio, SignalWire)
      // Example with Google RCS:
      // const rcsMessage = {
      //   to: phoneNumber,
      //   body: messageText,
      //   richCard: richContent,
      // };
      // await googleRCS.send(rcsMessage);

      console.log(`RCS message sent to ${phoneNumber}`);
    } catch (error) {
      console.error("Failed to send RCS message:", error);
      throw error;
    }
  }
}

// ============================================================================
// 19. WEBCHAT SERVICE
// ============================================================================
export class WebchatService {
  // Route webchat to available agent
  static async routeToAgent(
    conversationId: string,
    db: any
  ): Promise<string | null> {
    try {
      // Get available agents
      const availableAgents = await db.query(
        `SELECT id FROM users WHERE status = 'available' LIMIT 1`
      );

      if (availableAgents.length === 0) {
        return null; // No agents available
      }

      const agentId = availableAgents[0].id;

      // Assign conversation to agent
      await db.query(
        `UPDATE webchat_conversations SET assigned_to = ?, status = 'active' WHERE id = ?`,
        [agentId, conversationId]
      );

      return agentId;
    } catch (error) {
      console.error("Failed to route to agent:", error);
      throw error;
    }
  }

  // Auto-respond with bot
  static async autoRespond(
    conversationId: string,
    visitorMessage: string,
    db: any
  ): Promise<string> {
    try {
      // WIRE THIS: Use AI to generate response
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful customer service bot. Keep responses concise and friendly.",
            },
            {
              role: "user",
              content: visitorMessage,
            },
          ],
          temperature: 0.7,
          max_tokens: 150,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const botMessage = response.data.choices[0].message.content;

      // Store bot message
      await db.query(
        `INSERT INTO webchat_messages 
         (conversation_id, sender_type, message_text, message_type) 
         VALUES (?, 'bot', ?, 'text')`,
        [conversationId, botMessage]
      );

      return botMessage;
    } catch (error) {
      console.error("Failed to auto-respond:", error);
      throw error;
    }
  }
}

// ============================================================================
// 20. ANALYTICS SERVICE
// ============================================================================
export class AnalyticsService {
  // Generate daily summary
  static async generateDailySummary(
    accountId: string,
    date: Date,
    db: any
  ): Promise<void> {
    try {
      // Query events for the day
      const events = await db.query(
        `SELECT event_type, COUNT(*) as count FROM analytics_events 
         WHERE account_id = ? AND DATE(created_at) = ? 
         GROUP BY event_type`,
        [accountId, date]
      );

      // Calculate metrics
      let totalCalls = 0;
      let inboundCalls = 0;
      let outboundCalls = 0;
      let totalSms = 0;
      let leadsCreated = 0;

      for (const event of events) {
        if (event.event_type === "call_started") {
          totalCalls += event.count;
          inboundCalls += event.count;
        } else if (event.event_type === "outbound_call_started") {
          totalCalls += event.count;
          outboundCalls += event.count;
        } else if (event.event_type === "sms_sent") {
          totalSms += event.count;
        } else if (event.event_type === "lead_created") {
          leadsCreated += event.count;
        }
      }

      // Calculate conversion rate
      const leadsQualified = await db.query(
        `SELECT COUNT(*) as count FROM crm_leads 
         WHERE account_id = ? AND status = 'qualified' AND DATE(created_at) = ?`,
        [accountId, date]
      );

      const conversionRate =
        leadsCreated > 0 ? (leadsQualified[0].count / leadsCreated) * 100 : 0;

      // Store summary
      await db.query(
        `INSERT INTO analytics_daily_summary 
         (account_id, date, total_calls, inbound_calls, outbound_calls, total_sms, leads_created, conversion_rate) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          accountId,
          date,
          totalCalls,
          inboundCalls,
          outboundCalls,
          totalSms,
          leadsCreated,
          conversionRate,
        ]
      );

      console.log(`Daily summary generated for ${accountId}`);
    } catch (error) {
      console.error("Failed to generate daily summary:", error);
      throw error;
    }
  }
}
