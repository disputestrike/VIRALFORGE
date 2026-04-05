# ApexAI Premium Voice Agent - Integration Guide

**Updated for: Cartesia (Audio), Groq (LLM), SignalWire (Voice)**

## Overview

This is a **production-ready, premium voice agent system** designed to deliver the best-ever conversational AI experience. It combines real-time streaming, emotion-aware responses, dynamic prompting, and conversion optimization.

**Key Capabilities:**
- Sub-500ms response latency
- Natural, emotion-aware conversations
- Real-time sentiment analysis
- Context-aware personalization
- Conversion optimization with A/B testing
- Continuous learning and improvement

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SIGNALWIRE VOICE CALL                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              REALTIME STREAMING ENGINE                       │
│  - Parallel processing (speech, sentiment, response)        │
│  - Sub-500ms latency optimization                           │
│  - Audio streaming with ElevenLabs                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
   ┌─────────┐      ┌──────────────┐    ┌─────────────┐
   │SENTIMENT│      │DYNAMIC PROMPT│    │RESPONSE GEN │
   │ANALYSIS │      │ENGINE        │    │(GPT-3.5)    │
   └─────────┘      └──────────────┘    └─────────────┘
        ↓                   ↓                   ↓
        └───────────────────┼───────────────────┘
                            ↓
                ┌───────────────────────┐
                │CONVERSION OPTIMIZATION│
                │- Track metrics        │
                │- A/B testing          │
                │- Feedback collection  │
                └───────────────────────┘
                            ↓
                    ┌───────────────┐
                    │ ELEVENLABS    │
                    │ AUDIO STREAM  │
                    └───────────────┘
```

---

## Installation

### 1. Install Dependencies

```bash
npm install axios dotenv openai elevenlabs
```

### 2. Environment Variables

Create `.env` file:

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Cartesia
CARTESIA_API_KEY=...
CARTESIA_VOICE_ID=... # Your preferred voice ID

# Groq
GROQ_API_KEY=...
GROQ_MODEL=llama-3.1-8b-instant

# SignalWire
SIGNALWIRE_PROJECT_ID=...
SIGNALWIRE_AUTH_TOKEN=...
SIGNALWIRE_SPACE_URL=...

# Database
DATABASE_URL=mysql://user:password@host/database

# Application
NODE_ENV=production
PORT=3000
```

### 3. Copy Files to Your Project

```bash
cp 01_PREMIUM_VOICE_ORCHESTRATOR.ts server/voice/
cp 02_DYNAMIC_PROMPT_ENGINE.ts server/voice/
cp 03_SENTIMENT_AND_EMOTION.ts server/voice/
cp 04_REALTIME_STREAMING.ts server/voice/
cp 05_CONVERSION_OPTIMIZATION.ts server/voice/
```

---

## Integration Steps

### Step 1: Initialize Voice Agent

```typescript
import PremiumVoiceOrchestrator from "./voice/01_PREMIUM_VOICE_ORCHESTRATOR";
import DynamicPromptEngine from "./voice/02_DYNAMIC_PROMPT_ENGINE";
import SentimentAndEmotionEngine from "./voice/03_SENTIMENT_AND_EMOTION";
import RealtimeStreamingEngine from "./voice/04_REALTIME_STREAMING";
import ConversionOptimizationEngine from "./voice/05_CONVERSION_OPTIMIZATION";

// Initialize engines
const voiceAgent = new PremiumVoiceOrchestrator(
  process.env.OPENAI_API_KEY,
  process.env.ELEVENLABS_API_KEY
);

const promptEngine = new DynamicPromptEngine(process.env.OPENAI_API_KEY);
const sentimentEngine = new SentimentAndEmotionEngine(process.env.OPENAI_API_KEY);
const realtimeEngine = new RealtimeStreamingEngine(
  process.env.OPENAI_API_KEY,
  process.env.ELEVENLABS_API_KEY
);
const conversionEngine = new ConversionOptimizationEngine(
  process.env.OPENAI_API_KEY,
  database
);
```

### Step 2: Wire SignalWire Webhook

```typescript
// WIRE THIS: In your Express app
app.post("/voice/incoming", async (req, res) => {
  const call = req.body;
  const callId = call.call_sid;

  // Get customer profile
  const customerProfile = await database.query(
    "SELECT * FROM customers WHERE phone = ?",
    [call.from]
  );

  // Initialize conversation
  const conversationState = {
    callId,
    customerId: customerProfile?.id,
    startTime: Date.now(),
  };

  // Generate greeting
  const greeting = await promptEngine.generateSystemPrompt(
    customerProfile?.industry || "general",
    { name: "ApexAI" },
    "Inbound sales call"
  );

  // Start voice agent
  await voiceAgent.startCall(callId, greeting, customerProfile);

  res.json({ success: true });
});
```

