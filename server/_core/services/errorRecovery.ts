/**
 * FIX 7: API Error Recovery
 * 
 * What happens when:
 * - Whisper API is down
 * - Claude times out
 * - ElevenLabs rate limited
 * 
 * System should have graceful fallbacks
 */

export interface ErrorRecoveryContext {
  type: 'stt_failure' | 'llm_timeout' | 'tts_failure' | 'network_error';
  originalError: Error;
  attemptNumber: number;
  lastSuccessfulCall?: number;
}

/**
 * Determine if error is temporary (retry) or permanent (fallback)
 */
export function isTemporaryError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Network errors - usually temporary
  if (message.includes('econnrefused') || 
      message.includes('enotfound') || 
      message.includes('timeout') ||
      message.includes('503') ||
      message.includes('429')) {
    return true;
  }
  
  // Rate limit - definitely temporary
  if (message.includes('429') || message.includes('rate limit')) {
    return true;
  }
  
  // Server errors - temporary
  if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
    return true;
  }
  
  return false;
}

/**
 * Get fallback response for STT failure
 */
export function getSTTFallbackMessage(): string {
  const messages = [
    "I'm having trouble hearing you. Could you say that again?",
    "Sorry, the line was a bit unclear. Can you repeat that?",
    "I didn't catch that. Could you try again?",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get fallback response for LLM timeout
 */
export function getLLMFallbackMessage(): string {
  const messages = [
    "Let me think about that for a moment... Could you give me a second?",
    "That's a great question. Let me process that.",
    "I'm considering your question. Just a moment...",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Get fallback response for TTS failure
 */
export function getTTSFallbackMessage(): string {
  return "I'm having technical issues with my voice. Let me get someone to help you right away.";
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if error is temporary
      if (!isTemporaryError(lastError)) {
        console.error(`[ErrorRecovery] Permanent error on attempt ${attempt + 1}:`, lastError.message);
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.log(`[ErrorRecovery] Temporary error, retrying in ${delay}ms...`);

      // Wait before retry
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Check API health
 */
export async function checkAPIHealth(): Promise<{
  whisper: boolean;
  claude: boolean;
  elevenlabs: boolean;
}> {
  const health = {
    whisper: true,
    claude: true,
    elevenlabs: true,
  };

  // Check Whisper (OpenAI)
  try {
    // Quick health check - we can't really call the API without an audio file
    // So just check if the key is configured
    health.whisper = !!process.env.OPENAI_API_KEY;
  } catch (error) {
    health.whisper = false;
  }

  // Check Claude (Anthropic)
  try {
    health.claude = !!process.env.ANTHROPIC_API_KEY; // or however it's configured
  } catch (error) {
    health.claude = false;
  }

  // Check ElevenLabs
  try {
    health.elevenlabs = !!process.env.ELEVENLABS_API_KEY;
  } catch (error) {
    health.elevenlabs = false;
  }

  return health;
}

export default {
  isTemporaryError,
  getSTTFallbackMessage,
  getLLMFallbackMessage,
  getTTSFallbackMessage,
  retryWithBackoff,
  checkAPIHealth,
};
