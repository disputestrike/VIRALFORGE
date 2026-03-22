/**
 * Voice Session Manager
 * 
 * Manages persistent state for ongoing voice conversations
 * - Stores conversation history
 * - Tracks session metadata
 * - Handles session lifecycle
 * - Provides contextual memory for AI
 */

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  duration?: number; // seconds
  sentiment?: 'positive' | 'neutral' | 'negative';
}

export interface VoiceSessionState {
  leadId: number;
  callId: string;
  status: 'initiated' | 'ringing' | 'in_progress' | 'completed' | 'failed';
  conversationHistory: ConversationMessage[];
  startTime: number;
  lastActivity: number;
  duration: number;
  
  // Call metadata
  phoneNumber?: string;
  phoneNumberFrom?: string;
  
  // AI state
  currentTopic?: string;
  leadQualification?: {
    interested: boolean;
    budget?: string;
    timeline?: string;
    decision_maker: boolean;
    objections?: string[];
  };
  appointmentProposed?: {
    time: number;
    confirmed: boolean;
  };
  
  // Quality tracking
  sentiment?: 'positive' | 'neutral' | 'negative';
  turnCount: number;
  aiTurns: number;
  userTurns: number;
  
  // Recording
  recordingUrl?: string;
  transcript?: string;
  aiSummary?: string;
}

/**
 * In-memory session store
 * In production, this could be backed by Redis
 */
const sessions = new Map<string, VoiceSessionState>();

/**
 * Session timeouts (auto-cleanup)
 */
const sessionTimeouts = new Map<string, NodeJS.Timeout>();

const SESSION_TIMEOUT = 1800000; // 30 minutes

// ─── SESSION MANAGEMENT ────────────────────────────────────────────────────────

/**
 * Create a new voice session
 */
export function createSession(
  leadId: number,
  callId: string,
  phoneNumber: string
): VoiceSessionState {
  const session: VoiceSessionState = {
    leadId,
    callId,
    phoneNumber,
    status: 'initiated',
    conversationHistory: [],
    startTime: Date.now(),
    lastActivity: Date.now(),
    duration: 0,
    turnCount: 0,
    aiTurns: 0,
    userTurns: 0,
  };
  
  sessions.set(callId, session);
  setSessionTimeout(callId);
  
  console.log(`[VoiceSessionManager] Session created: ${callId} for lead ${leadId}`);
  return session;
}

/**
 * Get an active session
 */
export function getSession(callId: string): VoiceSessionState | undefined {
  const session = sessions.get(callId);
  if (session) {
    session.lastActivity = Date.now();
    // Reset timeout
    clearSessionTimeout(callId);
    setSessionTimeout(callId);
  }
  return session;
}

/**
 * Update session status
 */
export function updateSessionStatus(
  callId: string,
  status: VoiceSessionState['status']
): VoiceSessionState | undefined {
  const session = sessions.get(callId);
  if (!session) return undefined;
  
  session.status = status;
  session.lastActivity = Date.now();
  
  if (status === 'completed' || status === 'failed') {
    session.duration = Date.now() - session.startTime;
    clearSessionTimeout(callId);
    // Session will be cleaned up after timeout
  }
  
  console.log(`[VoiceSessionManager] Session ${callId} status updated to: ${status}`);
  return session;
}

/**
 * Add a message to conversation history
 */
export function addMessage(
  callId: string,
  message: Omit<ConversationMessage, 'timestamp'>
): VoiceSessionState | undefined {
  const session = sessions.get(callId);
  if (!session) return undefined;
  
  const fullMessage: ConversationMessage = {
    ...message,
    timestamp: Date.now(),
  };
  
  session.conversationHistory.push(fullMessage);
  session.lastActivity = Date.now();
  
  // Track turn counts
  session.turnCount++;
  if (message.role === 'assistant') {
    session.aiTurns++;
  } else if (message.role === 'user') {
    session.userTurns++;
  }
  
  return session;
}

/**
 * Update lead qualification during call
 */
export function updateLeadQualification(
  callId: string,
  qualification: Partial<VoiceSessionState['leadQualification']>
): VoiceSessionState | undefined {
  const session = sessions.get(callId);
  if (!session) return undefined;
  
  session.leadQualification = {
    ...session.leadQualification,
    ...qualification,
  };
  session.lastActivity = Date.now();
  
  return session;
}

/**
 * Propose appointment
 */
export function proposeAppointment(
  callId: string,
  time: number
): VoiceSessionState | undefined {
  const session = sessions.get(callId);
  if (!session) return undefined;
  
  session.appointmentProposed = {
    time,
    confirmed: false,
  };
  session.lastActivity = Date.now();
  
  return session;
}

/**
 * Confirm appointment
 */
export function confirmAppointment(callId: string): VoiceSessionState | undefined {
  const session = sessions.get(callId);
  if (!session || !session.appointmentProposed) return undefined;
  
  session.appointmentProposed.confirmed = true;
  session.lastActivity = Date.now();
  
  return session;
}

/**
 * Update session sentiment
 */
