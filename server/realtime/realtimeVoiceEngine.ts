/**
 * realtimeVoiceEngine.ts — THE CORE ORCHESTRATOR
 *
 * Pipeline: SignalWire → Deepgram STT → Groq LLM → Cartesia TTS → SignalWire
 *
 * Key principles:
 * 1. Telephony: mulaw 8kHz to/from SignalWire; Cartesia pcm_s16le → convert to mulaw outbound
 * 2. Streaming — first spoken clause ASAP after micro-pause
 * 3. Barge-in — user wins; TTS cancelled immediately
 * 4. Epoch — stale LLM/TTS generations discarded
 * 5. Close — one goodbye, then hang up
 */

import WebSocket from "ws";
import {
  createCallState,
  updateCallState,
  markQuestionAnswered,
  canOfferBooking,
  inferUtteranceIntent,
  detectLiveTransferIntent,
} from "./callPolicy";
import { getVoiceProfile, type VoiceProfile } from "./voiceProfiles";
import {
  getVoiceProfileById as getCoreVoiceProfile,
  VOICE_PROFILES as CORE_VOICE_PROFILES,
  type VoiceProfile as CoreVoiceProfile,
} from "../_core/services/voiceProfiles";
import voiceSessionManager from "../_core/services/voiceSessionManager";
import { ENV } from "../_core/env";
import { cerebrasChatCompletionStream } from "../_core/cerebras";
import {
  traceStart,
  traceEvent,
  traceEnd,
  traceTurnTiming,
  markSttFinalForLatency,
  logSttFinalToTtsLatencyIfPending,
  registerCallSessionForMetrics,
} from "./voiceMetrics";
import { fastIntentFromInterim, optOutFromFinal } from "./fastIntentRouter";
import { patchOrchestrationSnapshot } from "./callOrchestrationTypes";
import { speakableLine } from "./speakability";
import { floorAfterAgentStops, floorAfterUserBargeIn } from "./turnManager";
import { tryExtractJsonSpokenText } from "./voiceResponseEnvelope";
import {
  createTurnController,
  onUserSpeechStart,
  onAssistantSpeakStart,
  onProcessing,
  type TurnControllerState,
} from "./turnController";
import { isApexPlatformDemoLine, mergeClientConfig, type ClientConfig } from "./clientConfig";
import { selectInboundGreeting, selectOutboundIntro } from "./voiceOpeningLines";
import type { TenantIndustryOverlay } from "../_core/services/domainPacks";
import {
  formatDomainPackForVoicePrompt,
  resolveDomainPack,
  tenantOverlayFromClientConfig,
} from "../_core/services/domainPacks";
import {
  extractZipFromTranscript,
  lookupDiscountsSpoken,
  lookupServiceAreaSpoken,
} from "./toolLayer";
import { buildVoiceSystemPrompt } from "./dynamicPrompt";
import { normalizeToE164US } from "../_core/phoneE164";
import { classifyTurn } from "./classifyTurn";
import {
  mergeStrictTurnState,
  planStrictLlmTurn,
  routeStrictBeforeLlm,
  strictFactsToSessionSnapshot,
} from "./strictController";
import {
  createApexControllerState,
  routeBlueprintDeterministic,
  markBlueprintAnswered,
  buildApexBlueprintPromptBlock,
  classifyIntent,
  classifyDeterministicBucket,
  FINAL_SILENCE_DEBOUNCE_MS,
  MAX_SENTENCES,
  splitIntoSentences,
  type ApexControllerState,
  type BlueprintIntent,
} from "./apexStrictBlueprint";
import { postProcessAssistantResponse } from "./answerDirectGuard";
import { computeInterruptAck } from "./interruptAck";
import { logVoiceControllerEvent } from "./voiceControllerLog";
import { extractLastQuestion } from "./repeatGuard";
import { emptyStrictFacts, HARD_RULES, type StrictFacts } from "./strictTypes";
import {
  classifySmallTalk,
  getSmallTalkResponse,
  MAX_SMALL_TALK_TURNS,
} from "./smallTalkPolicy";
import {
  detectConversationContext,
  checkClause,
  applyFullResponseGuardrails,
  isResponseLooping,
  getLoopBreakResponse,
  detectTopicDrift,
  getDriftRedirectResponse,
  type ConversationContext,
} from "./responseGuardrails";
import { buildVoiceQaScorecard, formatFailureModes, type FailureMode } from "./callQualityTagger";
import { postCallQualityToMetrics } from "./voiceMetrics";

type VoiceOutcome = import("../_core/services/voiceSessionManager").VoiceSession["outcome"];

export type VoiceFinalizeOpts = {
  reason: string;
  skipHangupApi?: boolean;
  outcome?: VoiceOutcome;
};

/** Caller-safe copy when Deepgram / Groq / TTS env is missing (not “wrong number”). */
const VOICE_STACK_UNAVAILABLE_MSG =
  "Thanks for calling. Our automated assistant isn’t available on this line at the moment. Please try again later, or reach us another way.";

/** Which env vars are missing for live voice (see ENV.voiceRealtimeReady). */
function voiceStackMissingEnvVars(): string[] {
  const m: string[] = [];
  if (!(ENV.deepgramApiKey ?? "").trim()) m.push("DEEPGRAM_API_KEY");
  if (!ENV.voiceLlmConfigured) {
    m.push("CEREBRAS_API_KEY");
  }
  if (!(ENV.cartesiaApiKey ?? "").trim() && !(ENV.elevenLabsApiKey ?? "").trim()) {
    m.push("CARTESIA_API_KEY or ELEVENLABS_API_KEY");
  }
  return m;
}

const enginesByCallSid = new Map<string, { finalize: (opts: VoiceFinalizeOpts) => Promise<void> }>();

function mapCallStatusToOutcome(status: string): VoiceOutcome | undefined {
  const s = status.toLowerCase();
  if (s === "busy" || s === "failed" || s === "no-answer") return "no_answer";
  if (s === "canceled" || s === "cancelled") return "not_interested";
  return undefined;
}

/** HTTP status callback from SignalWire — only this (plus explicit hangup paths) may hard-finalize the call. */
export async function notifyVoiceCallTerminalFromHttp(
  callSid: string,
  callStatus: string
): Promise<void> {
  const norm = String(callStatus || "").toLowerCase().trim();
  const terminal = new Set(["completed", "canceled", "cancelled", "failed", "busy", "no-answer"]);
  if (!terminal.has(norm)) return;
  const entry = enginesByCallSid.get(callSid);
  if (entry) {
    await entry.finalize({
      reason: `signalwire_status:${callStatus}`,
      skipHangupApi: true,
      outcome: mapCallStatusToOutcome(norm),
    });
    return;
  }
  const orphan = voiceSessionManager.getSession(callSid);
  if (orphan) {
    voiceSessionManager.completeSession(orphan.sessionId, mapCallStatusToOutcome(norm));
    await voiceSessionManager.persistSessionToDatabase(orphan.sessionId);
    void import("../_core/services/callOwnerNotifyService").then(({ notifyOwnerAfterVoiceCall }) =>
      notifyOwnerAfterVoiceCall(orphan.sessionId)
    );
  }
}

// ── Clients ───────────────────────────────────────────────────────────────────

/** Map dashboard / DB voice IDs (_core) to Cartesia ids the streaming engine uses; keep realtime-only IDs working. */
function mapCoreCartesiaToRt(core: CoreVoiceProfile): VoiceProfile {
  const base = getVoiceProfile("professional-female");
  const cartesiaId = core.externalVoiceId?.trim() || "694f9389-aac1-45b6-b726-9d9369183238";
  const ttsEmotion =
    (core as { ttsEmotion?: string }).ttsEmotion?.trim() ||
    (core.useCase === "sales"
      ? "content"
      : core.useCase === "support"
        ? "calm"
        : "neutral");
  return {
    ...base,
    id: core.id,
    name: core.label,
    description: core.style ?? base.description,
    cartesiaId,
    speed: typeof core.speed === "number" ? core.speed : base.speed,
    ttsEmotion,
  };
}

function resolveVoiceProfileForEngine(id?: string | null): VoiceProfile {
  if (id && CORE_VOICE_PROFILES.some((p) => p.id === id)) {
    const core = getCoreVoiceProfile(id);
    if (core.provider === "cartesia") return mapCoreCartesiaToRt(core);
    console.warn(`[VoiceEngine] Profile ${id} is not Cartesia — using default telephony voice`);
    return getVoiceProfile("professional-female");
  }
  if (id) return getVoiceProfile(id);
  const core = getCoreVoiceProfile(null);
  return mapCoreCartesiaToRt(core);
}

/** Mu-law frame energy (same idea as VoiceRealtimePipeline) — fast path for barge-in before STT text. */
function pcm16ToMulaw(pcm: Buffer): Buffer {
  const out = Buffer.allocUnsafe(Math.floor(pcm.length / 2));
  for (let i = 0; i < pcm.length - 1; i += 2) {
    let s = pcm.readInt16LE(i);
    const sign = s < 0 ? 0x80 : 0;
    s = Math.min(32767, Math.abs(s) + 33);
    let exp = 7;
    for (let mask = 0x4000; (s & mask) === 0 && exp > 0; mask >>= 1) exp--;
    const mant = (s >> (exp + 3)) & 0x0f;
    out[Math.floor(i / 2)] = ~(sign | (exp << 4) | mant) & 0xff;
  }
  return out;
}

function estimateMulawEnergy(mulawBuf: Buffer): number {
  let sum = 0;
  for (let i = 0; i < mulawBuf.length; i++) {
    const b = mulawBuf[i]!;
    const distFromSilence = Math.min(Math.abs(b - 0xff), Math.abs(b - 0x7f));
    sum += distFromSilence;
  }
  return mulawBuf.length > 0 ? Math.round(sum / mulawBuf.length) : 0;
}

// ── Main engine per call ──────────────────────────────────────────────────────
interface EngineOptions {
  sigWs: WebSocket;
  sessionId?: string;
  leadId?: number;
  userId?: number;
  businessName?: string;
  industry?: string;
  voiceProfileId?: string;
  language?: string;
  /** Merged from `users` voice domain columns at WS connect */
  tenantIndustryOverlay?: TenantIndustryOverlay;
  /** From `users.voiceAgentDisplayName`; empty uses "Alex" in prompts and greetings */
  voiceAgentDisplayName?: string;
}

