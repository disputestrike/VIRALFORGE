// ============================================================================
// APEXAI: DYNAMIC PROMPT ENGINE
// ============================================================================
// Generates context-aware, personalized prompts for the AI agent
// - Adapts to customer behavior in real-time
// - Personalizes based on customer history
// - Optimizes for conversion
// - Maintains natural conversation flow
// ============================================================================

import axios from "axios";

interface CustomerProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  industry: string;
  previousCalls: number;
  lastCallDate: string;
  sentiment: string;
  interests: string[];
  budget: string;
  pain_points: string[];
  previous_objections: string[];
  conversion_status: "cold" | "warm" | "hot" | "converted";
}

interface ConversationState {
  stage: "greeting" | "discovery" | "pitch" | "objection" | "closing";
  duration: number;
  messageCount: number;
  customerSentiment: string;
  agentSentiment: string;
  objections: string[];
  interests_mentioned: string[];
}

export class DynamicPromptEngine {
  private openaiApiKey: string;
  private customerProfile: CustomerProfile | null = null;
  private conversationState: ConversationState = {
    stage: "greeting",
    duration: 0,
    messageCount: 0,
    customerSentiment: "neutral",
    agentSentiment: "professional",
    objections: [],
    interests_mentioned: [],
  };

  constructor(openaiApiKey: string) {
    this.openaiApiKey = openaiApiKey;
  }

  // ========================================================================
  // SYSTEM PROMPT GENERATION
  // ========================================================================

  /**
   * Generate the core system prompt that defines agent behavior
   * This is the "personality" and "instructions" for the AI
   */
  generateSystemPrompt(
    industry: string,
    companyInfo: any,
    callGoal: string
  ): string {
    return `You are an elite sales and customer service AI agent for ${companyInfo.name}.

CORE DIRECTIVES:
1. Sound natural, conversational, and human-like
2. Be empathetic and genuinely interested in helping
3. Ask clarifying questions to understand customer needs
4. Provide personalized solutions based on customer context
5. Handle objections with confidence and data
6. Guide conversation toward conversion naturally
7. Never be pushy or aggressive
8. Build rapport and trust

INDUSTRY CONTEXT: ${industry}
COMPANY: ${companyInfo.name}
CALL GOAL: ${callGoal}

CONVERSATION FLOW:
1. GREETING (0-30 seconds): Warm greeting, establish rapport
2. DISCOVERY (30s-2min): Ask about their situation, pain points, goals
3. PITCH (2-4min): Present solution tailored to their needs
4. OBJECTION HANDLING (as needed): Address concerns with empathy
5. CLOSING (4-5min): Confirm next steps, create urgency if appropriate

TONE GUIDELINES:
- Speak at natural pace (not too fast, not too slow)
- Use the customer's name occasionally (builds rapport)
- Mirror their communication style (if they're formal, be formal; if casual, be casual)
- Show genuine interest in their situation
- Use "we" language (collaborative, not adversarial)
- Avoid corporate jargon unless they use it first

PERSONALIZATION:
- Reference their industry/company when relevant
- Acknowledge their previous interactions if applicable
- Tailor examples to their situation
- Show you understand their specific pain points

CONVERSION FOCUS:
- Identify buying signals early
- Create sense of urgency without pressure
- Offer clear next steps
- Make it easy to say "yes"
- If they're not ready, schedule follow-up

NEVER:
- Interrupt the customer
- Contradict the customer
- Make up information
- Oversell or exaggerate
- Ignore customer concerns
- Be robotic or scripted`;
  }