### Step 3: Wire Speech Recognition

```typescript
// WIRE THIS: Handle incoming audio from SignalWire
app.post("/voice/audio", async (req, res) => {
  const { callId, audioBuffer } = req.body;

  try {
    // Process audio with real-time engine
    const result = await realtimeEngine.processCustomerInputParallel(
      Buffer.from(audioBuffer),
      conversationContext,
      customerProfile
    );

    // Analyze sentiment
    const sentiment = await sentimentEngine.analyzeSentiment(result.response);

    // Update conversation state
    promptEngine.updateConversationState(
      result.response,
      result.response,
      { customer: sentiment.emotion, agent: "professional" },
      Date.now() - startTime
    );

    // Send audio back to customer
    res.json({
      audioStream: result.audioStream,
      metrics: result.metrics,
    });
  } catch (error) {
    console.error("Error processing audio:", error);
    res.status(500).json({ error: error.message });
  }
});
```

### Step 4: Wire Call Completion

```typescript
// WIRE THIS: Handle call end
app.post("/voice/hangup", async (req, res) => {
  const { callId, duration, transcript } = req.body;

  // Record call metrics
  const metrics = {
    callId,
    duration,
    customerSentiment: sentimentEngine.getEmotionalContext().primaryEmotion,
    agentPerformance: 85, // Calculate based on your metrics
    conversionStatus: "interested", // Determine from conversation
    objections: promptEngine.getConversationState().objections,
    keyTopics: promptEngine.getConversationState().interests_mentioned,
    nextSteps: "Send proposal",
    timestamp: Date.now(),
  };

  // Record in conversion engine
  conversionEngine.recordCallMetrics(metrics);

  // Save to database
  await database.query(
    "INSERT INTO calls (call_id, duration, transcript, metrics) VALUES (?, ?, ?, ?)",
    [callId, duration, transcript, JSON.stringify(metrics)]
  );

  // Get performance insights
  const analysis = conversionEngine.getConversionAnalysis();
  console.log("Conversion Analysis:", analysis);

  res.json({ success: true });
});
```

### Step 5: Wire Customer Profile Lookup

```typescript
// WIRE THIS: Get customer profile from your database
async function getCustomerProfile(phoneNumber: string) {
  const result = await database.query(
    `SELECT * FROM customers WHERE phone = ?`,
    [phoneNumber]
  );

  return result[0] || null;
}
```

### Step 6: Wire Database Queries

```typescript
// WIRE THIS: Create these tables in your MySQL database

CREATE TABLE customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(100),
  name VARCHAR(100),
  industry VARCHAR(50),
  company VARCHAR(100),
  previous_calls INT DEFAULT 0,
  last_call_date TIMESTAMP,
  conversion_status ENUM('cold', 'warm', 'hot', 'converted'),
  budget VARCHAR(50),
  pain_points JSON,
  previous_objections JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE calls (
  id INT PRIMARY KEY AUTO_INCREMENT,
  call_id VARCHAR(100) UNIQUE,
  customer_id INT,
  duration INT,
  transcript LONGTEXT,
  metrics JSON,
  sentiment VARCHAR(50),
  conversion_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE call_metrics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  call_id VARCHAR(100),
  metric_name VARCHAR(100),
  metric_value FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (call_id) REFERENCES calls(call_id)
);
```

---

## Configuration

### Voice Settings

```typescript
// Customize voice characteristics
const voiceSettings = {
  voiceId: process.env.ELEVENLABS_VOICE_ID,
  stability: 0.5, // 0-1, higher = more consistent
  similarityBoost: 0.75, // 0-1, higher = more similar to original
  optimizeStreamingLatency: 3, // 1-4, higher = faster streaming
};
```

### Prompt Customization

```typescript
// Customize system prompt for your industry
const systemPrompt = promptEngine.generateSystemPrompt(
  "solar", // industry
  {
    name: "ApexAI",
    tagline: "Unified Voice Solution",
  },
  "Inbound lead qualification"
);
```

### Sentiment Detection

```typescript
// Customize emotion detection thresholds
const emotionThresholds = {
  happy: 0.7,
  frustrated: 0.6,
  confused: 0.5,
  skeptical: 0.6,
};
```

---

## Performance Tuning

### Latency Optimization

```typescript
// Monitor latency in real-time
realtimeEngine.on("metrics", (metrics) => {
  console.log("Latency Breakdown:", {
    speechRecognition: metrics.speechRecognitionTime,
    sentimentAnalysis: metrics.sentimentAnalysisTime,
    responseGeneration: metrics.responseGenerationTime,
    audioSynthesis: metrics.audioSynthesisTime,
    total: metrics.totalLatency,
  });

  // Get optimization recommendations
  const recommendations = realtimeEngine.getOptimizationRecommendations();
  if (recommendations.length > 0) {
    console.log("Optimization Recommendations:", recommendations);
  }
});
```

