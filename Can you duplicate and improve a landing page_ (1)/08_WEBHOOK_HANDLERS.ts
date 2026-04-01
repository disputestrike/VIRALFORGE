// ============================================================================
// APEXAI: WEBHOOK HANDLERS
// ============================================================================
// Add these routes to your Express server to handle incoming webhooks
// WIRE THIS: Mount these in your main server.ts file
// ============================================================================

import { Router, Request, Response } from "express";
import crypto from "crypto";

const router = Router();

// ============================================================================
// SIGNALWIRE WEBHOOKS
// ============================================================================

// Verify SignalWire webhook signature
function verifySignalWireSignature(
  req: Request,
  secret: string
): boolean {
  const signature = req.headers["x-signalwire-signature"] as string;
  if (!signature) return false;

  const body = JSON.stringify(req.body);
  const hash = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("base64");

  return hash === signature;
}

// Incoming call webhook
router.post("/webhooks/signalwire/call-received", async (req: Request, res: Response) => {
  try {
    // WIRE THIS: Verify signature
    if (!verifySignalWireSignature(req, process.env.SIGNALWIRE_WEBHOOK_SECRET || "")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const callData = req.body;

    // WIRE THIS: Queue call handling job
    // await queueCallHandlingJob(callData);

    res.json({ success: true });
  } catch (error) {
    console.error("Error handling call webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Call completed webhook
router.post("/webhooks/signalwire/call-completed", async (req: Request, res: Response) => {
  try {
    // WIRE THIS: Verify signature
    if (!verifySignalWireSignature(req, process.env.SIGNALWIRE_WEBHOOK_SECRET || "")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const callData = req.body;

    // WIRE THIS: Queue post-call processing
    // await queueCallSummaryJob(callData);
    // await queueLeadScoringJob(callData);

    res.json({ success: true });
  } catch (error) {
    console.error("Error handling call completed webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// SMS received webhook
router.post("/webhooks/signalwire/sms-received", async (req: Request, res: Response) => {
  try {
    // WIRE THIS: Verify signature
    if (!verifySignalWireSignature(req, process.env.SIGNALWIRE_WEBHOOK_SECRET || "")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const smsData = req.body;

    // WIRE THIS: Queue SMS handling
    // await queueSMSHandlingJob(smsData);

    res.json({ success: true });
  } catch (error) {
    console.error("Error handling SMS webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// ZAPIER WEBHOOKS
// ============================================================================

// Zapier trigger webhook (when ApexAI event occurs)
router.post("/webhooks/zapier/trigger", async (req: Request, res: Response) => {
  try {
    const { integrationId, eventType, payload } = req.body;

    // WIRE THIS: Get integration from database
    // const integration = await db.query('SELECT * FROM zapier_integrations WHERE id = ?', [integrationId]);

    // WIRE THIS: Send to Zapier webhook
    // await ZapierService.sendEvent(integration.webhook_url, eventType, payload);

    res.json({ success: true });
  } catch (error) {
    console.error("Error handling Zapier webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// SALESFORCE WEBHOOKS
// ============================================================================

// Salesforce change event webhook
router.post("/webhooks/salesforce/change-event", async (req: Request, res: Response) => {
  try {
    // WIRE THIS: Verify Salesforce signature
    // const isValid = verifySalesforceSignature(req);
    // if (!isValid) return res.status(401).json({ error: 'Unauthorized' });

    const changeEvent = req.body;

    // WIRE THIS: Process change event
    // If lead updated in Salesforce, sync back to ApexAI
    // await queueSalesforceChangeJob(changeEvent);

    res.json({ success: true });
  } catch (error) {
    console.error("Error handling Salesforce webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// HUBSPOT WEBHOOKS
// ============================================================================

// HubSpot contact webhook
router.post("/webhooks/hubspot/contact-change", async (req: Request, res: Response) => {
  try {
    // WIRE THIS: Verify HubSpot signature
    // const isValid = verifyHubSpotSignature(req);
    // if (!isValid) return res.status(401).json({ error: 'Unauthorized' });

    const contactData = req.body;

    // WIRE THIS: Process contact change
    // If contact updated in HubSpot, sync back to ApexAI
    // await queueHubSpotChangeJob(contactData);

    res.json({ success: true });
  } catch (error) {
    console.error("Error handling HubSpot webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// INSTAGRAM/WHATSAPP WEBHOOKS
// ============================================================================

// Instagram/WhatsApp message webhook
router.post("/webhooks/instagram/message", async (req: Request, res: Response) => {
  try {
    // WIRE THIS: Verify Meta signature
    // const isValid = verifyMetaSignature(req);
    // if (!isValid) return res.status(401).json({ error: 'Unauthorized' });

    const { entry } = req.body;

    for (const item of entry) {
      for (const change of item.changes) {
        if (change.field === "messages") {
          const message = change.value.messages[0];

          // WIRE THIS: Queue Instagram message handling
          // await queueInstagramMessageJob({
          //   integrationId: req.body.integrationId,
          //   message,
          //   accountId: req.body.accountId,
          // });
        }
      }
    }

    res.status(200).send("EVENT_RECEIVED");
  } catch (error) {
    console.error("Error handling Instagram webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// WEBCHAT WEBHOOKS
// ============================================================================

// Webchat message webhook
router.post("/webhooks/webchat/message", async (req: Request, res: Response) => {
  try {
    const { conversationId, visitorMessage, visitorId } = req.body;

    // WIRE THIS: Store message in database
    // await db.query('INSERT INTO webchat_messages (...) VALUES (...)', [...]);

    // WIRE THIS: Check if should route to agent or auto-respond
    // const hasAvailableAgent = await checkAvailableAgents();
    // if (hasAvailableAgent) {
    //   await queueWebchatRouteJob(conversationId);
    // } else {
    //   await queueWebchatAutoRespondJob(conversationId, visitorMessage);
    // }

    res.json({ success: true });
  } catch (error) {
    console.error("Error handling webchat webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// ANALYTICS WEBHOOKS
// ============================================================================

// Analytics event webhook
router.post("/webhooks/analytics/event", async (req: Request, res: Response) => {
  try {
    const { accountId, eventType, eventData } = req.body;

    // WIRE THIS: Store event in database
    // await db.query('INSERT INTO analytics_events (...) VALUES (...)', [...]);

    res.json({ success: true });
  } catch (error) {
    console.error("Error handling analytics webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

router.get("/webhooks/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default router;

// ============================================================================
// INTEGRATION INSTRUCTIONS
// ============================================================================

/*
TO MOUNT THESE WEBHOOKS IN YOUR EXPRESS SERVER:

1. In your main server.ts file, add:

   import webhookRoutes from './webhooks';
   app.use('/api', webhookRoutes);

2. Configure webhook URLs in your integrations:

   SignalWire:
   - POST https://your-domain.com/api/webhooks/signalwire/call-received
   - POST https://your-domain.com/api/webhooks/signalwire/call-completed
   - POST https://your-domain.com/api/webhooks/signalwire/sms-received

   Zapier:
   - POST https://your-domain.com/api/webhooks/zapier/trigger

   Salesforce:
   - POST https://your-domain.com/api/webhooks/salesforce/change-event

   HubSpot:
   - POST https://your-domain.com/api/webhooks/hubspot/contact-change

   Instagram/WhatsApp:
   - POST https://your-domain.com/api/webhooks/instagram/message

   Webchat:
   - POST https://your-domain.com/api/webhooks/webchat/message

   Analytics:
   - POST https://your-domain.com/api/webhooks/analytics/event

3. Test webhooks:
   curl -X POST http://localhost:3000/api/webhooks/health

4. Monitor webhook logs:
   - Check Redis queue status
   - Monitor BullMQ dashboard (if enabled)
   - Review database webhook_logs table
*/
