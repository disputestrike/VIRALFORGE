// ============================================================================
// APEXAI: SENTIMENT & EMOTION ANALYSIS ENGINE
// ============================================================================
// Analyzes customer emotion in real-time and adapts agent responses
// - Detects sentiment from speech and text
// - Measures emotional intensity
// - Adapts tone and strategy based on emotion
// - Generates empathetic responses
// ============================================================================

import axios from "axios";

export interface SentimentAnalysis {
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
  emotion: string;
  intensity: number; // 0-1
  keywords: string[];
  reasoning: string;
}

export interface EmotionalContext {
  primaryEmotion: string;
  secondaryEmotions: string[];
  intensity: number;
  trend: "improving" | "declining" | "stable";
  triggers: string[];
}

export class SentimentAndEmotionEngine {
  private openaiApiKey: string;
  private emotionHistory: Array<{
    emotion: string;
    intensity: number;
    timestamp: number;
  }> = [];

  constructor(openaiApiKey: string) {
    this.openaiApiKey = openaiApiKey;
  }

  // ========================================================================
  // SENTIMENT ANALYSIS
  // ========================================================================

  /**
   * Analyze sentiment from customer message
   * Uses OpenAI to understand nuance beyond simple positive/negative
   */
  async analyzeSentiment(message: string): Promise<SentimentAnalysis> {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are an expert at analyzing customer sentiment and emotion. 
Analyze the following customer message and provide:
1. Overall sentiment (positive, negative, or neutral)
2. Confidence level (0-1)
3. Primary emotion (happy, frustrated, confused, skeptical, neutral, etc.)
4. Emotional intensity (0-1, where 1 is extremely emotional)
5. Key emotional keywords
6. Brief reasoning

Respond in JSON format:
{
  "sentiment": "positive|negative|neutral",
  "confidence": 0.95,
  "emotion": "happy|frustrated|confused|skeptical|neutral|angry|excited|worried",
  "intensity": 0.7,
  "keywords": ["word1", "word2"],
  "reasoning": "explanation"
}`,
            },
            {
              role: "user",
              content: `Analyze this customer message: "${message}"`,
            },
          ],
          temperature: 0.3,
          max_tokens: 300,
        },
        {
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const analysisText =
        response.data.choices[0].message.content;
      const analysis = JSON.parse(analysisText);

      // Track emotion history
      this.emotionHistory.push({
        emotion: analysis.emotion,
        intensity: analysis.intensity,
        timestamp: Date.now(),
      });

      return analysis;
    } catch (error) {
      console.error("Error analyzing sentiment:", error);
      // Return neutral analysis on error
      return {
        sentiment: "neutral",
        confidence: 0.5,
        emotion: "neutral",
        intensity: 0,
        keywords: [],
        reasoning: "Analysis unavailable",
      };
    }
  }

  /**
   * Analyze sentiment from speech transcription
   * Can detect emotion markers like hesitation, repetition, etc.
   */
  analyzeSentimentFromSpeech(
    transcription: string,
    audioMetrics?: {
      pace: number; // words per minute
      volume: number; // 0-1
      pitch: number; // Hz or relative
      pauses: number; // count of pauses
    }
  ): SentimentAnalysis {
    let emotion = "neutral";
    let intensity = 0;
    const keywords: string[] = [];

    // Analyze text content
    const lowerText = transcription.toLowerCase();

    // Detect frustration markers
    if (
      lowerText.includes("ugh") ||
      lowerText.includes("frustrated") ||
      lowerText.includes("annoyed") ||
      lowerText.includes("can't") ||
      lowerText.includes("won't")
    ) {
      emotion = "frustrated";
      intensity = Math.max(intensity, 0.7);
      keywords.push("frustration");
    }

    // Detect happiness markers
    if (
      lowerText.includes("great") ||
      lowerText.includes("amazing") ||
      lowerText.includes("love") ||
      lowerText.includes("perfect") ||
      lowerText.includes("excellent")
    ) {
      emotion = "happy";
      intensity = Math.max(intensity, 0.8);
      keywords.push("enthusiasm");
    }

    // Detect confusion markers
    if (
      lowerText.includes("confused") ||
      lowerText.includes("don't understand") ||
      lowerText.includes("what do you mean") ||
      lowerText.includes("huh") ||
      lowerText.includes("pardon")
    ) {
      emotion = "confused";
      intensity = Math.max(intensity, 0.6);
      keywords.push("confusion");
    }

    // Detect skepticism markers
    if (
      lowerText.includes("really") ||
      lowerText.includes("sure about") ||
      lowerText.includes("prove it") ||
      lowerText.includes("sounds like") ||
      lowerText.includes("not convinced")
    ) {
      emotion = "skeptical";
      intensity = Math.max(intensity, 0.6);
      keywords.push("skepticism");
    }

    // Analyze audio metrics if provided
    if (audioMetrics) {
      // Fast pace + high volume = excitement or frustration
      if (audioMetrics.pace > 150 && audioMetrics.volume > 0.7) {
        if (emotion === "happy") {
          intensity = Math.min(1, intensity + 0.2);
        } else {
          emotion = "frustrated";
          intensity = Math.min(1, intensity + 0.2);
        }
      }

      // Slow pace + low volume = sadness or resignation
      if (audioMetrics.pace < 100 && audioMetrics.volume < 0.4) {
        emotion = "resigned";
        intensity = Math.max(intensity, 0.5);
      }

      // Many pauses = thinking, confusion, or hesitation
      if (audioMetrics.pauses > 5) {
        if (emotion !== "happy") {
          emotion = "confused";
          intensity = Math.max(intensity, 0.5);
        }
      }
    }

    // Determine overall sentiment
    let sentiment: "positive" | "negative" | "neutral" = "neutral";
    if (
      emotion === "happy" ||
      emotion === "excited" ||
      emotion === "enthusiastic"
    ) {
      sentiment = "positive";
    } else if (
      emotion === "frustrated" ||
      emotion === "angry" ||
      emotion === "resigned"
    ) {
      sentiment = "negative";
    }

    return {
      sentiment,
      confidence: 0.75,
      emotion,
      intensity,
      keywords,
      reasoning: `Detected ${emotion} based on language patterns and audio characteristics`,
    };
  }

  // ========================================================================
  // EMOTION TRACKING
  // ========================================================================

  /**
   * Get emotional trend over conversation
   */
  getEmotionalTrend(): "improving" | "declining" | "stable" {
    if (this.emotionHistory.length < 2) return "stable";

    const recent = this.emotionHistory.slice(-5);
    const intensities = recent.map((e) => e.intensity);

    const avgFirst = intensities.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
    const avgLast = intensities.slice(-2).reduce((a, b) => a + b, 0) / 2;

    if (avgLast > avgFirst + 0.2) return "declining"; // Getting more emotional
    if (avgLast < avgFirst - 0.2) return "improving"; // Getting less emotional
    return "stable";
  }

  /**
   * Get emotional context for agent response
   */
  getEmotionalContext(): EmotionalContext {
    if (this.emotionHistory.length === 0) {
      return {
        primaryEmotion: "neutral",
        secondaryEmotions: [],
        intensity: 0,
        trend: "stable",
        triggers: [],
      };
    }

    const recent = this.emotionHistory.slice(-5);
    const emotions = recent.map((e) => e.emotion);
    const intensities = recent.map((e) => e.intensity);

    // Count emotion frequency
    const emotionCounts: Record<string, number> = {};
    emotions.forEach((e) => {
      emotionCounts[e] = (emotionCounts[e] || 0) + 1;
    });

    const sorted = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);
    const primaryEmotion = sorted[0]?.[0] || "neutral";
    const secondaryEmotions = sorted.slice(1).map((e) => e[0]);

    const avgIntensity =
      intensities.reduce((a, b) => a + b, 0) / intensities.length;
    const trend = this.getEmotionalTrend();

    return {
      primaryEmotion,
      secondaryEmotions,
      intensity: avgIntensity,
      trend,
      triggers: this.extractEmotionTriggers(),
    };
  }

  /**
   * Extract what triggered the emotions
   */
  private extractEmotionTriggers(): string[] {
    // WIRE THIS: Analyze conversation history to identify triggers
    // For now, return common triggers
    return ["pricing", "timeline", "competitor comparison"];
  }

  // ========================================================================
  // EMOTION-AWARE RESPONSE GENERATION
  // ========================================================================

  /**
   * Generate response adapted to customer emotion
   */
  async generateEmotionAwareResponse(
    customerMessage: string,
    sentiment: SentimentAnalysis,
    conversationContext: string
  ): Promise<string> {
    const emotionalGuidance = this.getEmotionalGuidance(sentiment.emotion);

    const prompt = `
You are a highly empathetic AI sales agent. The customer has just said:
"${customerMessage}"

EMOTIONAL ANALYSIS:
- Emotion: ${sentiment.emotion}
- Intensity: ${sentiment.intensity}/1
- Sentiment: ${sentiment.sentiment}
- Keywords: ${sentiment.keywords.join(", ")}

EMOTIONAL GUIDANCE:
${emotionalGuidance}

CONVERSATION CONTEXT:
${conversationContext}

Generate a response that:
1. Acknowledges their emotional state
2. Shows genuine empathy
3. Addresses their concern
4. Moves the conversation forward
5. Maintains natural, conversational tone

Keep it concise (1-2 sentences) and authentic.`;

    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "You are an expert at generating empathetic responses.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 150,
        },
        {
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error("Error generating emotion-aware response:", error);
      return "I understand. Tell me more about that.";
    }
  }

  /**
   * Get guidance for responding to specific emotion
   */
  private getEmotionalGuidance(emotion: string): string {
    const guidance: Record<string, string> = {
      happy: `The customer is in a positive mood. They're receptive and engaged. 
- Reinforce their positive feelings
- Move toward closing or upselling
- Use their enthusiasm to build momentum
- Offer premium options or add-ons`,

      frustrated: `The customer is frustrated. They may be experiencing problems or unmet expectations.
- Acknowledge their frustration genuinely
- Apologize for any inconvenience
- Take responsibility (even if not your fault)
- Focus on solutions, not problems
- Show you're taking them seriously
- Offer concrete next steps`,

      angry: `The customer is angry. This is urgent and needs careful handling.
- Remain calm and professional
- Never defend or argue
- Validate their feelings
- Apologize sincerely
- Offer immediate solutions
- Consider escalation if needed`,

      confused: `The customer is confused. They don't understand something.
- Simplify your language
- Break down complex ideas
- Use analogies and examples
- Ask if they understand
- Slow down your pace
- Offer to explain differently`,

      skeptical: `The customer is skeptical. They don't believe your claims.
- Provide data and proof points
- Use case studies and testimonials
- Address objections proactively
- Be honest about limitations
- Show social proof
- Offer trial or guarantee`,

      excited: `The customer is excited. They're interested and engaged.
- Match their energy
- Capitalize on their interest
- Provide more details about benefits
- Move toward closing
- Make it easy to say yes
- Create urgency if appropriate`,

      worried: `The customer is worried. They have concerns about risk or consequences.
- Acknowledge their concerns
- Provide reassurance with data
- Explain risk mitigation
- Offer guarantees or warranties
- Share success stories
- Be transparent about challenges`,

      neutral: `The customer is neutral. They're listening but not highly engaged.
- Ask more discovery questions
- Look for pain points
- Create interest through relevant examples
- Build rapport
- Look for buying signals
- Don't push too hard yet`,
    };