export function updateSentiment(
  callId: string,
  sentiment: 'positive' | 'neutral' | 'negative'
): VoiceSessionState | undefined {
  const session = sessions.get(callId);
  if (!session) return undefined;
  
  session.sentiment = sentiment;
  session.lastActivity = Date.now();
  
  return session;
}

/**
 * Complete session with results
 */
export function completeSession(
  callId: string,
  options: {
    recordingUrl?: string;
    transcript?: string;
    aiSummary?: string;
  }
): VoiceSessionState | undefined {
  const session = sessions.get(callId);
  if (!session) return undefined;
  
  session.status = 'completed';
  session.duration = Date.now() - session.startTime;
  session.recordingUrl = options.recordingUrl;
  session.transcript = options.transcript;
  session.aiSummary = options.aiSummary;
  session.lastActivity = Date.now();
  
  console.log(`[VoiceSessionManager] Session ${callId} completed. Duration: ${Math.round(session.duration / 1000)}s, Turns: ${session.turnCount}`);
  
  return session;
}

/**
 * Get conversation context for AI
 */
export function getConversationContext(callId: string): {
  history: ConversationMessage[];
  summary: string;
  currentTopic?: string;
  leadQualification?: VoiceSessionState['leadQualification'];
} | undefined {
  const session = sessions.get(callId);
  if (!session) return undefined;
  
  // Build summary from last N messages
  const lastMessages = session.conversationHistory.slice(-10);
  const summary = lastMessages
    .map((msg) => `${msg.role === 'assistant' ? 'AI' : 'User'}: ${msg.content}`)
    .join('\n');
  
  return {
    history: session.conversationHistory,
    summary,
    currentTopic: session.currentTopic,
    leadQualification: session.leadQualification,
  };
}

/**
 * Get session stats
 */
export function getSessionStats(callId: string) {
  const session = sessions.get(callId);
  if (!session) return undefined;
  
  return {
    callId: session.callId,
    leadId: session.leadId,
    status: session.status,
    duration: session.duration || Date.now() - session.startTime,
    turnCount: session.turnCount,
    aiTurns: session.aiTurns,
    userTurns: session.userTurns,
    messageCount: session.conversationHistory.length,
    sentiment: session.sentiment,
    leadQualified: session.leadQualification?.interested || false,
    appointmentConfirmed: session.appointmentProposed?.confirmed || false,
  };
}

// ─── CLEANUP & MAINTENANCE ────────────────────────────────────────────────────

/**
 * Set auto-cleanup timeout for session
 */
function setSessionTimeout(callId: string) {
  const timeout = setTimeout(() => {
    endSession(callId);
  }, SESSION_TIMEOUT);
  
  sessionTimeouts.set(callId, timeout);
}

/**
 * Clear session timeout
 */
function clearSessionTimeout(callId: string) {
  const timeout = sessionTimeouts.get(callId);
  if (timeout) {
    clearTimeout(timeout);
    sessionTimeouts.delete(callId);
  }
}

/**
 * End and cleanup session
 */
export function endSession(callId: string): VoiceSessionState | undefined {
  const session = sessions.get(callId);
  
  clearSessionTimeout(callId);
  
  if (session && session.status !== 'completed' && session.status !== 'failed') {
    session.status = 'completed';
    session.duration = Date.now() - session.startTime;
  }
  
  sessions.delete(callId);
  
  if (session) {
    console.log(`[VoiceSessionManager] Session ${callId} ended and cleaned up`);
  }
  
  return session;
}

/**
 * Get all active sessions
 */
export function getActiveSessions(): VoiceSessionState[] {
  return Array.from(sessions.values()).filter((s) => s.status === 'in_progress');
}

/**
 * Get session count by status
 */
export function getSessionCounts() {
  const counts = {
    total: sessions.size,
    initiated: 0,
    ringing: 0,
    in_progress: 0,
    completed: 0,
    failed: 0,
  };
  
  for (const session of sessions.values()) {
    counts[session.status]++;
  }
  
  return counts;
}

/**
 * Clear all expired sessions
 */
export function cleanupExpiredSessions() {
  const now = Date.now();
  const toDelete: string[] = [];
  
  for (const [callId, session] of sessions.entries()) {
    if (
      (session.status === 'completed' || session.status === 'failed') &&
      now - session.lastActivity > SESSION_TIMEOUT
    ) {
      toDelete.push(callId);
    }
  }
  
  for (const callId of toDelete) {
    sessions.delete(callId);
    clearSessionTimeout(callId);
    console.log(`[VoiceSessionManager] Cleaned up expired session: ${callId}`);
  }
  
  return toDelete.length;
}

// Run cleanup every 5 minutes
setInterval(() => {
  const cleaned = cleanupExpiredSessions();
  if (cleaned > 0) {
    console.log(`[VoiceSessionManager] Cleanup: removed ${cleaned} expired sessions`);
  }
}, 300000);

export default {
  createSession,
  getSession,
  updateSessionStatus,
  addMessage,
  updateLeadQualification,
  proposeAppointment,
  confirmAppointment,
  updateSentiment,
  completeSession,
  getConversationContext,
  getSessionStats,
  endSession,
  getActiveSessions,
  getSessionCounts,
  cleanupExpiredSessions,
};