  /**
   * Generate context-aware prompt for next response
   * Includes conversation history, customer profile, and current state
   */
  async generateContextualPrompt(
    conversationHistory: Array<{ role: string; content: string }>,
    customerProfile: CustomerProfile | null,
    currentState: ConversationState
  ): Promise<string> {
    let prompt = `You are in the ${currentState.stage} stage of a sales call.

CURRENT CONVERSATION STATE:
- Duration: ${currentState.duration}s
- Messages: ${currentState.messageCount}
- Customer Sentiment: ${currentState.customerSentiment}
- Objections Raised: ${currentState.objections.join(", ") || "None"}
- Topics of Interest: ${currentState.interests_mentioned.join(", ") || "None"}

RECENT CONVERSATION:
${conversationHistory
  .slice(-5)
  .map((msg) => `${msg.role}: ${msg.content}`)
  .join("\n")}

`;

    // Add customer profile context if available
    if (customerProfile) {
      prompt += `CUSTOMER PROFILE:
- Name: ${customerProfile.name}
- Company: ${customerProfile.industry}
- Previous Interactions: ${customerProfile.previousCalls}
- Current Status: ${customerProfile.conversion_status}
- Known Pain Points: ${customerProfile.pain_points.join(", ") || "Unknown"}
- Previous Objections: ${customerProfile.previous_objections.join(", ") || "None"}
- Budget Range: ${customerProfile.budget}

`;
    }

    // Add stage-specific guidance
    prompt += this.getStageGuidance(currentState.stage);

    // Add sentiment-aware guidance
    prompt += this.getSentimentGuidance(currentState.customerSentiment);

    // Add objection handling if needed
    if (currentState.objections.length > 0) {
      prompt += this.getObjectionHandlingGuidance(currentState.objections);
    }

    prompt += `

NEXT ACTION:
Generate a natural, conversational response that:
1. Addresses the customer's last message
2. Moves the conversation forward appropriately for the current stage
3. Maintains natural pacing and tone
4. Shows genuine interest and empathy
5. Personalizes based on customer context if available

Keep response concise (1-2 sentences) and natural.`;

    return prompt;
  }

  /**
   * Get stage-specific guidance
   */
  private getStageGuidance(stage: string): string {
    const guidance: Record<string, string> = {
      greeting: `
GREETING STAGE GUIDANCE:
- Introduce yourself and company warmly
- Establish rapport immediately
- Briefly explain why you're calling
- Ask permission to continue
- Keep it short (under 30 seconds)
- Smile in your voice (it's audible!)`,

      discovery: `
DISCOVERY STAGE GUIDANCE:
- Ask open-ended questions about their situation
- Listen more than you talk
- Take mental notes of pain points
- Ask follow-up questions to go deeper
- Build understanding of their needs
- Look for buying signals
- Identify decision makers`,

      pitch: `
PITCH STAGE GUIDANCE:
- Summarize what you learned in discovery
- Connect your solution to their specific needs
- Use data and examples relevant to their industry
- Focus on benefits, not features
- Address anticipated objections proactively
- Create urgency without pressure
- Make the value clear`,

      objection: `
OBJECTION HANDLING GUIDANCE:
- Acknowledge their concern (don't dismiss it)
- Ask clarifying questions
- Provide relevant data or examples
- Offer alternatives or compromises
- Confirm they feel heard
- Move forward when concern is addressed`,

      closing: `
CLOSING STAGE GUIDANCE:
- Summarize the agreement
- Confirm next steps clearly
- Set specific dates/times
- Remove friction (make it easy to say yes)
- Express enthusiasm about working together
- Thank them for their time
- End on positive note`,
    };

    return guidance[stage] || "";
  }

  /**
   * Get sentiment-aware guidance
   */
  private getSentimentGuidance(sentiment: string): string {
    const guidance: Record<string, string> = {
      happy: `
CUSTOMER IS HAPPY:
- They're receptive and engaged
- Move toward closing
- Emphasize benefits they're excited about
- Build on their positive energy
- This is a good time to ask for referrals`,

      frustrated: `
CUSTOMER IS FRUSTRATED:
- Acknowledge their frustration genuinely
- Apologize for any inconvenience
- Focus on solutions, not problems
- Be extra patient and empathetic
- Offer to escalate if needed
- Show you're taking them seriously`,

      confused: `
CUSTOMER IS CONFUSED:
- Simplify your language
- Break down complex concepts
- Use analogies and examples
- Ask if they understand
- Slow down your pace
- Offer to explain differently`,

      skeptical: `
CUSTOMER IS SKEPTICAL:
- Provide data and proof points
- Use case studies or testimonials
- Address objections proactively
- Be honest about limitations
- Show social proof
- Offer trial or guarantee`,

      neutral: `
CUSTOMER IS NEUTRAL:
- Continue building rapport
- Ask more discovery questions
- Look for pain points to address
- Create interest through relevant examples
- Don't push too hard yet`,
    };

    return guidance[sentiment] || "";
  }