    return (
      guidance[emotion] ||
      "The customer's emotional state is unclear. Continue with empathy and active listening."
    );
  }

  // ========================================================================
  // TONE ADJUSTMENT
  // ========================================================================

  /**
   * Generate tone adjustments for voice synthesis
   * Returns parameters for ElevenLabs or other voice providers
   */
  getToneAdjustments(emotion: string): {
    speed: number;
    pitch: number;
    stability: number;
    emphasis: string[];
  } {
    const toneMap: Record<
      string,
      { speed: number; pitch: number; stability: number; emphasis: string[] }
    > = {
      happy: {
        speed: 1.1, // Faster, more energetic
        pitch: 1.1, // Higher pitch
        stability: 0.6, // More variation for enthusiasm
        emphasis: ["great", "amazing", "wonderful", "perfect"],
      },
      frustrated: {
        speed: 0.9, // Slower, more deliberate
        pitch: 0.95, // Slightly lower
        stability: 0.8, // More consistent
        emphasis: ["understand", "help", "solution"],
      },
      angry: {
        speed: 0.85, // Much slower
        pitch: 0.9, // Lower pitch
        stability: 0.9, // Very consistent
        emphasis: ["sincerely", "apologize", "immediately"],
      },
      confused: {
        speed: 0.95, // Slower for clarity
        pitch: 1.0, // Normal pitch
        stability: 0.85, // Clear and consistent
        emphasis: ["explain", "understand", "clear"],
      },
      skeptical: {
        speed: 1.0, // Normal pace
        pitch: 1.0, // Normal pitch
        stability: 0.9, // Consistent and confident
        emphasis: ["proven", "data", "results", "guarantee"],
      },
      excited: {
        speed: 1.15, // Faster, more energetic
        pitch: 1.15, // Higher pitch
        stability: 0.5, // More variation
        emphasis: ["fantastic", "incredible", "opportunity"],
      },
      worried: {
        speed: 0.9, // Slower, reassuring
        pitch: 0.95, // Slightly lower
        stability: 0.85, // Consistent and calm
        emphasis: ["safe", "protected", "guarantee", "proven"],
      },
      neutral: {
        speed: 1.0,
        pitch: 1.0,
        stability: 0.8,
        emphasis: [],
      },
    };

    return toneMap[emotion] || toneMap.neutral;
  }

  // ========================================================================
  // EMPATHY STATEMENTS
  // ========================================================================

  /**
   * Generate contextual empathy statements
   */
  generateEmpathyStatement(
    emotion: string,
    context?: string
  ): string {
    const statements: Record<string, string[]> = {
      frustrated: [
        "I completely understand your frustration.",
        "That sounds really frustrating. I'm here to help.",
        "I can see why you'd feel that way.",
        "Your frustration is totally valid.",
      ],
      angry: [
        "I sincerely apologize for this situation.",
        "I understand you're upset, and that's completely justified.",
        "I'm truly sorry about this. Let's fix it right now.",
        "Your anger is justified. I'm going to make this right.",
      ],
      confused: [
        "Let me clarify that for you.",
        "I can explain this more clearly.",
        "Let me break this down step by step.",
        "I understand the confusion. Let me help.",
      ],
      worried: [
        "Your concerns are completely valid.",
        "I understand why you'd worry about that.",
        "Let me address your concerns directly.",
        "Your caution is wise. Here's how we mitigate that risk.",
      ],
      excited: [
        "I love your enthusiasm!",
        "That's fantastic!",
        "I'm excited about this too!",
        "Your energy is contagious!",
      ],
    };

    const options = statements[emotion] || ["I understand."];
    return options[Math.floor(Math.random() * options.length)];
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Clear emotion history (end of call)
   */
  clearHistory(): void {
    this.emotionHistory = [];
  }

  /**
   * Get emotion statistics for call analysis
   */
  getEmotionStats(): {
    dominantEmotion: string;
    emotionDistribution: Record<string, number>;
    averageIntensity: number;
    trend: string;
  } {
    const emotionCounts: Record<string, number> = {};
    let totalIntensity = 0;

    this.emotionHistory.forEach((entry) => {
      emotionCounts[entry.emotion] = (emotionCounts[entry.emotion] || 0) + 1;
      totalIntensity += entry.intensity;
    });

    const sorted = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]);
    const dominantEmotion = sorted[0]?.[0] || "neutral";

    return {
      dominantEmotion,
      emotionDistribution: emotionCounts,
      averageIntensity:
        this.emotionHistory.length > 0
          ? totalIntensity / this.emotionHistory.length
          : 0,
      trend: this.getEmotionalTrend(),
    };
  }
}

export default SentimentAndEmotionEngine;