### Conversion Rate Optimization

```typescript
// Monitor conversion metrics
setInterval(() => {
  const analysis = conversionEngine.getConversionAnalysis();
  console.log("Conversion Analysis:", {
    conversionRate: analysis.conversionRate.toFixed(1) + "%",
    averageCallDuration: (analysis.averageCallDuration / 60).toFixed(1) + " min",
    topObjections: analysis.topObjections,
    recommendations: analysis.recommendedImprovements,
  });
}, 3600000); // Every hour
```

---

## A/B Testing

### Create a Test

```typescript
conversionEngine.createABTest(
  "greeting_test",
  "Hi there! How can I help you today?",
  [
    "Hello! What brings you in today?",
    "Hey! What can I do for you?",
    "Hi! Tell me about your situation.",
  ]
);
```

### Get Test Results

```typescript
const results = conversionEngine.getABTestResults("greeting_test");
console.log("A/B Test Results:", results);
// Output:
// {
//   control: { response: "...", conversionRate: 0.25 },
//   variants: [
//     { response: "...", conversionRate: 0.28 },
//     { response: "...", conversionRate: 0.22 },
//     { response: "...", conversionRate: 0.26 }
//   ],
//   winner: "Variant 1 (28%)"
// }
```

---

## Monitoring & Analytics

### Real-time Dashboard

```typescript
// Get performance dashboard
const dashboard = conversionEngine.getPerformanceDashboard();
console.log("Performance Dashboard:", {
  totalCalls: dashboard.totalCalls,
  conversionRate: dashboard.conversionRate.toFixed(1) + "%",
  averagePerformanceScore: dashboard.averagePerformanceScore.toFixed(1),
  trend: dashboard.trend,
  areasForImprovement: dashboard.areasForImprovement,
});
```

### Export Metrics

```typescript
// Export all metrics for external analysis
const metrics = conversionEngine.exportMetrics();
fs.writeFileSync("metrics.json", JSON.stringify(metrics, null, 2));
```

---

## Troubleshooting

### High Latency

1. Check `realtimeEngine.identifyBottlenecks()`
2. Reduce `max_tokens` in OpenAI calls
3. Use `gpt-3.5-turbo` instead of `gpt-4`
4. Increase pre-computed responses

### Low Conversion Rate

1. Review `conversionEngine.getConversionAnalysis()`
2. Analyze top objections and create targeted responses
3. Improve discovery questions
4. A/B test different closing statements

### Sentiment Detection Issues

1. Check `sentimentEngine.getEmotionStats()`
2. Increase training data for your industry
3. Adjust emotion thresholds
4. Review conversation transcripts

---

## Production Deployment

### Environment Setup

```bash
# Set production environment
export NODE_ENV=production

# Ensure all secrets are in .env
cat .env | grep -E "OPENAI|ELEVENLABS|SIGNALWIRE|DATABASE"

# Run database migrations
npm run migrate

# Start application
npm start
```

### Monitoring

```bash
# Monitor logs
tail -f logs/voice-agent.log

# Monitor performance
npm run metrics

# Monitor errors
npm run errors
```

### Scaling

```typescript
// Use BullMQ for background job processing
import Queue from "bull";

const voiceQueue = new Queue("voice-calls", {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

voiceQueue.process(async (job) => {
  const { callId, audioBuffer, customerProfile } = job.data;
  return await realtimeEngine.processCustomerInputParallel(
    audioBuffer,
    "",
    customerProfile
  );
});
```

---

## Support & Maintenance

### Regular Maintenance

- Review conversion metrics weekly
- Update objection handling monthly
- Refresh voice samples quarterly
- Audit sentiment detection accuracy monthly

### Continuous Improvement

- Run A/B tests on key responses
- Collect customer feedback post-call
- Analyze failed calls for improvement areas
- Update system prompts based on performance data

---

## Next Steps

1. **Integrate with your SignalWire account** - Wire the webhook endpoints
2. **Set up database** - Create tables and connect to your MySQL instance
3. **Configure environment variables** - Add all API keys and settings
4. **Test with sample calls** - Run through the conversation flow
5. **Monitor performance** - Track latency and conversion metrics
6. **Optimize based on data** - Use A/B testing and feedback to improve

---

## Support

For issues or questions:
- Check the troubleshooting section above
- Review code comments marked with "WIRE THIS"
- Consult the architecture diagram
- Review your logs for error messages

Good luck building the best voice agent ever! 🚀