  /**
   * Get objection-specific handling guidance
   */
  private getObjectionHandlingGuidance(objections: string[]): string {
    let guidance = "\nOBJECTION HANDLING:\n";

    for (const objection of objections) {
      if (objection.includes("price") || objection.includes("cost")) {
        guidance += `
- PRICE OBJECTION: Focus on ROI and value. Ask what budget they have in mind. Offer payment plans or scaled solutions.`;
      }
      if (objection.includes("time") || objection.includes("busy")) {
        guidance += `
- TIME OBJECTION: Acknowledge they're busy. Offer quick wins or phased approach. Make implementation easy.`;
      }
      if (objection.includes("competitor")) {
        guidance += `
- COMPETITOR OBJECTION: Ask what they like about competitor. Highlight your unique advantages. Offer comparison.`;
      }
      if (objection.includes("need")) {
        guidance += `
- NEED OBJECTION: Ask discovery questions to uncover hidden needs. Show how problem will get worse without solution.`;
      }
    }

    return guidance;
  }

  // ========================================================================
  // DYNAMIC PROMPT ADAPTATION
  // ========================================================================

  /**
   * Update conversation state based on latest message
   */
  updateConversationState(
    userMessage: string,
    agentResponse: string,
    sentiment: { customer: string; agent: string },
    duration: number
  ): void {
    this.conversationState = {
      ...this.conversationState,
      duration,
      messageCount: this.conversationState.messageCount + 1,
      customerSentiment: sentiment.customer,
      agentSentiment: sentiment.agent,
    };

    // Detect stage transitions
    this.conversationState.stage = this.detectStage(
      userMessage,
      this.conversationState.messageCount,
      duration
    );

    // Extract objections
    if (this.isObjection(userMessage)) {
      const objection = this.extractObjection(userMessage);
      if (objection && !this.conversationState.objections.includes(objection)) {
        this.conversationState.objections.push(objection);
      }
    }

    // Extract interests
    const interests = this.extractInterests(userMessage);
    this.conversationState.interests_mentioned = [
      ...new Set([...this.conversationState.interests_mentioned, ...interests]),
    ];
  }

  /**
   * Detect conversation stage based on context
   */
  private detectStage(
    userMessage: string,
    messageCount: number,
    duration: number
  ): ConversationState["stage"] {
    // Greeting stage: first 1-2 messages or under 30 seconds
    if (messageCount <= 2 || duration < 30) {
      return "greeting";
    }

    // Objection stage: if objections detected
    if (this.conversationState.objections.length > 0) {
      return "objection";
    }

    // Closing stage: if duration > 4 minutes and interests expressed
    if (duration > 240 && this.conversationState.interests_mentioned.length > 0) {
      return "closing";
    }

    // Pitch stage: if discovery questions answered
    if (messageCount > 5 && duration > 90) {
      return "pitch";
    }

    // Default: discovery stage
    return "discovery";
  }