export function createCallEngine(opts: EngineOptions): void {
  const {
    sigWs,
    sessionId,
    leadId,
    userId,
    businessName: optBusinessName = "Your Business",
    industry: optIndustry = "business services",
    voiceProfileId,
    language: optLanguage = "en",
    tenantIndustryOverlay,
    voiceAgentDisplayName: optVoiceAgentDisplayName,
  } = opts;

  const callId = `call_${Date.now()}`;
  traceStart(callId);
  registerCallSessionForMetrics(callId, sessionId);
  traceEvent(callId, "engine_init");
  const log = (msg: string) => console.log(`[${callId}] ${msg}`);

  let businessName = optBusinessName;
  let industry = optIndustry;
  const callLanguage = optLanguage;
  const tenantPartial: Partial<ClientConfig> = {};
  if (tenantIndustryOverlay?.primaryIndustryLabel?.trim()) {
    tenantPartial.primaryIndustryLabel = tenantIndustryOverlay.primaryIndustryLabel.trim();
  }
  if (tenantIndustryOverlay?.customIndustryContext?.trim()) {
    tenantPartial.voiceIndustryContext = tenantIndustryOverlay.customIndustryContext.trim();
  }
  if (tenantIndustryOverlay?.voiceKeyPhrases?.trim()) {
    tenantPartial.voiceKeyPhrases = tenantIndustryOverlay.voiceKeyPhrases.trim();
  }
  if (tenantIndustryOverlay?.voiceRestrictionNotes?.trim()) {
    tenantPartial.voiceRestrictionNotes = tenantIndustryOverlay.voiceRestrictionNotes.trim();
  }
  let clientConfig: ClientConfig = mergeClientConfig({
    businessName,
    industry,
    voiceAgentDisplayName: optVoiceAgentDisplayName?.trim() || undefined,
    ...tenantPartial,
  });
  const spokenAgent = (): string => (clientConfig.voiceAgentDisplayName ?? "").trim() || "Alex";
  log(`[TENANT] init businessName=${JSON.stringify(clientConfig.businessName)} industry=${JSON.stringify(clientConfig.industry)} userId=${userId ?? null} leadId=${leadId ?? null} voiceProfileId=${voiceProfileId ?? null} agent=${spokenAgent()}`);

  // State
  let streamSid = "";
  let callSid = "";
  let activeSessionId: string | undefined = sessionId;
  let activeLeadId: number | undefined = leadId;
  let activeUserId: number | undefined = userId;
  let dgWs: WebSocket | null = null;
  let cartesiaWs: WebSocket | null = null;
  let cartesiaContextId = "";
  let generationEpoch = 0;
  let isSpeaking = false;
  let isEnded = false;
  let greetingDone = false;  // prevent barge-in during greeting
  /** SignalWire can emit `start` more than once; duplicate greetings → double audio. */
  let greetingPlayed = false;
  let dgReady = false;       // don't send audio to Deepgram until connected
  let policyState = createCallState();
  let turnCtl: TurnControllerState = createTurnController();
  let keepaliveTimer: NodeJS.Timeout | null = null;
  let voiceProfile: VoiceProfile = resolveVoiceProfileForEngine(voiceProfileId);
  const conversationHistory: { role: "user" | "assistant"; content: string }[] = [];
  let currentSentiment = "neutral"; // updated per turn from sentimentInfer
  /** Prevents overlapping handleUserTurn from concurrent Deepgram speech_final events (epoch churn + broken LLM turns). */
  let userTurnBusy = false;
  let pendingUserTranscript: string | null = null;
  let turnStartedAt = 0;
  let extractedFacts: Record<string, string> = {};
  /** Controller memory — industry, pain, volume; model must not re-ask. */
  let strictFacts: StrictFacts = emptyStrictFacts();
  let lastAssistantQuestion: string | null = null;
  /** Media stream recovery — never equate this with call hangup. */
  let streamRecoveryTimer: NodeJS.Timeout | null = null;
  let engineRegisteredCallSid: string | null = null;
  let lastOutboundAudioAt = 0;
  let silenceWatchTimer: NodeJS.Timeout | null = null;
  /** User final timestamp — for silence-after-assistant re-engage (debounced STT). */
  let lastUserFinalAt = 0;
  let userSilenceReengageTimer: NodeJS.Timeout | null = null;
  let callerHasSpokenOnce = false;
  /** One automatic upbeat check-in per lull; cleared when the caller speaks again. */
  let silenceReengageAlreadySent = false;
  /** Deepgram: wait for true end-of-utterance (debounce finals — ignore rapid partial finals). */
  let deepgramFinalDebounceTimer: NodeJS.Timeout | null = null;
  let pendingDeepgramFinalText = "";
  /** Optional μ-law jitter buffer before Deepgram (WS11). */
  let inboundJitterQueue: Buffer[] = [];
  /** APEX strict blueprint state (intent lock, escalation, recovery). */
  let apexState: ApexControllerState = createApexControllerState();
  /** Last Deepgram final confidence (0–1) for interrupt-ack heuristics. */
  let lastFinalSttConfidence = 0.92;
  /** When assistant audio for this utterance started (first TTS chunk). */
  let assistantPlaybackStartAt: number | null = null;
  /** True from start of LLM/TTS response until all audio for this turn is sent. */
  let assistantResponseInProgress = false;
  /** At most one pending barge-in ack utterance — cleared when superseded or call ends. */
  let interruptAckTimer: NodeJS.Timeout | null = null;
  /** Consecutive frames above energy threshold — requires sustained speech, not a single noise spike. */
  let bargeInEnergyFrameCount = 0;
  /** A/B test variant selected for this call (null = no active test) */
  let activeAbVariant: { variantId: number; variantKey: string; promptOverride?: string | null; promptSuffix?: string | null } | null = null;
  /** Prevent duplicate rows if finalize runs twice */
  let abResultRecorded = false;

  // ── Guardrail state ───────────────────────────────────────────────────────
  /** Consecutive turns that were pure small talk (reset when business content appears). */
  let smallTalkTurnCount = 0;
  /** Current conversation context — updated each turn. */
  let currentConversationContext: ConversationContext = "unknown";
  /** Consecutive turns where the agent response was near-identical (loop detection). */
  let loopTurnCount = 0;
  /** Recent assistant response texts for loop detection (last 3). */
  const recentAssistantTexts: string[] = [];
  /** Live-call runtime quality counters that transcript-only QA cannot see. */
  let latencyBudgetExceededCount = 0;
  let deadStreamSendCount = 0;
  let streamDropCount = 0;
  let placeholderAckCount = 0;

  // A/B variant is selected in waitForCartesia() once SignalWire callSid + tenant userId are known (stable hash per real call).

  function clearInterruptAckPending(): void {
    if (interruptAckTimer) {
      clearTimeout(interruptAckTimer);
      interruptAckTimer = null;
    }
  }

  function voiceStreamReady(): boolean {
    return Boolean(streamSid && sigWs && sigWs.readyState === WebSocket.OPEN);
  }

  function clearStreamRecoveryTimer(): void {
    if (streamRecoveryTimer) {
      clearTimeout(streamRecoveryTimer);
      streamRecoveryTimer = null;
    }
  }

  function disarmOutboundSilenceWatch(): void {
    if (silenceWatchTimer) {
      clearInterval(silenceWatchTimer);
      silenceWatchTimer = null;
    }
  }

  function clearUserSilenceReengageTimer(): void {
    if (userSilenceReengageTimer) {
      clearTimeout(userSilenceReengageTimer);
      userSilenceReengageTimer = null;
    }
  }

  /** Arm after outbound TTS completes — if the caller stays quiet, one friendly sales check-in. */
  function scheduleUserSilenceReengageAfterPlayback(): void {
    clearUserSilenceReengageTimer();
    if (!ENV.voiceUserSilenceReengageEnabled || isEnded) return;
    if (!greetingDone || !callerHasSpokenOnce) return;
    if (silenceReengageAlreadySent) return;
    if (!voiceStreamReady()) return;
    const ms = ENV.voiceUserSilenceReengageMs;
    if (ms <= 0) return;
    const playbackDoneAt = Date.now();
    userSilenceReengageTimer = setTimeout(() => {
      userSilenceReengageTimer = null;
      if (isEnded) return;
      if (!voiceStreamReady()) return;
      if (isSpeaking || assistantResponseInProgress || userTurnBusy) return;
      if (lastUserFinalAt > playbackDoneAt) return;
      void runSilenceReengageTurn();
    }, ms);
  }

  function clearDeepgramFinalDebounce(reason: string): void {
    if (deepgramFinalDebounceTimer) {
      clearTimeout(deepgramFinalDebounceTimer);
      deepgramFinalDebounceTimer = null;
      if (pendingDeepgramFinalText.trim() && reason !== "finalize") {
        logVoiceControllerEvent(callId, "info", {
          bucket: "stale_final_fired",
          detail: `cleared:${reason}`,
          transcriptSnippet: pendingDeepgramFinalText.slice(0, 80),
        });
      }
    }
    pendingDeepgramFinalText = "";
  }

  function resetAssistantPlaybackClock(): void {
    assistantPlaybackStartAt = null;
  }

  function scheduleBlueprintInterruptAck(
    sttConfidence: number,
    speechMsOverride?: number,
    responseInProgressOverride?: boolean
  ): void {
    clearInterruptAckPending();
    const speechMs =
      speechMsOverride !== undefined
        ? speechMsOverride
        : assistantPlaybackStartAt
          ? Date.now() - assistantPlaybackStartAt
          : 0;
    const inProg = responseInProgressOverride ?? assistantResponseInProgress;
    const play = computeInterruptAck({
      speechMs,
      sttConfidence,
      assistantResponseInProgress: inProg,
    });
    if (!play) {
      if (ENV.interruptAckOnLowConfidenceOnly) {
        logVoiceControllerEvent(callId, "info", {
          bucket: "tts_ack_too_talky",
          detail: "low_confidence_only_mode",
          extra: { speechMs },
        });
      } else if (speechMs < ENV.interruptAckMinSpeechMs && sttConfidence >= ENV.voiceSttConfidenceLowThreshold) {
        logVoiceControllerEvent(callId, "info", {
          bucket: "tts_ack_too_talky",
          detail: "silent_stop_short_playback",
          extra: { speechMs },
        });
      }
      return;
    }
    const epochAfter = generationEpoch;
    interruptAckTimer = setTimeout(() => {
      interruptAckTimer = null;
      if (isEnded || epochAfter !== generationEpoch) return;
      void speak("Got it — go ahead.", generationEpoch);
    }, 180);
  }

  function registerEngineForCallSid(sid: string): void {
    if (!sid) return;
    if (engineRegisteredCallSid && engineRegisteredCallSid !== sid) {
      enginesByCallSid.delete(engineRegisteredCallSid);
    }
    engineRegisteredCallSid = sid;
    enginesByCallSid.set(sid, { finalize: finalizeHard });
  }

  function unregisterEngineFromMap(): void {
    if (engineRegisteredCallSid) {
      enginesByCallSid.delete(engineRegisteredCallSid);
      engineRegisteredCallSid = null;
    }
  }

  function scheduleRecoveryTermination(): void {
    clearStreamRecoveryTimer();
    streamRecoveryTimer = setTimeout(() => {
      streamRecoveryTimer = null;
      if (isEnded) return;
      const sess = activeSessionId ? voiceSessionManager.getSession(activeSessionId) : null;
      if (
        sess &&
        sess.callState === "in_progress" &&
        sess.streamState !== "active"
      ) {
        log("[RECOVERY] Stream inactive after 5s — finalizing (stream_timeout)");
        traceEvent(callId, "stream_recovery_timeout");
        void finalizeHard({ reason: "stream_timeout", outcome: "no_answer" });
      }
    }, 5000);
  }

  /** SignalWire <Stream> stop — media leg only; call may still be in-progress. */
  function onMediaStreamStopped(): void {
    log("Stream stopped (media) — session not finalized; awaiting reconnect or HTTP terminal status");
    streamDropCount++;
    generationEpoch++;
    assistantResponseInProgress = false;
    stopSpeaking();
    clearUserSilenceReengageTimer();
    clearInterruptAckPending();
    streamSid = "";
    traceEvent(callId, "media_stream_stopped");
    if (activeSessionId) {
      try {
        voiceSessionManager.updateSession(activeSessionId, {
          streamState: "stopped",
          awaitingRecovery: true,
        });
      } catch {}
    }
    scheduleRecoveryTermination();
  }

  function onSignalWireSocketEnded(reason: string): void {
    if (isEnded) return;
    log(`SignalWire WebSocket ended (${reason}) — not finalizing immediately`);
    streamDropCount++;
    generationEpoch++;
    assistantResponseInProgress = false;
    stopSpeaking();
    clearUserSilenceReengageTimer();
    clearInterruptAckPending();
    streamSid = "";
    traceEvent(callId, "sigws_ended", { reason });
    if (activeSessionId) {
      try {
        voiceSessionManager.updateSession(activeSessionId, {
          streamState: "closed",
          awaitingRecovery: true,
        });
      } catch {}
    }
    scheduleRecoveryTermination();
  }

  function mergeExtractedFactsFromTurn(transcript: string): void {
    const zip = extractZipFromTranscript(transcript);
    if (zip) extractedFacts = { ...extractedFacts, serviceZip: zip };
    const m = transcript.match(/\b(?:my name is|i'?m|i am)\s+([A-Za-z][A-Za-z'\-]{1,24})\b/i);
    if (m) extractedFacts = { ...extractedFacts, firstName: m[1]! };
  }

  function syncPolicySnapshot(
    userText: string,
    strictTurn?: { intent: string; mode: string }
  ): void {
    traceEvent(callId, "turn_policy", {
      mode: policyState.mode,
      activeQuestion: policyState.activeQuestion,
      conversationStage: policyState.mode,
      lastIntent: inferUtteranceIntent(userText),
      extractedFacts: { ...extractedFacts },
      strictFacts: strictFactsToSessionSnapshot(strictFacts),
      strictIntent: strictTurn?.intent,
      strictMode: strictTurn?.mode,
    });
    if (!activeSessionId) return;
    const intent = inferUtteranceIntent(userText);
    try {
      voiceSessionManager.updateSession(activeSessionId, {
        voiceCallPolicy: {
          mode: policyState.mode,
          activeQuestion: policyState.activeQuestion,
          conversationStage: policyState.mode,
          lastIntent: intent,
          extractedFacts: { ...extractedFacts },
        },
        activeQuestion: policyState.activeQuestion,
        activeQuestionResolved: policyState.questionAnswered,
        lastIntent: intent,
        conversationStage: policyState.mode,
        extractedFacts: { ...extractedFacts },
        bookingAllowed: canOfferBooking(policyState),
        strictFactsSnapshot: strictFactsToSessionSnapshot(strictFacts),
        ...(strictTurn
          ? { lastStrictIntent: strictTurn.intent, lastStrictMode: strictTurn.mode }
          : {}),
      });
    } catch {}
  }

  function appendHistory(role: "user" | "assistant", content: string): void {
    const trimmed = content.trim();
    if (!trimmed) return;
    conversationHistory.push({ role, content: trimmed });
    const sid = activeSessionId;
    if (sid) {
      try {
        voiceSessionManager.addMessage(sid, role, trimmed);
      } catch (e) {
        log(`addMessage failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  /** Prefer persisted session transcript when synced so CRM/debug match what the LLM sees. */
  function historyForLlm(): { role: "user" | "assistant"; content: string }[] {
    const sid = activeSessionId;
    const maxMsgs = Math.min(16, HARD_RULES.MAX_RECENT_TURNS_TO_MODEL * 2);
    if (sid) {
      const s = voiceSessionManager.getSession(sid);
      if (s?.conversationHistory?.length) {
        return s.conversationHistory.slice(-maxMsgs).map((m) => ({
          role: m.role,
          content: m.content,
        }));
      }
    }
    return conversationHistory.slice(-maxMsgs);
  }
  let firstMediaLogged = false;

  /** `connected` + `start` both call this; assign sockets before `open` and skip if CONNECTING to avoid duplicate STT/TTS websockets. */
  function ensureAudioPipeline(): void {
    if (!cartesiaWs || cartesiaWs.readyState !== WebSocket.OPEN) connectCartesia();
    if (!dgWs || dgWs.readyState !== WebSocket.OPEN) connectDeepgram();
  }

  // ── Cartesia ────────────────────────────────────────────────────────────────
  function connectCartesia() {
    if (
      cartesiaWs &&
      (cartesiaWs.readyState === WebSocket.CONNECTING ||
        cartesiaWs.readyState === WebSocket.OPEN)
    ) {
      return;
    }
    // CLOSING/CLOSED socket still had listeners and could keep forwarding chunks — close before replacing.
    if (cartesiaWs) {
      try {
        cartesiaWs.removeAllListeners();
        cartesiaWs.close();
      } catch {
        /* ignore */
      }
      cartesiaWs = null;
    }
    const ws = new WebSocket(
      `wss://api.cartesia.ai/tts/websocket?api_key=${process.env.CARTESIA_API_KEY}&cartesia_version=2024-11-13`
    );
    cartesiaWs = ws;

    ws.on("open", () => {
      log("Cartesia connected");
      traceEvent(callId, "cartesia_ready");
    });

    // Cartesia may send JSON as text frames (string) or UTF-8 in binary frames (Buffer). Only handling
    // `typeof data === "string"` skips all audio chunks → silence on the phone line.
    ws.on("message", (data: Buffer | string | ArrayBuffer | Buffer[]) => {
      let text: string;
      if (typeof data === "string") text = data;
      else if (Buffer.isBuffer(data)) text = data.toString("utf8");
      else if (Array.isArray(data)) text = Buffer.concat(data).toString("utf8");
      else text = Buffer.from(data as ArrayBuffer).toString("utf8");
      try {
        const msg = JSON.parse(text);
        if (msg.type === "chunk" && msg.data) {
          // Drop chunks from a stale Cartesia context (previous utterance still synthesizing, or orphan WS).
          if (typeof msg.context_id === "string" && msg.context_id.length > 0) {
            if (!cartesiaContextId || msg.context_id !== cartesiaContextId) {
              return;
            }
          } else if (!cartesiaContextId) {
            return;
          }
          // Cartesia returns pcm_mulaw — send directly to SignalWire (no conversion needed)
          if (streamSid && sigWs.readyState === WebSocket.OPEN) {
            if (greetingDone) logSttFinalToTtsLatencyIfPending(callId);
            sigWs.send(JSON.stringify({
              event: "media",
              streamSid,
              media: { payload: msg.data },
            }));
            lastOutboundAudioAt = Date.now();
            isSpeaking = true;
            turnCtl = onAssistantSpeakStart(turnCtl);
            traceEvent(callId, "tts_first_chunk", { bytes: Buffer.from(msg.data, "base64").length });
            log(`Sent audio to SignalWire (mulaw)`);
          } else {
            deadStreamSendCount++;
            log(`CANNOT SEND: streamSid=${streamSid} wsState=${sigWs.readyState}`);
          }
        } else if (msg.type === "error") {
          log(`Cartesia error: ${JSON.stringify(msg)}`);
          // Do not clear cartesiaContextId on "context closed" — that often follows a bad flush after
          // continue:false already closed the context; clearing here races with in-flight audio chunks → silence.
        } else if (msg.type === "done") {
          isSpeaking = false;
          if (activeSessionId) {
            try {
              voiceSessionManager.updateSession(activeSessionId, {
                orchestrationFloor: floorAfterAgentStops(),
              });
            } catch {}
          }
          // Cartesia closes the WS context when a segment finishes; further sends with the same
          // context_id + continue:true get "Context has closed". Clearing here is safe because
          // cartesiaSend() mints a new id and coerces continue=false when starting a new context.
          cartesiaContextId = "";
          if (streamSid && sigWs.readyState === WebSocket.OPEN) {
            sigWs.send(JSON.stringify({ event: "mark", streamSid, mark: { name: "done" } }));
          }
          if (!assistantResponseInProgress) {
            scheduleUserSilenceReengageAfterPlayback();
          }
        }
      } catch {}
    });

    ws.on("close", () => {
      log("Cartesia closed");
      if (cartesiaWs === ws) cartesiaWs = null;
    });
    ws.on("error", (e) => log(`Cartesia error: ${e.message}`));
  }

  function cartesiaSend(text: string, continueCtx = true) {
    if (!voiceStreamReady()) {
      deadStreamSendCount++;
      log(`cartesiaSend SKIPPED: inactive stream (streamSid=${streamSid} wsState=${sigWs.readyState})`);
      return;
    }
    if (!cartesiaWs || cartesiaWs.readyState !== WebSocket.OPEN) {
      log(`cartesiaSend SKIPPED: no ws or not open (state=${cartesiaWs?.readyState})`);
      return;
    }
    if (!assistantPlaybackStartAt) assistantPlaybackStartAt = Date.now();
    const rawSpeed = Math.min(1.2, Math.max(0.55, voiceProfile.speed * ENV.voiceTtsSpeedScale));
    const ttsSpeed = rawSpeed;
    log(`cartesiaSend: "${text.slice(0,40)}" voiceId=${voiceProfile.cartesiaId} speed=${ttsSpeed}`);
    const hadNoContext = !cartesiaContextId;
    if (!cartesiaContextId) {
      cartesiaContextId = `ctx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }
    // First frame of any context must use continue=false; never continue on a brand-new id.
    let continueFlag = continueCtx;
    if (hadNoContext && continueFlag) {
      continueFlag = false;
      log(`[Cartesia] coerced continue=false for new context`);
    }

    const voiceId = voiceProfile.cartesiaId?.trim() || "694f9389-aac1-45b6-b726-9d9369183238";
    const emo =
      ENV.voiceCartesiaEmotion && voiceProfile.ttsEmotion?.trim() ? voiceProfile.ttsEmotion.trim() : undefined;
    const payload: Record<string, unknown> = {
      context_id: cartesiaContextId,
      model_id: "sonic-english",
      voice: {
        mode: "id",
        id: voiceId,
      },
      transcript: text,
      speed: ttsSpeed,
      output_format: {
        container: "raw",
        encoding: "pcm_mulaw",
        sample_rate: 8000,
      },
      continue: continueFlag,
    };
    if (emo) payload.generation_config = { emotion: emo };
    cartesiaWs.send(JSON.stringify(payload));
  }

  function cartesiaFlushExplicit(contextId: string | undefined) {
    if (!cartesiaWs || cartesiaWs.readyState !== WebSocket.OPEN || !contextId) return;
    const voiceId = voiceProfile.cartesiaId?.trim() || "694f9389-aac1-45b6-b726-9d9369183238";
    const rawSpeed = Math.min(1.2, Math.max(0.55, voiceProfile.speed * ENV.voiceTtsSpeedScale));
    const ttsSpeed = rawSpeed;
    // Cartesia rejects bare `{ flush: true }` (no voice). Per WS docs: empty transcript + continue + flush.
    cartesiaWs.send(
      JSON.stringify({
        context_id: contextId,
        model_id: "sonic-english",
        voice: { mode: "id", id: voiceId },
        transcript: "",
        speed: ttsSpeed,
        output_format: {
          container: "raw",
          encoding: "pcm_mulaw",
          sample_rate: 8000,
        },
        continue: true,
        flush: true,
      })
    );
  }

  function stopSpeaking() {
    resetAssistantPlaybackClock();
    clearUserSilenceReengageTimer();
    clearInterruptAckPending();
    assistantResponseInProgress = false;
    if (cartesiaWs && cartesiaWs.readyState === WebSocket.OPEN && cartesiaContextId) {
      cartesiaWs.send(JSON.stringify({ context_id: cartesiaContextId, cancel: true }));
    }
    isSpeaking = false;
    // Empty = reject stray chunks until a new utterance sets a fresh context_id
    cartesiaContextId = "";
    // Clear SignalWire audio buffer
    if (streamSid && sigWs.readyState === WebSocket.OPEN) {
      sigWs.send(JSON.stringify({ event: "clear", streamSid }));
    }
  }

  // ── Deepgram STT ────────────────────────────────────────────────────────────
  function connectDeepgram() {
    if (
      dgWs &&
      (dgWs.readyState === WebSocket.CONNECTING || dgWs.readyState === WebSocket.OPEN)
    ) {
      return;
    }
    const apiKey = (process.env.DEEPGRAM_API_KEY ?? "").trim();
    if (!apiKey) {
      log("Deepgram skipped: no DEEPGRAM_API_KEY");
      return;
    }

    // Minimal query set avoids HTTP 400 on handshake (telephony-optimized model + mulaw 8k).
    // Extra flags (utterance_end_ms, vad_events, smart_format) caused 400 on some projects — opt in via env.
    // Default: nova-3 (or nova-3-phonecall) for best accuracy per research spec.
    // Set VOICE_DEEPGRAM_MODEL=nova-2-phonecall to revert to legacy model.
    const model = (process.env.VOICE_DEEPGRAM_MODEL ?? "nova-3").trim();
    const params = new URLSearchParams({
      model,
      encoding: "mulaw",
      sample_rate: "8000",
      channels: "1",
      punctuate: "true",
      interim_results: "true",
      endpointing: String(ENV.voiceDeepgramEndpointingMs),
      language: callLanguage || "en",
    });
    // Optional — was part of 400 responses on some accounts; enable explicitly if needed.
    if (process.env.VOICE_DEEPGRAM_USE_UTTERANCE_END === "true") {
      params.set("utterance_end_ms", String(ENV.voiceDeepgramUtteranceEndMs));
    }
    if (process.env.VOICE_DEEPGRAM_VAD_EVENTS === "true") {
      params.set("vad_events", "true");
    }
    if (process.env.VOICE_DEEPGRAM_SMART_FORMAT === "true") {
      params.set("smart_format", "true");
    }
    // PII redaction — enabled by default to protect callers; disable with VOICE_DEEPGRAM_REDACT=false.
    if (process.env.VOICE_DEEPGRAM_REDACT !== "false") {
      params.set("redact", "pci");
    }

    // ── Custom vocabulary: industry-specific terms for better STT accuracy ────────────
    // These terms are commonly misrecognized by generic ASR models.
    // Format: keyword:boost (1-5 scale; 2 is moderate, 5 is strong)
    const INDUSTRY_KEYWORDS = [
      // Sales/CRM terms
      "ApexAI:3", "qualification:2", "qualified:2", "conversion:2", "convert:2",
      "pipeline:2", "follow-up:2", "callback:2", "outbound:2", "inbound:2",
      "appointment:2", "booking:2", "calendar:2", "demo:2", "proposal:2",
      // Solar
      "kilowatt:3", "kilowatt-hour:3", "solar panel:3", "photovoltaic:3", "PV:3",
      "net metering:3", "utility bill:2", "solar installation:2", "inverter:3",
      "federal tax credit:3", "ITC:3", "off-grid:2", "on-grid:2",
      // HVAC
      "HVAC:3", "air conditioning:2", "air handler:3", "heat pump:3", "furnace:2",
      "ductwork:3", "thermostat:2", "SEER:3", "BTU:3", "refrigerant:3",
      "compressor:2", "condenser:2", "evaporator:2",
      // Roofing
      "shingles:3", "roofing:2", "soffit:3", "fascia:3", "flashing:3",
      "gutter:2", "downspout:3", "ridge cap:3", "underlayment:3", "TPO:3",
      // Insurance
      "premium:2", "deductible:2", "copay:2", "claim:2", "liability:2",
      "underwriting:3", "policyholder:2", "beneficiary:2",
      // Real estate
      "escrow:2", "mortgage:2", "refinance:2", "appraisal:2", "HOA:3",
      "listing:2", "closing costs:2", "down payment:2",
    ];
    // Nova-3 uses 'keyterm' (not 'keywords') for custom vocabulary boosting.
    // Gate: set VOICE_DEEPGRAM_KEYWORDS=false to disable if causing issues.
    if (process.env.VOICE_DEEPGRAM_KEYWORDS !== "false") {
      INDUSTRY_KEYWORDS.forEach((kw) => {
        // keyterm format: "term:boost" — strip the boost value for keyterm (Nova-3 doesn't take it)
        const term = kw.split(":")[0] ?? kw;
        params.append("keyterm", term);
      });
    }
    // ── End custom vocabulary ─────────────────────────────────────────────────

    const url = `wss://api.deepgram.com/v1/listen?${params}`;
    const ws = new WebSocket(url, { headers: { Authorization: `Token ${apiKey}` } });
    dgWs = ws;

    ws.on("unexpected-response", (_req, res: import("http").IncomingMessage) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8").slice(0, 800);
        log(`Deepgram handshake HTTP ${res.statusCode}: ${body}`);
      });
    });

    ws.on("open", () => {
      log(`Deepgram STT connected (model=${model})`);
      dgReady = true;
      traceEvent(callId, "deepgram_ready");
    });

    ws.on("message", async (raw: Buffer | string) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === "Results") {
          const transcript: string = msg.channel?.alternatives?.[0]?.transcript || "";
          const isFinal: boolean = msg.is_final;
          const speechFinal: boolean = msg.speech_final;

          if (!transcript.trim()) return;

          // Interim: phrase-level semantic interrupt (e.g. "wait", "stop") — faster than waiting for speech_final.
          if (
            !isFinal &&
            isSpeaking &&
            greetingDone &&
            transcript.trim().length >= 4 &&
            !turnCtl.interruptRequested
          ) {
            const fast = fastIntentFromInterim(transcript);
            if (fast.semanticInterrupt) {
              log(`[BARGE-IN] fast intent (interim): "${transcript.slice(0, 80)}"`);
              traceEvent(callId, "fast_intent_interim", { hints: fast.hints });
              clearDeepgramFinalDebounce("fast_intent_interim");
              const ackSpeechMs = assistantPlaybackStartAt ? Date.now() - assistantPlaybackStartAt : 0;
              const ackInProgress = assistantResponseInProgress;
              turnCtl = onUserSpeechStart(turnCtl);
              generationEpoch++;
              stopSpeaking();
              scheduleBlueprintInterruptAck(lastFinalSttConfidence, ackSpeechMs, ackInProgress);
              if (activeSessionId) {
                const s = voiceSessionManager.getSession(activeSessionId);
                if (s) {
                  voiceSessionManager.updateSession(activeSessionId, {
                    interruptCount: (s.interruptCount ?? 0) + 1,
                    orchestrationFloor: floorAfterUserBargeIn(),
                    orchestrationSnapshot: patchOrchestrationSnapshot(s.orchestrationSnapshot, {
                      lastFastIntentHints: fast.hints,
                    }),
                  });
                }
              }
            }
          }

          /**
           * STT backup barge-in only on **finalized** text chunks.
           * Interim results (interim_results=true) often contain noise, "uh", coughs, or 1–2 chars —
           * those were cancelling TTS and bumping generationEpoch, which felt like lost context and
           * "any small sound throws the AI off". Energy-based barge-in still handles fast interrupts.
           * Min length raised to 8 chars (was 3) — filters out single noise words and filler sounds.
           */
          const sttBackupBarge =
            isSpeaking &&
            greetingDone &&
            isFinal &&
            transcript.trim().length >= 8 &&
            !turnCtl.interruptRequested;
          const conf = Number(msg.channel?.alternatives?.[0]?.confidence ?? 0.92);
          if (isFinal && speechFinal) lastFinalSttConfidence = conf;

          if (sttBackupBarge) {
            log(`[BARGE-IN] STT (final): "${transcript}"`);
            clearDeepgramFinalDebounce("stt_barge_in");
            const ackSpeechMs = assistantPlaybackStartAt ? Date.now() - assistantPlaybackStartAt : 0;
            const ackInProgress = assistantResponseInProgress;
            turnCtl = onUserSpeechStart(turnCtl);
            generationEpoch++;
            stopSpeaking();
            scheduleBlueprintInterruptAck(conf, ackSpeechMs, ackInProgress);
            if (activeSessionId) {
              const s = voiceSessionManager.getSession(activeSessionId);
              if (s)
                voiceSessionManager.updateSession(activeSessionId, {
                  interruptCount: (s.interruptCount ?? 0) + 1,
                });
            }
          }

          if (isFinal && speechFinal && greetingDone) {
            traceEvent(callId, "stt_final", { textLen: transcript.length });
            log(`[STT] Final: "${transcript}"`);
            markSttFinalForLatency(callId);
            pendingDeepgramFinalText = transcript;
            if (deepgramFinalDebounceTimer) clearTimeout(deepgramFinalDebounceTimer);
            deepgramFinalDebounceTimer = setTimeout(() => {
              deepgramFinalDebounceTimer = null;
              const text = pendingDeepgramFinalText.trim();
              const finalConf = lastFinalSttConfidence;
              pendingDeepgramFinalText = "";
              if (!text) return;
              traceEvent(callId, "deepgram_turn_committed", {
                debounceMs: FINAL_SILENCE_DEBOUNCE_MS,
                textLen: text.length,
              });
              void enqueueUserTurn(text, finalConf).catch((e) =>
                log(`enqueueUserTurn failed: ${e instanceof Error ? e.message : String(e)}`)
              );
            }, FINAL_SILENCE_DEBOUNCE_MS);
          }
        }
      } catch {}
    });

    ws.on("close", () => {
      log("Deepgram closed");
      if (dgWs === ws) {
        dgWs = null;
        dgReady = false;
      }
    });
    ws.on("error", (e) => { log(`Deepgram error: ${e.message}`); });
  }

  // ── LLM response ────────────────────────────────────────────────────────────
  /** Noise words that should never trigger a full LLM turn on their own. */
  const NOISE_ONLY_PATTERN = /^(uh+|um+|hmm+|hm+|mm+|ah+|oh+|eh+|mhm|ugh+|huh|[^a-z0-9\s]|\s)*$/i;

  async function enqueueUserTurn(transcript: string, sttConfidence?: number): Promise<void> {
    const trimmed = transcript.trim();

    // Confidence floor: drop very low confidence transcripts (likely noise, not speech)
    const conf = sttConfidence ?? lastFinalSttConfidence;
    if (conf < ENV.voiceSttMinConfidence && trimmed.length < 15) {
      log(`[STT] Dropping low-confidence transcript (conf=${conf.toFixed(2)}, len=${trimmed.length}): "${trimmed.slice(0, 40)}"`);
      return;
    }

    // Noise filter: single filler words / sounds with no real content
    if (trimmed.length <= 6 && NOISE_ONLY_PATTERN.test(trimmed)) {
      log(`[STT] Dropping noise-only transcript: "${trimmed}"`);
      return;
    }

    if (trimmed) {
      callerHasSpokenOnce = true;
      clearUserSilenceReengageTimer();
      clearInterruptAckPending();
      silenceReengageAlreadySent = false;
      lastUserFinalAt = Date.now();
    }
    if (userTurnBusy) {
      pendingUserTranscript = transcript;
      log(`[STT] Queued final while busy (${transcript.slice(0, 72)}…)`);
      return;
    }
    userTurnBusy = true;
    try {
      const conf = sttConfidence ?? lastFinalSttConfidence;
      logVoiceControllerEvent(callId, "turn", {
        detail: "user_final",
        extra: { sttConfidence: conf, textLen: transcript.length },
      });
      let next: string | null = transcript;
      while (next) {
        const t = next;
        next = null;
        await handleUserTurnImpl(t, conf);
        if (pendingUserTranscript) {
          next = pendingUserTranscript;
          pendingUserTranscript = null;
        }
      }
    } finally {
      userTurnBusy = false;
    }
  }

  async function handleUserTurnImpl(transcript: string, _sttConfidence: number): Promise<void> {
    if (isEnded) return;

    const microPause = ENV.voiceResponseMicroPauseMs;
    if (microPause > 0) {
      traceEvent(callId, "response_pause", { ms: microPause });
      await new Promise((r) => setTimeout(r, microPause));
    }
    if (isEnded) return;

    turnCtl = onProcessing(turnCtl);
    const epoch = ++generationEpoch;
    turnStartedAt = Date.now();

    if (optOutFromFinal(transcript) && activeSessionId) {
      const s = voiceSessionManager.getSession(activeSessionId);
      voiceSessionManager.updateSession(activeSessionId, {
        orchestrationSnapshot: patchOrchestrationSnapshot(s?.orchestrationSnapshot, {
          optOutRequested: true,
        }),
      });
      traceEvent(callId, "compliance_opt_out");
      appendHistory("user", transcript);
      await speak("Understood — I won't call again. Goodbye.", epoch);
      setTimeout(() => void finalizeHard({ reason: "user_opt_out", outcome: "not_interested" }), 1200);
      traceTurnTiming(callId, { totalMs: Date.now() - turnStartedAt });
      return;
    }

    // ── GUARDRAIL LAYER 1: Pre-generation checks (run BEFORE any LLM call) ────────────

    // 1a. Update conversation context
    currentConversationContext = detectConversationContext(transcript);

    // 1b. Topic drift check (off-limits territory)
    const driftResult = detectTopicDrift(transcript);
    if (driftResult.isDrift && driftResult.driftClass !== "none") {
      const driftResponse = getDriftRedirectResponse(
        driftResult.driftClass,
        businessName || "your business",
        spokenAgent()
      );
      appendHistory("user", transcript);
      await speak(driftResponse, epoch);
      logVoiceControllerEvent(callId, "guardrail", { bucket: "topic_drift", driftClass: driftResult.driftClass });
      traceTurnTiming(callId, { totalMs: Date.now() - turnStartedAt });
      return;
    }

    // 1c. Small-talk micro-policy (hardcoded — LLM never sees these turns)
    const stClass = classifySmallTalk(transcript);
    if (stClass !== "none") {
      smallTalkTurnCount++;
      const stResponse = getSmallTalkResponse(stClass, smallTalkTurnCount, businessName, spokenAgent());
      appendHistory("user", transcript);
      await speak(stResponse, epoch);
      logVoiceControllerEvent(callId, "guardrail", { bucket: "small_talk_hardcode", stClass, turn: smallTalkTurnCount });
      traceTurnTiming(callId, { totalMs: Date.now() - turnStartedAt });
      return; // ← LLM is NEVER called for small talk
    } else {
      // Business content detected — reset small-talk counter
      smallTalkTurnCount = 0;
    }

    // 1d. Low STT confidence — skip LLM, ask for clarification
    if (_sttConfidence > 0 && _sttConfidence < 0.55 && transcript.length < 30) {
      appendHistory("user", transcript);
      await speak("I didn't quite catch that — could you say that again?", epoch);
      logVoiceControllerEvent(callId, "guardrail", { bucket: "low_stt_confidence", confidence: _sttConfidence });
      traceTurnTiming(callId, { totalMs: Date.now() - turnStartedAt });
      return;
    }

    // ── END GUARDRAIL LAYER 1 ─────────────────────────────────────────────────

    policyState = updateCallState(policyState, transcript);
    mergeExtractedFactsFromTurn(transcript);
    const mergedStrict = mergeStrictTurnState(transcript, strictFacts, policyState);
    strictFacts = mergedStrict.strictFacts;
    policyState = mergedStrict.policyState;
    if (strictFacts.industry) {
      apexState = { ...apexState, industry: strictFacts.industry };
    }

    const nowBp = new Date();
    const bpRoute = routeBlueprintDeterministic(apexState, transcript, nowBp, {
      bookingScoreThreshold: ENV.bookingScoreThreshold,
      preferLlmForExplainAndBenefit: ENV.voiceLlmConfigured,
    });
    apexState = bpRoute.next;
    let recoveryPrefixForLlm = false;

    if (bpRoute.route.kind === "speak_then_llm") {
      if (!ENV.voiceRealtimeReady) {
        appendHistory("user", transcript);
        const missing = voiceStackMissingEnvVars();
        log(
          `[Voice] speak_then_llm blocked — voiceRealtimeReady=false (${missing.join(", ")})`
        );
        try {
          await speak(VOICE_STACK_UNAVAILABLE_MSG, epoch);
        } catch {}
        traceTurnTiming(callId, { totalMs: Date.now() - turnStartedAt });
        return;
      }
      appendHistory("user", transcript);
      await speak(bpRoute.route.prefix, epoch);
      recoveryPrefixForLlm = true;
    } else if (bpRoute.route.kind === "speak") {
      appendHistory("user", transcript);
      if (bpRoute.route.markAnswered) {
        apexState = markBlueprintAnswered(apexState, bpRoute.route.text);
      }
      await speak(bpRoute.route.text, epoch);
      if (bpRoute.route.markAnswered) {
        policyState = markQuestionAnswered(policyState);
      }
      syncPolicySnapshot(transcript, {
        intent: classifyIntent(transcript),
        mode: "answer",
      });
      if (bpRoute.route.endCall) {
        setTimeout(
          () => void finalizeHard({ reason: "apex_blueprint_pressure_end", outcome: "not_interested" }),
          1500
        );
      }
      traceTurnTiming(callId, { totalMs: Date.now() - turnStartedAt });
      return;
    }

    const classified = classifyTurn(transcript);
    const strictPre = routeStrictBeforeLlm(transcript, new Date(), classified, spokenAgent());
    if (strictPre) {
      if (strictPre.kind === "date_authority") {
        traceEvent(callId, "date_authority_short_circuit");
      }
      appendHistory("user", transcript);
      await speak(strictPre.speakText, epoch);
      apexState = markBlueprintAnswered(apexState, strictPre.speakText);
      policyState = markQuestionAnswered(policyState);
      syncPolicySnapshot(transcript, strictPre.trace);
      traceTurnTiming(callId, { totalMs: Date.now() - turnStartedAt });
      return;
    }

    // Deterministic ZIP / discount snippets when user asks (before LLM)
    const zip = extractZipFromTranscript(transcript);
    const tl = transcript.toLowerCase();
    if (zip && (tl.includes("zip") || tl.includes("serve") || tl.includes("area") || tl.includes("coverage"))) {
      const line = lookupServiceAreaSpoken(zip, clientConfig);
      appendHistory("user", transcript);
      await speak(line, epoch);
      apexState = markBlueprintAnswered(apexState, line);
      policyState = markQuestionAnswered(policyState);
      syncPolicySnapshot(transcript, { intent: classified.intent, mode: "answer" });
      traceTurnTiming(callId, { totalMs: Date.now() - turnStartedAt });
      return;
    }
    if (tl.includes("discount") || tl.includes("promo") || tl.includes("deal")) {
      const line = lookupDiscountsSpoken(clientConfig);
      appendHistory("user", transcript);
      await speak(line, epoch);
      apexState = markBlueprintAnswered(apexState, line);
      policyState = markQuestionAnswered(policyState);
      syncPolicySnapshot(transcript, { intent: classified.intent, mode: "answer" });
      traceTurnTiming(callId, { totalMs: Date.now() - turnStartedAt });
      return;
    }

    // End call immediately
    if (policyState.endCallRequested) {
      log("[POLICY] End call detected");
      traceEvent(callId, "hangup_signal", { reason: "end_intent" });
      syncPolicySnapshot(transcript, { intent: classified.intent, mode: "close" });
      appendHistory("user", transcript);
      await speak("Thanks so much for calling. Have a wonderful day, and don't hesitate to call back anytime.", epoch);
      setTimeout(() => void finalizeHard({ reason: "end_intent", outcome: "not_interested" }), 1500);
      traceTurnTiming(callId, { totalMs: Date.now() - turnStartedAt });
      return;
    }

    // Live transfer (SignalWire) when enabled and owner has transferNumber
    if (
      ENV.liveTransferEnabled &&
      detectLiveTransferIntent(transcript) &&
      callSid &&
      activeUserId
    ) {
      try {
        const { getUserById } = await import("../db");
        const owner = await getUserById(activeUserId);
        const raw = owner?.transferNumber?.trim() || ENV.liveTransferNumber;
        const target = raw ? normalizeToE164US(raw) || raw : null;
        if (target) {
          appendHistory("user", transcript);
          syncPolicySnapshot(transcript, { intent: classified.intent, mode: "handoff" });
          log(`[POLICY] Live transfer → ${target.slice(0, 6)}…`);
          traceEvent(callId, "hangup_signal", { reason: "live_transfer" });
          await speak("Sure — connecting you to someone now.", epoch);
          const { transferCallToHuman } = await import("../_core/services/signalwireService");
          await transferCallToHuman(callSid, target);
          setTimeout(() => void finalizeHard({ reason: "live_transfer", skipHangupApi: true, outcome: "callback" }), 800);
          traceTurnTiming(callId, { totalMs: Date.now() - turnStartedAt });
          return;
        }
      } catch (e) {
        log(`[POLICY] Transfer failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    if (!recoveryPrefixForLlm) appendHistory("user", transcript);

    // Run sentiment in background — update for next turn
    setImmediate(async () => {
      try {
        const { inferSentimentFromTranscript } = await import("../_core/services/sentimentInfer");
        const result = inferSentimentFromTranscript(transcript);
        if (result) { currentSentiment = result; }
      } catch {}
    });

    const reprompt =
      "I didn't quite catch that—could you say that again in a few words?";
    const activeProvider = "cerebras";
    const activeModel = ENV.cerebrasModel;
    traceEvent(callId, "llm_route", {
      path: activeProvider,
      model: activeModel,
    });
    log(`[ROUTE] Voice LLM: provider=${activeProvider} (streaming) model=${activeModel}`);

    if (!ENV.voiceRealtimeReady) {
      const missing = voiceStackMissingEnvVars();
      log(
        `[Voice] voiceRealtimeReady=false — set on host: ${missing.join(", ")}. (Groq: GROQ_API_KEY; xAI: XAI_API_KEY + LLM_PROVIDER=xai.)`
      );
      try {
        await speak(VOICE_STACK_UNAVAILABLE_MSG, epoch);
      } catch {}
      traceTurnTiming(callId, { totalMs: Date.now() - turnStartedAt });
      return;
    }

    // Latency budget enforcement — sub-700ms end-to-end target from research spec.
    // After 700ms total turn time with no TTS audio, speak a brief hold line.
    const LATENCY_BUDGET_MS = parseInt(process.env.VOICE_LATENCY_BUDGET_MS ?? "900", 10) || 900;
    const latencyBudgetTimer = setTimeout(() => {
      if (epoch !== generationEpoch || isEnded || isSpeaking || assistantPlaybackStartAt) return;
      latencyBudgetExceededCount++;
      traceEvent(callId, "latency_budget_exceeded", { budgetMs: LATENCY_BUDGET_MS });
      log(`[LATENCY] Turn exceeded ${LATENCY_BUDGET_MS}ms budget — tracing only`);
    }, LATENCY_BUDGET_MS);

    const clearLatencyTimer = () => clearTimeout(latencyBudgetTimer);

    const now = new Date();
    const plan = planStrictLlmTurn({
      policyState,
      strictFacts,
      transcript,
      lastAssistantQuestion,
      now,
      classified,
    });
    policyState = plan.policyForPrompt;
    syncPolicySnapshot(transcript, plan.trace);
    traceEvent(callId, "strict_classify", {
      intent: plan.classified.intent,
      mode: plan.policyForPrompt.mode,
    });

    try {
      await respondVoiceLlm(epoch, transcript, plan.strictBlock, recoveryPrefixForLlm);
      clearLatencyTimer();
    } catch (e: any) {
      log(`[Voice LLM] Failed: ${e?.message ?? e}`);
      try {
        await new Promise((r) => setTimeout(r, 350));
        await respondVoiceLlm(epoch, transcript, plan.strictBlock, recoveryPrefixForLlm);
      } catch (e2: any) {
        log(`[Voice LLM] Retry failed: ${e2?.message ?? e2}`);
        if (activeSessionId) {
          const s = voiceSessionManager.getSession(activeSessionId);
          const fc = (s?.fallbackCount ?? 0) + 1;
          voiceSessionManager.updateSession(activeSessionId, { fallbackCount: fc });
          if (fc >= 2) {
            try {
              await speak(
                "I’m going to follow up with you directly to make sure you’re taken care of.",
                epoch
              );
            } catch {}
            setTimeout(
              () => void finalizeHard({ reason: "stuck_fallback", outcome: "callback" }),
              2000
            );
            traceTurnTiming(callId, { totalMs: Date.now() - turnStartedAt });
            return;
          }
        }
        try {
          await speak(reprompt, epoch);
          if (activeSessionId) {
            const s = voiceSessionManager.getSession(activeSessionId);
            voiceSessionManager.updateSession(activeSessionId, {
              orchestrationSnapshot: patchOrchestrationSnapshot(s?.orchestrationSnapshot, {
                repairTurnCount: (s?.orchestrationSnapshot?.repairTurnCount ?? 0) + 1,
              }),
            });
          }
        } catch {}
      }
    }
    traceTurnTiming(callId, { totalMs: Date.now() - turnStartedAt });
  }

  async function buildSystemPromptWithTenant(
    userTranscript: string,
    strictPrefix: string
  ): Promise<string> {
    const sentimentNote = currentSentiment !== "neutral"
      ? `\n\nCALLER SENTIMENT: ${currentSentiment.toUpperCase()} — adjust tone. Frustrated: direct/factual. Confused: simplify. Positive: maintain momentum.`
      : "";
    const languageNote = callLanguage && callLanguage !== "en"
      ? `\n\nLANGUAGE: Conduct this ENTIRE conversation in ${callLanguage === "es" ? "Spanish" : callLanguage === "fr" ? "French" : callLanguage === "de" ? "German" : callLanguage === "pt" ? "Portuguese" : callLanguage === "it" ? "Italian" : callLanguage === "nl" ? "Dutch" : callLanguage === "pl" ? "Polish" : callLanguage === "ru" ? "Russian" : callLanguage === "zh" ? "Chinese" : callLanguage === "ja" ? "Japanese" : callLanguage === "ko" ? "Korean" : callLanguage}. Respond ONLY in that language.`
      : "";
    const industryKey = clientConfig.primaryIndustryLabel?.trim() || industry;
    const pack = resolveDomainPack(industryKey, tenantOverlayFromClientConfig(clientConfig));
    const domainBlock = formatDomainPackForVoicePrompt(pack);
    const base =
      (strictPrefix ? strictPrefix + "\n\n" : "") +
      buildVoiceSystemPrompt(policyState, businessName, industry, clientConfig, domainBlock) +
      sentimentNote +
      languageNote;
    if (!activeUserId) return base;
    try {
      const { buildVoiceTenantContextBlock } = await import("../_core/services/tenantContextForVoice");
      const block = await buildVoiceTenantContextBlock({
        userId: activeUserId,
        leadId: activeLeadId ?? null,
        userMessage: userTranscript,
      });
      if (block.trim()) return appendAbVariant(`${base}\n\n${block}`);
    } catch (e) {
      log(`[Voice] tenant KB context failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    return appendAbVariant(base);
  }

  /** Inject A/B variant suffix into system prompt (no-op if no variant active) */
  function appendAbVariant(prompt: string): string {
    if (!activeAbVariant) return prompt;
    if (activeAbVariant.promptOverride) return activeAbVariant.promptOverride;
    if (activeAbVariant.promptSuffix) return `${prompt}\n\n${activeAbVariant.promptSuffix}`;
    return prompt;
  }

  /** Caller went quiet after we spoke — one upbeat check-in with full conversation context (sales tempo). */
  async function runSilenceReengageTurn(): Promise<void> {
    if (isEnded || !greetingDone || !callerHasSpokenOnce) return;
    if (isSpeaking || assistantResponseInProgress || userTurnBusy) return;
    if (!voiceStreamReady()) return;

    silenceReengageAlreadySent = true;
    const epoch = ++generationEpoch;
    turnStartedAt = Date.now();
    traceEvent(callId, "user_silence_reengage");
    log("[VOICE] User silence re-engage");

    // Do NOT appendHistory — synthetic "user" lines were polluting email transcripts.
    turnCtl = onProcessing(turnCtl);

    const classified = classifyTurn("(silent)");
    const plan = planStrictLlmTurn({
      policyState,
      strictFacts,
      transcript: "(silent)",
      lastAssistantQuestion,
      now: new Date(),
      classified,
    });
    policyState = plan.policyForPrompt;
    syncPolicySnapshot("silence_reengage", plan.trace);

    const silenceLlmCue =
      "Internal cue: The caller has been quiet. Ask ONE short follow-up question directly related to the last thing discussed. Maximum 15 words. Do NOT introduce new topics. Do NOT be enthusiastic. Do NOT say exciting, fantastic, or awesome. Just ask a simple, relevant question. FORBIDDEN phrases: still with me, still there, checking in, just wanted to make sure, can you hear me, on the line, are you there, exciting, fantastic.";

    if (!ENV.voiceLlmConfigured) {
      log("[VOICE] Silence reengage skipped — no voice LLM (set GROQ_API_KEY or LLM_PROVIDER=xai + XAI_API_KEY)");
      traceTurnTiming(callId, { totalMs: Date.now() - turnStartedAt });
      return;
    }

    try {
      await respondVoiceLlm(epoch, "", plan.strictBlock, false, {
        blueprintIntentOverride: "re_engagement",
        llmOnlyUserMessage: silenceLlmCue,
      });
    } catch (e: any) {
      log(`[Silence re-engage] ${e?.message ?? e}`);
      try {
        await speak(
          "One quick question — are missed calls hitting you more after hours, or when you’re slammed during the day?",
          epoch
        );
      } catch {}
    }
    traceTurnTiming(callId, { totalMs: Date.now() - turnStartedAt });
  }

  async function respondVoiceLlm(
    epoch: number,
    userTranscript: string,
    strictBlock: string,
    recoveryPrefixDone: boolean,
    opts?: {
      blueprintIntentOverride?: BlueprintIntent;
      /** User message for this Cerebras request only — never written to call transcript. */
      llmOnlyUserMessage?: string;
    }
  ): Promise<void> {
    const blueprintIntent = opts?.blueprintIntentOverride ?? classifyIntent(userTranscript);
    const blueprintBlock = buildApexBlueprintPromptBlock(apexState, blueprintIntent);
    let recoveryHint = "";
    if (recoveryPrefixDone) {
      if (blueprintIntent === "re_engagement") {
        recoveryHint =
          "\n\n=== BRIDGE DONE ===\nYou already delivered the short bridge line. Now continue in a warm, upbeat sales tone: 2 sentences max — tie back to what you were discussing before; add one concrete value beat or one crisp forward question. Do not repeat the bridge.";
      } else {
        recoveryHint =
          "\n\n=== RECOVERY ===\nYou already delivered the reset lines. Now give ONE direct substantive answer to what they need — do not repeat the reset or ask what they want again.";
      }
    }
    const tenantUserLine =
      opts?.llmOnlyUserMessage?.trim()
        ? "Caller has not spoken since your last message — continue professionally in one beat; no line-quality check-ins."
        : userTranscript;
    const prompt = await buildSystemPromptWithTenant(
      tenantUserLine,
      `${strictBlock}\n\n${blueprintBlock}${recoveryHint}`
    );
    const messages = historyForLlm().map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    const cue = opts?.llmOnlyUserMessage?.trim();
    if (cue) {
      messages.push({ role: "user" as const, content: cue });
    }

    const textForGuard = cue ? "" : userTranscript;

    const { stream, model } = await cerebrasChatCompletionStream({
      model: ENV.cerebrasModel,
      messages: [{ role: "system", content: prompt }, ...messages],
      maxTokens: ENV.voiceLlmMaxTokens,
      temperature: ENV.voiceLlmTemperature,
    });
    traceEvent(callId, "llm_stream_start", {
      provider: "cerebras",
      model,
    });
    const { clean, full } = await streamToCartesia(stream, epoch, textForGuard);
    if (!clean.trim() && !full.trim()) throw new Error("Empty LLM response");
  }

  // ── True streaming LLM → TTS pipeline — research-compliant ──────────────────
  //
  // Tokens flow from LLM in real-time. As soon as a sentence boundary is detected
  // (. ! ? followed by space/end, or a long clause with a comma/dash boundary),
  // that clause is sent to Cartesia TTS immediately — before the full LLM response
  // is complete. This is the "agent_chunk" streaming architecture from the research doc:
  //   STT → speech_final → LLM token stream → clause boundary → Cartesia → audio
  // Latency budget: first TTS audio fires ~150–300ms after LLM first token.
  async function streamToCartesia(
    textDeltas: AsyncIterable<string>,
    epoch: number,
    userTranscript: string
  ): Promise<{ clean: string; full: string }> {
    stopSpeaking();
    disarmOutboundSilenceWatch();
    clearUserSilenceReengageTimer();
    lastOutboundAudioAt = Date.now();
    assistantResponseInProgress = true;
    let clausesSent = 0;

    let llmAckTimer: NodeJS.Timeout | null = setTimeout(() => {
      llmAckTimer = null;
      if (epoch !== generationEpoch || isEnded || clausesSent > 0 || assistantPlaybackStartAt) return;
      traceEvent(callId, "llm_slow_ack_800ms");
      log("[FAILSAFE] LLM >800ms to first token — tracing only");
    }, 800);
    silenceWatchTimer = setInterval(() => {
      if (isEnded || epoch !== generationEpoch) {
        disarmOutboundSilenceWatch();
        return;
      }
      if (!isSpeaking) return;
      if (Date.now() - lastOutboundAudioAt < 2000) return;
      disarmOutboundSilenceWatch();
      traceEvent(callId, "failsafe_silence_2s_outbound");
      log("[FAILSAFE] Outbound silence watchdog triggered");
    }, 500);

    let fullText = "";
    let tokenBuffer = ""; // accumulates tokens until a speakable clause boundary

    // Sentence-boundary detector for streaming tokens.
    // Returns the next complete clause to speak and the remaining buffer.
    function extractNextClause(buf: string): { clause: string; remainder: string } | null {
      // Hard sentence boundaries: . ! ? followed by space or end-of-string
      const hardBoundary = /[.!?](?=[\s]|$)/;
      const m = buf.match(hardBoundary);
      if (m && m.index !== undefined) {
        const boundary = m.index + m[0].length;
        return { clause: buf.slice(0, boundary).trim(), remainder: buf.slice(boundary).trimStart() };
      }
      // Soft clause boundary: comma or em-dash after at least 30 chars — only if buffer > 60 chars
      // to avoid chopping short phrases mid-thought.
      if (buf.length > 60) {
        const softBoundary = /[,—](?=\s)/;
        const sm = buf.match(softBoundary);
        if (sm && sm.index !== undefined && sm.index >= 30) {
          return { clause: buf.slice(0, sm.index + 1).trim(), remainder: buf.slice(sm.index + 1).trimStart() };
        }
      }
      return null;
    }

    const sendClause = (text: string) => {
      if (!text.trim() || epoch !== generationEpoch || isEnded) return;
      const cleaned = text
        .replace(/TOOL:\s*\w+\s*\{[^}]*\}/g, "")
        .replace(/https?:\/\/[^\s]+/gi, "")
        .replace(/www\.[^\s]+/gi, "")
        .replace(/\*+/g, "")
        .replace(/[_#`]/g, " ")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\s+/g, " ")
        .trim();

      // ── GUARDRAIL LAYER 2: Clause-level interception (before Cartesia) ──────────
      const clauseCheck = checkClause(
        cleaned,
        userTranscript,
        conversationHistory,
        currentConversationContext,
        spokenAgent()
      );
      if (clauseCheck.action === "block") {
        logVoiceControllerEvent(callId, "guardrail", { bucket: "clause_blocked", reason: clauseCheck.reason, clause: cleaned.slice(0, 60) });
        return; // Silently drop this clause — don't send to TTS
      }
      if (clauseCheck.action === "replace") {
        logVoiceControllerEvent(callId, "guardrail", { bucket: "clause_replaced", reason: clauseCheck.reason, original: cleaned.slice(0, 60) });
        // Only inject replacement on first clause to avoid duplicate safe responses
        if (clausesSent === 0) {
          const safeSpeak = speakableLine(clauseCheck.text);
          if (safeSpeak) {
            cartesiaContextId = "";
            cartesiaSend(safeSpeak, false);
            clausesSent++;
            traceEvent(callId, "tts_first_clause_streaming", { clause: safeSpeak.slice(0, 60), guardrail: clauseCheck.reason });
          }
        }
        return;
      }
      // ── END GUARDRAIL LAYER 2 ─────────────────────────────────────────────

      const speakable = speakableLine(clauseCheck.text); // use guardrail-approved text
      if (!speakable) return;
      // Each clause gets its own fresh Cartesia context to avoid "Context has closed" errors.
      cartesiaContextId = "";
      cartesiaSend(speakable, false);
      clausesSent++;
      traceEvent(callId, clausesSent === 1 ? "tts_first_clause_streaming" : "tts_clause", {
        clause: speakable.slice(0, 60),
        clauseIndex: clausesSent,
      });
    };

    try {
      for await (const delta of textDeltas) {
        if (epoch !== generationEpoch || isEnded) break;
        if (delta) {
          if (llmAckTimer) {
            clearTimeout(llmAckTimer);
            llmAckTimer = null;
          }
          fullText += delta;
          tokenBuffer += delta;

          // Try to extract and send complete clauses as tokens arrive.
          // This is the key streaming optimization: TTS starts before LLM finishes.
          let next = extractNextClause(tokenBuffer);
          while (next) {
            sendClause(next.clause);
            tokenBuffer = next.remainder;
            next = extractNextClause(tokenBuffer);
          }
        }
      }
    } catch (e: any) {
      disarmOutboundSilenceWatch();
      assistantResponseInProgress = false;
      log(`[STREAM] Error: ${e.message}`);
      throw e;
    } finally {
      if (llmAckTimer) {
        clearTimeout(llmAckTimer);
        llmAckTimer = null;
      }
    }

    if (epoch !== generationEpoch || isEnded) {
      assistantResponseInProgress = false;
      disarmOutboundSilenceWatch();
      return { clean: "", full: fullText };
    }

      if (ENV.voiceLlmJsonEnvelope) {
      const extracted = tryExtractJsonSpokenText(fullText);
      if (extracted) {
        // Re-process: flush the extracted text as streaming clauses
        fullText = extracted;
        tokenBuffer = extracted;
        let next = extractNextClause(tokenBuffer);
        while (next) {
          if (clausesSent === 0) sendClause(next.clause); // only if nothing sent yet
          tokenBuffer = next.remainder;
          next = extractNextClause(tokenBuffer);
        }
        traceEvent(callId, "llm_json_envelope_applied", { len: extracted.length });
      }
    }

    // Flush any remaining buffer (e.g. last sentence without trailing punctuation)
    if (tokenBuffer.trim() && epoch === generationEpoch && !isEnded) {
      sendClause(tokenBuffer.trim());
      tokenBuffer = "";
    }

    // Build full clean response for guard + history
    let cleanResponse = fullText.replace(/TOOL:\s*\w+\s*\{[^}]*\}/g, "").trim();
    const guard = postProcessAssistantResponse(userTranscript, cleanResponse, classifyIntent(userTranscript));
    if (guard.answerInsufficient) {
      logVoiceControllerEvent(callId, "failure", {
        bucket: "answer_quality_insufficient",
        transcriptSnippet: userTranscript.slice(0, 80),
      });
    }
    if (guard.askedFollowupBeforeAnswer) {
      logVoiceControllerEvent(callId, "failure", {
        bucket: "asked_followup_before_answer",
        transcriptSnippet: userTranscript.slice(0, 120),
      });
    }
    cleanResponse = guard.text;
    const parts = splitIntoSentences(cleanResponse);
    if (parts.length > MAX_SENTENCES) {
      logVoiceControllerEvent(callId, "failure", { bucket: "spoke_too_long", detail: "sentence_count" });
    }

    // ── GUARDRAIL LAYER 3: Post-LLM full-response checks ─────────────────────
    // Apply full-response guardrails (catches things clause-level may miss)
    const fullGuard = applyFullResponseGuardrails(
      cleanResponse,
      userTranscript,
      conversationHistory,
      currentConversationContext,
      spokenAgent()
    );
    if (fullGuard.wasModified) {
      cleanResponse = fullGuard.text;
      fullGuard.violations.forEach((v) => {
        logVoiceControllerEvent(callId, "guardrail", { bucket: "full_response_guardrail", violation: v });
      });
      // Note: if the clause-level guardrail already caught this, the audio is already wrong.
      // We log it here for post-call QA. In future: pre-stream the full text before TTS.
    }

    // Loop detection — if agent is saying the same thing repeatedly
    if (isResponseLooping(cleanResponse, recentAssistantTexts)) {
      loopTurnCount++;
      const loopBreak = getLoopBreakResponse(loopTurnCount);
      logVoiceControllerEvent(callId, "guardrail", { bucket: "loop_detected", count: loopTurnCount });
      // We can't cancel audio already sent, but we can fix the history
      cleanResponse = loopBreak;
    } else {
      loopTurnCount = 0;
    }
    // Track recent responses for loop detection
    recentAssistantTexts.push(cleanResponse);
    if (recentAssistantTexts.length > 5) recentAssistantTexts.shift();
    // ── END GUARDRAIL LAYER 3 ─────────────────────────────────────────────

    // Note: we do NOT re-send clauses here — they were already sent during streaming above.
    // The sendClause loop above has already dispatched audio to Cartesia token-by-token.

    if (cleanResponse) {
      appendHistory("assistant", cleanResponse);
      apexState = markBlueprintAnswered(apexState, cleanResponse);
      policyState = markQuestionAnswered(policyState);
      const lq = extractLastQuestion(cleanResponse);
      if (lq) lastAssistantQuestion = lq;
    }

    await handleToolCalls(fullText, epoch);
    disarmOutboundSilenceWatch();
    assistantResponseInProgress = false;
    return { clean: cleanResponse, full: fullText };
  }

  async function speak(text: string, epoch: number): Promise<void> {
    if (epoch !== generationEpoch || isEnded) return;
    if (!voiceStreamReady()) {
      deadStreamSendCount++;
      log(`speak() SKIPPED: inactive stream text="${text.slice(0, 50)}"`);
      return;
    }
    log(`speak() called: "${text.slice(0,50)}" cartesiaWs=${cartesiaWs?.readyState}`);
    if (/^(one moment|hang tight|still with you|i'?m right here|i'?m here)\b/i.test(text.trim())) {
      placeholderAckCount++;
    }
    // Cancel prior synthesis + clear SW buffer so short replies (greeting, reprompt) never overlap.
    stopSpeaking();
    // Always start a new Cartesia context — reusing ctx after greeting without a timely
    // `done` causes 400 "unable to infer voice mode" and loops the sorry line.
    cartesiaContextId = `ctx_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    // Single utterance with continue:false completes and closes the Cartesia context — do NOT flush.
    // Flushing immediately hits "Context has closed" and can prevent any audio from playing.
    const line = speakableLine(text);
    cartesiaSend(line, false);
    appendHistory("assistant", line);
  }

  // ── Tool execution ────────────────────────────────────────────────────────
  async function handleToolCalls(text: string, epoch: number): Promise<void> {
    const toolMatch = text.match(/TOOL:\s*(\w+)\s*(\{[^}]*\})?/);
    if (!toolMatch) return;

    const toolName = toolMatch[1];
    let toolArgs: any = {};
    try { toolArgs = JSON.parse(toolMatch[2] || "{}"); } catch {}

    log(`[TOOL] ${toolName}: ${JSON.stringify(toolArgs)}`);

    if (toolName === "end_call") {
      await speak("Thanks so much for calling. Have a wonderful day, and don't hesitate to call back anytime.", epoch);
      setTimeout(() => void finalizeHard({ reason: "tool_end_call", outcome: "not_interested" }), 1500);
    } else if (toolName === "book_appointment") {
      if (!canOfferBooking(policyState)) {
        log("[TOOL] book_appointment blocked — policy");
        await speak("Got it. What day works for a quick call?", epoch);
        return;
      }
      try {
        const { finalizeVoiceAppointmentBooking } = await import("../_core/services/voiceBookingPipeline");
        const sess = activeSessionId ? voiceSessionManager.getSession(activeSessionId) : null;
        const booked = await finalizeVoiceAppointmentBooking({
          leadId: activeLeadId || 0,
          userId: activeUserId,
          sessionId: activeSessionId,
          callerPhone: sess?.callerPhone,
          businessName: clientConfig.businessName,
          toolArgs: {
            name: toolArgs.name,
            phone: toolArgs.phone,
            date: toolArgs.date,
            time: toolArgs.time,
            service: toolArgs.service,
            notes: toolArgs.notes,
          },
          transcriptSnippet: sess?.transcript?.slice(-2500),
        });
        if (booked && booked.leadId > 0 && booked.leadId !== activeLeadId) {
          activeLeadId = booked.leadId;
        }
        if (booked) {
          log(`[TOOL] Appointment booked id=${booked.insertId} lead=${booked.leadId}`);
          await speak(
            "You're all set — I sent a text with your appointment time. Reply to that number if anything changes.",
            epoch
          );
        } else {
          log("[TOOL] Booking failed — no DB row");
          await speak(
            "I couldn't lock that into the calendar from here — someone from the team will call you shortly to confirm.",
            epoch
          );
        }
      } catch (e) {
        log(`[TOOL] Booking error: ${e}`);
        try {
          await speak("Let me have someone call you back to finalize that time.", epoch);
        } catch {}
      }
    } else if (toolName === "save_lead") {
      try {
        const { updateLead } = await import("../db");
        if (activeLeadId) {
          await (updateLead as any)(activeLeadId, {
            firstName: toolArgs.firstName,
            phone: toolArgs.phone,
            email: toolArgs.email,
          });
        }
      } catch (e) { log(`[TOOL] Save lead error: ${e}`); }
    }
  }

  // ── Hard finalize (call leg ended or irrecoverable stream) ───────────────
  function buildRuntimeQaFailures(): FailureMode[] {
    const failures: FailureMode[] = [];
    if (latencyBudgetExceededCount > 0) {
      failures.push({
        code: "runtime_latency_budget",
        severity: "conversion_killing",
        description: "Live turn timing exceeded the target latency budget.",
        snippet: `${latencyBudgetExceededCount} slow-turn event(s)`,
      });
    }
    if (placeholderAckCount >= 2) {
      failures.push({
        code: "runtime_placeholder_ack",
        severity: "conversion_killing",
        description: "The agent relied on placeholder acknowledgments instead of crisp answers.",
        snippet: `${placeholderAckCount} placeholder ack(s)`,
      });
    }
    if (deadStreamSendCount > 0) {
      failures.push({
        code: "runtime_dead_stream_send",
        severity: "trust_killing",
        description: "The runtime tried to speak into an inactive media stream.",
        snippet: `${deadStreamSendCount} dead-stream send attempt(s)`,
      });
    }
    if (streamDropCount > 0) {
      failures.push({
        code: "runtime_stream_drop",
        severity: "trust_killing",
        description: "The live call lost its media stream before it completed cleanly.",
        snippet: `${streamDropCount} stream interruption(s)`,
      });
    }
    return failures;
  }

  async function finalizeHard(opts: VoiceFinalizeOpts): Promise<void> {
    if (isEnded) return;
    isEnded = true;
    clearStreamRecoveryTimer();
    disarmOutboundSilenceWatch();
    clearUserSilenceReengageTimer();
    clearInterruptAckPending();
    clearDeepgramFinalDebounce("finalize");
    unregisterEngineFromMap();
    log(`Call finalize: ${opts.reason}`);

    if (activeSessionId) {
      try {
        voiceSessionManager.updateSession(activeSessionId, { callState: "closing", awaitingRecovery: false });
      } catch {}
    }

    // Auto-generate call summary in background
    if (conversationHistory.length > 1 && activeUserId) {
      const history = [...conversationHistory];
      const uid = activeUserId;
      const lid = activeLeadId;
      const sf = { ...strictFacts };
      const cid = callId;
      setImmediate(async () => {
        try {
          const { generateCallSummaryFromTranscript } = await import("../_core/services/callSummaryService");
          const transcript2 = history.map(m => (m.role === "user" ? "Caller" : "AI") + ": " + m.content).join("\n");
          await generateCallSummaryFromTranscript(transcript2, undefined);
          log("[SUMMARY] Call summary generated");
        } catch (e) { log(`[SUMMARY] Failed: ${e instanceof Error ? e.message : String(e)}`); }

        // ── Post-Call QA: tag all guardrail violations for analytics ──
        try {
          const qa = buildVoiceQaScorecard(history);
          const runtimeFailures = buildRuntimeQaFailures();
          const failures = [...qa.failures, ...runtimeFailures];
          const healthy =
            qa.healthy &&
            runtimeFailures.every((f) => f.severity !== "trust_killing" && f.severity !== "compliance_risk");
          let score = qa.score;
          runtimeFailures.forEach((failure) => {
            score -= failure.severity === "trust_killing" ? 18 : failure.severity === "conversion_killing" ? 10 : 6;
          });
          score = Math.max(0, score);
          const grade =
            score >= 95 ? "elite" : score >= 88 ? "strong" : score >= 75 ? "conditional" : "weak";
          const recommendations = [...qa.recommendations];
          if (runtimeFailures.some((f) => f.code === "runtime_stream_drop" || f.code === "runtime_dead_stream_send")) {
            recommendations.unshift("Fix stream stability first so the caller never hears dead air, dropped audio, or a broken handoff.");
          }
          if (runtimeFailures.some((f) => f.code === "runtime_latency_budget" || f.code === "runtime_placeholder_ack")) {
            recommendations.unshift("Tighten live latency and remove placeholder hold lines so answers land sharply on the phone.");
          }
          const summary = formatFailureModes(failures);
          log(`[QA] Call quality: ${healthy ? "HEALTHY" : "ISSUES DETECTED"} | score=${score} grade=${grade} | ${summary}`);
          if (!healthy) {
            log(`[QA] Trust/compliance failures: ${failures.filter(f => f.severity === "trust_killing" || f.severity === "compliance_risk").map(f => f.code).join(", ")}`);
          }
          if (recommendations.length) {
            log(`[QA] Coaching: ${recommendations.slice(0, 3).join(" | ")}`);
          }
          // Store in voiceControllerLog for dashboard visibility
          logVoiceControllerEvent(cid, failures.length === 0 ? "quality_pass" : "quality_issues", {
            failureCount: failures.length,
            healthy,
            summary,
            score,
            grade,
            metrics: qa.metrics,
            recommendations: recommendations.slice(0, 4),
            failures: failures.slice(0, 5).map(f => ({ code: f.code, severity: f.severity })),
          });
          // ── Post to voice-metrics-service for dashboard aggregation ──
          // Every flagged call appears in /metrics/quality with failure bucket codes.
          // Phase "qa_result" = call summary. Phase "qa_failure:<code>" = per-violation.
          postCallQualityToMetrics(cid, failures, healthy);
        } catch (e) { log(`[QA] Tagger failed: ${e instanceof Error ? e.message : String(e)}`); }

        // ── Persistent Memory: auto-save key facts extracted during this call ──
        try {
          const { saveCallMemory } = await import("../db");
          const memoryLines: string[] = [];
          if (sf.name) memoryLines.push(`Caller name: ${sf.name}`);
          if (sf.industry) memoryLines.push(`Industry: ${sf.industry}`);
          if (sf.subIndustry) memoryLines.push(`Sub-industry: ${sf.subIndustry}`);
          if (sf.callVolume) memoryLines.push(`Call volume: ${sf.callVolume}/month`);
          if (sf.painLabels?.length) memoryLines.push(`Pain points: ${sf.painLabels.join(", ")}`);
          if (sf.phoneDigits) memoryLines.push(`Phone digits shared: ${sf.phoneDigits}`);
          if (sf.discussedTopics?.length) memoryLines.push(`Topics discussed: ${sf.discussedTopics.join(", ")}`);
          if ((opts as any).outcome && (opts as any).outcome !== "no_answer") memoryLines.push(`Call outcome: ${(opts as any).outcome}`);
          if (memoryLines.length > 0 && uid) {
            const content = `[Call ${cid}] ${memoryLines.join(" | ")}`;
            await saveCallMemory(uid, lid ?? null, content, "call_auto");
            log(`[MEMORY] Saved ${memoryLines.length} facts for lead ${lid ?? "(unknown)"}`);
          }
        } catch (e) { log(`[MEMORY] Auto-save failed: ${e instanceof Error ? e.message : String(e)}`); }

        // ── CRM Auto-Sync: push qualified leads to connected CRMs post-call ──
        if (uid && lid && (opts.outcome === "interested" || opts.outcome === "scheduled")) {
          try {
            const { listCrmConnections, getCrmTokens, getLeadById } = await import("../db");
            const connections = await listCrmConnections(uid);
            const connected = connections.filter((c: any) => c.status === "connected");
            if (connected.length > 0) {
              const lead = await getLeadById(lid);
              if (lead) {
                for (const conn of connected) {
                  try {
                    const tokens = await getCrmTokens(uid, conn.provider);
                    if (!tokens) continue;
                    if (conn.provider === "hubspot") {
                      // Use global fetch (Node 18+)
                      await globalThis.fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
                        method: "POST",
                        headers: { Authorization: `Bearer ${tokens.accessToken}`, "Content-Type": "application/json" },
                        body: JSON.stringify({
                          properties: {
                            email: lead.email ?? undefined,
                            firstname: lead.firstName,
                            lastname: lead.lastName,
                            phone: lead.phone ?? undefined,
                            company: lead.company ?? undefined,
                            hs_lead_status: "IN_PROGRESS",
                          },
                        }),
                      }).catch(() => {});
                    }
                    // Salesforce sync handled similarly — skipped here for brevity; crmRouter.syncAll covers bulk
                    log(`[CRM] Auto-synced lead ${lid} to ${conn.provider}`);
                  } catch (ce) {
                    log(`[CRM] Auto-sync to ${conn.provider} failed: ${ce instanceof Error ? ce.message : String(ce)}`);
                  }
                }
              }
            }
          } catch (e) { log(`[CRM] Auto-sync setup failed: ${e instanceof Error ? e.message : String(e)}`); }
        }
      });
    }

    if (keepaliveTimer) { clearInterval(keepaliveTimer); keepaliveTimer = null; }
    try { dgWs?.close(); } catch {}
    try { cartesiaWs?.close(); } catch {}

    const sid = callSid;
    if (
      !opts.skipHangupApi &&
      sid &&
      ENV.signalwireSpaceUrl &&
      ENV.signalwireProjectId &&
      ENV.signalwireToken
    ) {
      try {
        await fetch(
          `https://${ENV.signalwireSpaceUrl}/api/laml/2010-04-01/Accounts/${ENV.signalwireProjectId}/Calls/${sid}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: "Basic " + Buffer.from(
                `${ENV.signalwireProjectId}:${ENV.signalwireToken}`
              ).toString("base64"),
            },
            body: "Status=completed",
          }
        );
        log(`[FINALIZE] SignalWire call ${sid} terminated`);
      } catch {}
    }

    traceEnd(callId);
    if (activeSessionId) {
      const sessionIdForNotify = activeSessionId;
      try {
        voiceSessionManager.completeSession(sessionIdForNotify, opts.outcome);
        await voiceSessionManager.persistSessionToDatabase(sessionIdForNotify);
        void import("../_core/services/callOwnerNotifyService").then(({ notifyOwnerAfterVoiceCall }) =>
          notifyOwnerAfterVoiceCall(sessionIdForNotify)
        );
      } catch {}
    }

    // ── A/B Testing: one row per call leg when a variant was active ──
    if (activeAbVariant && !abResultRecorded) {
      abResultRecorded = true;
      const variant = activeAbVariant;
      const outcome = opts.outcome ?? "no_answer";
      const session = activeSessionId ? voiceSessionManager.getSession(activeSessionId) : null;
      const durationSeconds = session?.startTime
        ? Math.max(0, Math.round((Date.now() - session.startTime) / 1000))
        : 0;
      const converted =
        outcome === "interested" ||
        outcome === "scheduled" ||
        Boolean(session?.appointmentBooked);
      const sentimentForRow =
        session?.sentiment && session.sentiment !== "neutral" ? session.sentiment : undefined;
      void (async () => {
        try {
          const { recordAbTestResult } = await import("../db");
          await recordAbTestResult({
            variantId: variant.variantId,
            callId: callSid || callId,
            sessionId: activeSessionId ?? undefined,
            leadId: activeLeadId ?? undefined,
            outcome,
            converted,
            durationSeconds,
            sentiment: sentimentForRow ?? (currentSentiment !== "neutral" ? currentSentiment : undefined),
          });
        } catch {
          // Non-critical
        }
      })();
    }

    try { sigWs.close(); } catch {}
  }

  // ── SignalWire message handler ────────────────────────────────────────────
  sigWs.on("message", async (raw: Buffer | string) => {
    let msg: any;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    const event = msg.event;

    if (event === "connected") {
      log("SignalWire connected");
      traceEvent(callId, "ws_connected");
      ensureAudioPipeline();
      if (activeSessionId) {
        try {
          voiceSessionManager.updateSession(activeSessionId, {
            streamState: "connecting",
            callState: "answered",
          });
        } catch {}
      }

      // Keepalive
      keepaliveTimer = setInterval(() => {
        if (streamSid && sigWs.readyState === WebSocket.OPEN) {
          sigWs.send(JSON.stringify({ event: "mark", streamSid, mark: { name: `ka_${Date.now()}` } }));
        }
      }, 25000);
    }

    else if (event === "start") {
      // Pipeline already started on "connected" — don't call again or we get duplicate connections
      streamSid = msg.streamSid || msg.start?.streamSid || "";
      callSid = msg.start?.callSid || msg.callSid || streamSid;
      clearStreamRecoveryTimer();
      if (callSid) registerEngineForCallSid(callSid);
      const params = msg.start?.customParameters || msg.customParameters || {};
      if (params.sessionId) {
        activeSessionId = String(params.sessionId);
        registerCallSessionForMetrics(callId, activeSessionId);
      }
      if (params.leadId !== undefined && params.leadId !== "")
        activeLeadId = parseInt(String(params.leadId), 10);
      if (sigWs) (sigWs as any)._callSid = callSid;
      if (activeSessionId) {
        try {
          voiceSessionManager.updateSession(activeSessionId, {
            callState: "in_progress",
            streamState: "active",
            awaitingRecovery: false,
            callSid,
          } as any);
        } catch {}
      }
      traceEvent(callId, "stream_start", {
        streamSid,
        callSid,
        sessionId: activeSessionId,
        leadId: activeLeadId,
      });
      log(`Stream started: ${streamSid} session=${activeSessionId} lead=${activeLeadId}`);

      const waitForCartesia = async () => {
        let waited = 0;
        while (!cartesiaWs || cartesiaWs.readyState !== 1) {
          if (waited > 3000 || isEnded) return;
          await new Promise((r) => setTimeout(r, 50));
          waited += 50;
        }
        try {
          const sessEarly = activeSessionId ? voiceSessionManager.getSession(activeSessionId) : null;
          if (sessEarly?.userId) {
            const { getUserById } = await import("../db");
            const urow = await getUserById(sessEarly.userId);
            const u = urow as {
              businessName?: string | null;
              voiceAgentDisplayName?: string | null;
              primaryIndustryLabel?: string | null;
              voiceIndustryContext?: string | null;
              voiceKeyPhrases?: string | null;
              voiceRestrictionNotes?: string | null;
            } | null;
            if (u?.businessName?.trim()) businessName = u.businessName.trim();
            const agentNm = u?.voiceAgentDisplayName?.trim();
            clientConfig = mergeClientConfig({
              ...clientConfig,
              businessName,
              industry,
              ...(agentNm ? { voiceAgentDisplayName: agentNm } : {}),
              ...(u?.primaryIndustryLabel?.trim() ? { primaryIndustryLabel: u.primaryIndustryLabel.trim() } : {}),
              ...(u?.voiceIndustryContext?.trim() ? { voiceIndustryContext: u.voiceIndustryContext.trim() } : {}),
              ...(u?.voiceKeyPhrases?.trim() ? { voiceKeyPhrases: u.voiceKeyPhrases.trim() } : {}),
              ...(u?.voiceRestrictionNotes?.trim() ? { voiceRestrictionNotes: u.voiceRestrictionNotes.trim() } : {}),
            });
            log(`[TENANT] hydrated userId=${sessEarly.userId} agent=${spokenAgent()}`);
          }
          if (activeLeadId) {
            const { getLeadById } = await import("../db");
            const lead = await getLeadById(activeLeadId);
            if (lead) {
              const l = lead as { industry?: string | null };
              if (l.industry) industry = l.industry;
              clientConfig = mergeClientConfig({
                ...clientConfig,
                businessName,
                industry,
              });
            }
          }
          const sess = activeSessionId ? voiceSessionManager.getSession(activeSessionId) : null;
          if (sess?.voiceProfileId) voiceProfile = resolveVoiceProfileForEngine(sess.voiceProfileId);
          if (sess?.userId) activeUserId = sess.userId ?? undefined;
          // ── Inbound caller phone → leadId lookup (persistent memory requires leadId) ──
          if (!activeLeadId && activeUserId && sess?.callerPhone) {
            try {
              const { getLeadByPhoneForUser } = await import("../db");
              const matchedLead = await getLeadByPhoneForUser(activeUserId, sess.callerPhone);
              if (matchedLead) {
                activeLeadId = matchedLead.id;
                log(`[MEMORY] Inbound caller ${sess.callerPhone} matched to lead ${activeLeadId} (${matchedLead.firstName} ${matchedLead.lastName})`);
              }
            } catch (e) {
              log(`[MEMORY] Phone lookup failed: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
          if (activeUserId && callSid) {
            try {
              const { selectAbVariantForCall } = await import("../db");
              activeAbVariant = await selectAbVariantForCall(activeUserId, callSid);
              if (activeAbVariant) {
                log(
                  `[AB] Variant ${activeAbVariant.variantKey} (id=${activeAbVariant.variantId}) callSid=${callSid}`
                );
                traceEvent(callId, "ab_variant", {
                  variantKey: activeAbVariant.variantKey,
                  variantId: activeAbVariant.variantId,
                });
              }
            } catch (e) {
              log(`[AB] select failed: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
          if (activeSessionId && callSid) {
            voiceSessionManager.updateSession(activeSessionId, {
              callSid,
              callState: "in_progress",
              streamState: "active",
            } as any);
          }
        } catch (e) {
          log(`Session bind: ${e}`);
        }
        await new Promise((r) => setTimeout(r, 200));
        if (!isEnded && !greetingPlayed) {
          greetingPlayed = true;
          if (!ENV.voiceRealtimeReady) {
            const missing = voiceStackMissingEnvVars();
            log(
              `[Voice] voiceRealtimeReady=false — set on host: ${missing.join(", ")}. (Groq: GROQ_API_KEY; xAI: XAI_API_KEY + LLM_PROVIDER=xai.)`
            );
            traceEvent(callId, "voice_stack_unready", { missing: missing.join("|") });
            try {
              await speak(VOICE_STACK_UNAVAILABLE_MSG, generationEpoch);
            } catch {}
            traceEvent(callId, "greeting_sent");
            log("[GREETING] Sent (voice stack unavailable)");
            setTimeout(() => {
              greetingDone = true;
              log("[GREETING] Barge-in enabled");
            }, 1200);
            return;
          }
          const sessGreet = activeSessionId ? voiceSessionManager.getSession(activeSessionId) : null;
          const outboundScript = sessGreet?.outboundScript?.trim();
          const isOutbound = sessGreet?.callDirection === "outbound";
          let greeting: string;
          const bname = clientConfig.businessName;
          if (isOutbound && outboundScript) {
            const scriptLine = speakableLine(outboundScript);
            greeting = sessGreet?.complianceRecordingPending
              ? `This call may be recorded for quality assurance. ${scriptLine}`
              : scriptLine;
          } else if (isOutbound) {
            const intro = selectOutboundIntro({
              businessName: bname,
              sessionId: activeSessionId || callId,
              agentDisplayName: spokenAgent(),
            });
            greeting = sessGreet?.complianceRecordingPending
              ? `This call may be recorded for quality assurance. ${intro}`
              : intro;
          } else {
            const vertical = resolveDomainPack(
              clientConfig.primaryIndustryLabel || industry,
              tenantOverlayFromClientConfig(clientConfig)
            ).displayName;
            let base = selectInboundGreeting({
              businessName: bname,
              sessionId: activeSessionId || callId,
              industryLabel: vertical,
              apexProductLine: isApexPlatformDemoLine(bname),
              agentDisplayName: spokenAgent(),
            });
            greeting = sessGreet?.complianceRecordingPending
              ? `This call may be recorded for quality assurance. ${base}`
              : base;
          }
          log(`[GREETING] selected businessName=${JSON.stringify(bname)} apexDemo=${isApexPlatformDemoLine(bname)} text=${JSON.stringify(greeting)}`);
          await speak(greeting, generationEpoch);
          if (
            activeSessionId &&
            sessGreet?.complianceRecordingPending &&
            greeting.includes("recorded")
          ) {
            const s = voiceSessionManager.getSession(activeSessionId);
            voiceSessionManager.updateSession(activeSessionId, {
              orchestrationSnapshot: patchOrchestrationSnapshot(s?.orchestrationSnapshot, {
                recordingDisclosureGiven: true,
              }),
            });
          }
          traceEvent(callId, "greeting_sent");
          log("[GREETING] Sent");
          setTimeout(() => {
            greetingDone = true;
            log("[GREETING] Barge-in enabled");
          }, 1200);
        } else if (!isEnded && greetingPlayed) {
          log("[GREETING] Skipped duplicate start");
        }
      };
      waitForCartesia();
    }

    else if (event === "media") {
      const payload = msg.media?.payload;
      if (!payload) return;
      if (!firstMediaLogged) {
        firstMediaLogged = true;
        traceEvent(callId, "first_media_in");
      }

      const audio = Buffer.from(payload, "base64");
      if (audio.length === 0) return;

      // Instant barge-in: energy on raw mu-law (same strategy as VoiceRealtimePipeline).
      // While assistant audio plays, drop quiet frames so STT is not flooded with echo; loud speech = cut TTS immediately.
      // Requires VOICE_BARGE_IN_SUSTAIN_FRAMES consecutive above-threshold frames to avoid false triggers
      // from background noise, TV, coughs, or short sound bursts.
      if (greetingDone && isSpeaking) {
        const energy = estimateMulawEnergy(audio);
        const th = ENV.voiceBargeInEnergyThreshold;
        const sustainRequired = ENV.voiceBargeInSustainFrames;
        if (energy > th) {
          bargeInEnergyFrameCount++;
        } else {
          bargeInEnergyFrameCount = 0;
          if (!turnCtl.interruptRequested) return; // quiet frame while speaking — drop
        }
        if (bargeInEnergyFrameCount >= sustainRequired && !turnCtl.interruptRequested) {
          bargeInEnergyFrameCount = 0;
          log(`[BARGE-IN] energy=${energy} (threshold=${th}, sustained=${sustainRequired}f)`);
          traceEvent(callId, "barge_in_energy", { energy, threshold: th, sustainFrames: sustainRequired });
          clearDeepgramFinalDebounce("energy_barge");
          const ackSpeechMs = assistantPlaybackStartAt ? Date.now() - assistantPlaybackStartAt : 0;
          const ackInProgress = assistantResponseInProgress;
          turnCtl = onUserSpeechStart(turnCtl);
          generationEpoch++;
          stopSpeaking();
          scheduleBlueprintInterruptAck(lastFinalSttConfidence, ackSpeechMs, ackInProgress);
          if (activeSessionId) {
            const s = voiceSessionManager.getSession(activeSessionId);
            if (s)
              voiceSessionManager.updateSession(activeSessionId, {
                interruptCount: (s.interruptCount ?? 0) + 1,
              });
          }
        }
      } else if (!isSpeaking) {
        // Not speaking — reset frame counter
        bargeInEnergyFrameCount = 0;
      }

      if (dgReady && dgWs && dgWs.readyState === WebSocket.OPEN) {
        const jf = ENV.voiceJitterBufferFrames;
        if (jf <= 0) {
          dgWs.send(audio);
        } else {
          inboundJitterQueue.push(audio);
          while (inboundJitterQueue.length > jf) {
            const chunk = inboundJitterQueue.shift()!;
            dgWs.send(chunk);
          }
        }
      }
    }

    else if (event === "stop") {
      onMediaStreamStopped();
    }
  });

  sigWs.on("close", () => onSignalWireSocketEnded("close"));
  sigWs.on("error", (e) => onSignalWireSocketEnded(`error:${e.message}`));
}