  /**
   * Detect if message contains an objection
   */
  private isObjection(message: string): boolean {
    const objectionKeywords = [
      "but",
      "however",
      "problem",
      "issue",
      "concern",
      "worry",
      "expensive",
      "cost",
      "price",
      "too much",
      "don't need",
      "not sure",
      "hesitant",
      "competitor",
      "already have",
      "can't afford",
      "no time",
      "busy",
    ];

    return objectionKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword)
    );
  }

  /**
   * Extract objection type from message
   */
  private extractObjection(message: string): string | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes("price") || lowerMessage.includes("cost")) {
      return "price";
    }
    if (lowerMessage.includes("time") || lowerMessage.includes("busy")) {
      return "time";
    }
    if (lowerMessage.includes("competitor")) {
      return "competitor";
    }
    if (lowerMessage.includes("don't need") || lowerMessage.includes("no need")) {
      return "need";
    }

    return null;
  }

  /**
   * Extract topics of interest from message
   */
  private extractInterests(message: string): string[] {
    const interests: string[] = [];

    // Look for positive indicators
    if (
      message.includes("interested") ||
      message.includes("sounds good") ||
      message.includes("tell me more") ||
      message.includes("how does it work")
    ) {
      interests.push("engaged");
    }

    // Look for specific features mentioned
    if (message.includes("automation")) interests.push("automation");
    if (message.includes("integration")) interests.push("integration");
    if (message.includes("reporting")) interests.push("reporting");
    if (message.includes("analytics")) interests.push("analytics");
    if (message.includes("support")) interests.push("support");
    if (message.includes("training")) interests.push("training");

    return interests;
  }

  // ========================================================================
  // PERSONALIZATION ENGINE
  // ========================================================================

  /**
   * Personalize response based on customer profile
   */
  personalizeResponse(
    baseResponse: string,
    customerProfile: CustomerProfile | null
  ): string {
    if (!customerProfile) return baseResponse;

    let personalized = baseResponse;

    // Add customer name occasionally
    if (Math.random() < 0.3) {
      personalized = personalized.replace(
        /^/,
        `${customerProfile.name}, `
      );
    }

    // Reference their industry
    if (customerProfile.industry) {
      personalized = personalized.replace(
        /in your industry/g,
        `in ${customerProfile.industry}`
      );
    }

    // Reference their pain points
    if (customerProfile.pain_points.length > 0) {
      const painPoint = customerProfile.pain_points[0];
      personalized = personalized.replace(
        /common challenge/g,
        `challenge with ${painPoint}`
      );
    }

    // Reference previous interactions
    if (customerProfile.previousCalls > 0) {
      personalized = personalized.replace(
        /as we discussed/g,
        `as we discussed before`
      );
    }

    return personalized;
  }

  /**
   * Generate industry-specific examples
   */
  generateIndustryExample(industry: string, topic: string): string {
    const examples: Record<string, Record<string, string>> = {
      solar: {
        roi: "A typical solar installation sees ROI in 5-7 years with 25% energy savings",
        integration:
          "Our system integrates with SolarEdge and Enphase monitoring",
        support: "We provide 24/7 support for system monitoring and troubleshooting",
      },
      hvac: {
        roi: "HVAC companies using our platform see 30% faster job completion",
        integration:
          "We integrate with Carrier, Trane, and Lennox systems",
        support: "Dedicated HVAC support team available during business hours",
      },
      roofing: {
        roi: "Roofing contractors report 40% increase in quote-to-close rate",
        integration:
          "We connect with Xactimate and other roofing software",
        support: "Roofing-specific training and templates included",
      },
    };

    return (
      examples[industry.toLowerCase()]?.[topic.toLowerCase()] ||
      "Let me show you a relevant example..."
    );
  }

  // ========================================================================
  // CONVERSION OPTIMIZATION
  // ========================================================================

  /**
   * Generate conversion-focused closing statement
   */
  generateClosingStatement(
    customerProfile: CustomerProfile | null,
    interests: string[]
  ): string {
    const baseClosings = [
      "So let's get you set up. What day works best for a quick onboarding call?",
      "I think we're a great fit. Should we schedule a time to get started?",
      "Based on what you've shared, I'm confident this will help. When can we begin?",
      "You're going to love how this transforms your workflow. Let's lock in a start date.",
      "This is exactly what you need. Can we schedule implementation this week?",
    ];

    let closing =
      baseClosings[Math.floor(Math.random() * baseClosings.length)];

    // Personalize based on profile
    if (customerProfile?.conversion_status === "hot") {
      closing = `Perfect, ${customerProfile.name}. Let's move forward. When can we get started?`;
    }

    // Add urgency if appropriate
    if (interests.includes("engaged")) {
      closing += " I have availability tomorrow or Thursday.";
    }

    return closing;
  }

  /**
   * Suggest next best action based on conversation state
   */
  suggestNextAction(): {
    action: string;
    reason: string;
    timing: string;
  } {
    const stage = this.conversationState.stage;
    const sentiment = this.conversationState.customerSentiment;
    const objectionCount = this.conversationState.objections.length;

    if (stage === "greeting") {
      return {
        action: "Move to discovery",
        reason: "Customer is engaged",
        timing: "After 30 seconds",
      };
    }

    if (objectionCount > 2 && sentiment === "frustrated") {
      return {
        action: "Offer escalation",
        reason: "Multiple objections and frustration detected",
        timing: "Immediately",
      };
    }

    if (stage === "pitch" && sentiment === "happy") {
      return {
        action: "Move to closing",
        reason: "Customer is receptive",
        timing: "Next message",
      };
    }

    if (stage === "closing") {
      return {
        action: "Confirm next steps",
        reason: "Conversation is ready to close",
        timing: "Immediately",
      };
    }

    return {
      action: "Continue discovery",
      reason: "Need more information",
      timing: "Next message",
    };
  }

  // ========================================================================
  // EXPORT METHODS
  // ========================================================================

  setCustomerProfile(profile: CustomerProfile): void {
    this.customerProfile = profile;
  }

  getConversationState(): ConversationState {
    return this.conversationState;
  }

  resetConversation(): void {
    this.conversationState = {
      stage: "greeting",
      duration: 0,
      messageCount: 0,
      customerSentiment: "neutral",
      agentSentiment: "professional",
      objections: [],
      interests_mentioned: [],
    };
  }
}

export default DynamicPromptEngine;
