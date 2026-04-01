/**
 * realtimeVoiceEngine.ts — THE CORE ORCHESTRATOR
 * 
 * Pipeline: SignalWire → Deepgram STT → Cerebras → Cartesia TTS → SignalWire
 * (Claude only if LLM_ALLOW_ANTHROPIC_FALLBACK=true)
 * 
 * Key principles:
 * 1. Telephony: mulaw 8kHz to/from SignalWire; Cartesia outputs pcm_mulaw for outbound TTS
 * 2. Streaming everything — never wait for full response
 * 3. Instant barge-in — user speech kills AI speech immediately
 * 4. Epoch system — stale generations are discarded
 * 5. Clean hangup — one goodbye, then terminate
 */

import WebSocket from "ws";
import OpenAI from "openai";
import {
  createCallState,
  updateCallState,
  markQuestionAnswered,
  canOfferBooking,
  type CallState,
} from "./callPolicy";
import { getVoiceProfile, type VoiceProfile } from "./voiceProfiles";
import {
  getVoiceProfileById as getCoreVoiceProfile,
  VOICE_PROFILES as CORE_VOICE_PROFILES,
  type VoiceProfile as CoreVoiceProfile,
} from "../_core/services/voiceProfiles";
import voiceSessionManager from "../_core/services/voiceSessionManager";
import { ENV } from "../_core/env";
import {
  traceStart,
  traceEvent,
  traceEnd,
  traceTurnTiming,
  markSttFinalForLatency,
  logSttFinalToTtsLatencyIfPending,
} from "./voiceMetrics";
import {
  createTurnController,
  onUserSpeechStart,
  onAssistantSpeakStart,
  onProcessing,
  type TurnControllerState,
} from "./turnController";
import { mergeClientConfig, type ClientConfig } from "./clientConfig";
import {
  extractZipFromTranscript,
  lookupDiscountsSpoken,
  lookupServiceAreaSpoken,
} from "./toolLayer";
import { cerebrasModelCandidates, cerebrasPool } from "../_core/services/llmRouter";
import { buildVoiceSystemPrompt } from "./dynamicPrompt";

/**
 * Push LLM text to TTS sentence by sentence.
 * Only splits on sentence endings (.!?) to avoid choppy comma-fragments.
 * Waits for at least 40 chars before sending to avoid tiny fragments.
 */
function drainSpeakableToTts(
  assembled: string,
  spokenUpTo: number,
  sendClause: (s: string) => void
): number {
  let i = spokenUpTo;
  while (i < assembled.length) {
    const rest = assembled.slice(i);
    if (!rest.trim()) break;

    // Only split on sentence boundaries — no comma splits
    const sent = rest.match(/^(.{20,}?[.!?]+)\s*/);
    if (sent?.[1]?.trim()) {
      sendClause(sent[1].trim());
      i += sent[0].length;
      continue;
    }

    // If we have a long chunk with no sentence end yet, wait for more tokens
    break;
  }
  return i;
}

// ── Clients ───────────────────────────────────────────────────────────────────
// Use the shared cerebrasPool from llmRouter (has cooldown + rate-limit handling)

/** Map dashboard / DB voice IDs (_core) to Cartesia ids the streaming engine uses; keep realtime-only IDs working. */
function mapCoreCartesiaToRt(core: CoreVoiceProfile): VoiceProfile {
  const base = getVoiceProfile("professional-female");
  const cartesiaId = core.externalVoiceId?.trim() || "694f9389-aac1-45b6-b726-9d9369183238";
  return {
    ...base,
    id: core.id,
    name: core.label,
    description: core.style ?? base.description,
    cartesiaId,
    speed: typeof core.speed === "number" ? core.speed : base.speed,
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
}

export function createCallEngine(opts: EngineOptions): void {
  const {
    sigWs,
    sessionId,
    leadId,
    userId,
    businessName: optBusinessName = "ApexAI",
    industry: optIndustry = "business services",
    voiceProfileId,
  } = opts;

  const callId = `call_${Date.now()}`;
  traceStart(callId);
  traceEvent(callId, "engine_init");
  const log = (msg: string) => console.log(`[${callId}] ${msg}`);

  let businessName = optBusinessName;
  let industry = optIndustry;
  let clientConfig: ClientConfig = mergeClientConfig({
    businessName,
    industry,
  });

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
  let dgReady = false;       // don't send audio to Deepgram until connected
  let callState = createCallState();
  let turnCtl: TurnControllerState = createTurnController();
  let keepaliveTimer: NodeJS.Timeout | null = null;
  let voiceProfile: VoiceProfile = resolveVoiceProfileForEngine(voiceProfileId);
  const conversationHistory: { role: "user" | "assistant"; content: string }[] = [];
  let currentSentiment = "neutral"; // updated per turn from sentimentInfer
  /** Prevents overlapping handleUserTurn from concurrent Deepgram speech_final events (epoch churn + broken LLM turns). */
  let userTurnBusy = false;
  let pendingUserTranscript: string | null = null;
  let turnStartedAt = 0;

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
    if (sid) {
      const s = voiceSessionManager.getSession(sid);
      if (s?.conversationHistory?.length) {
        return s.conversationHistory.slice(-16).map((m) => ({
          role: m.role,
          content: m.content,
        }));
      }
    }
    return conversationHistory.slice(-16);
  }
  let firstMediaLogged = false;

  /** `connected` + `start` both call this; assign sockets before `open` and skip if CONNECTING to avoid duplicate STT/TTS websockets. */
  function ensureAudioPipeline(): void {
    if (!cartesiaWs || cartesiaWs.readyState !== WebSocket.OPEN) connectCartesia();
    if (!dgWs || dgWs.readyState !== WebSocket.OPEN) connectDeepgram();
  }

  // ── Cartesia ────────────────────────────────────────────────────────────────
  function connectCartesia() {
    if (cartesiaWs && cartesiaWs.readyState === WebSocket.CONNECTING) return;
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
          // Cartesia returns pcm_s16le — convert to mulaw for SignalWire
          if (streamSid && sigWs.readyState === WebSocket.OPEN) {
            if (greetingDone) logSttFinalToTtsLatencyIfPending(callId);
            const pcm16 = Buffer.from(msg.data, "base64");
            const mulaw = pcm16ToMulaw(pcm16);
            sigWs.send(JSON.stringify({
              event: "media",
              streamSid,
              media: { payload: mulaw.toString("base64") },
            }));
            isSpeaking = true;
            turnCtl = onAssistantSpeakStart(turnCtl);
            traceEvent(callId, "tts_first_chunk", { bytes: Buffer.from(msg.data, "base64").length });
            log(`Sent audio to SignalWire (mulaw)`);
          } else {
            log(`CANNOT SEND: streamSid=${streamSid} wsState=${sigWs.readyState}`);
          }
        } else if (msg.type === "error") {
          log(`Cartesia error: ${JSON.stringify(msg)}`);
        } else if (msg.type === "done") {
          isSpeaking = false;
          // Fresh context for the next utterance — reusing a finalized ctx_id causes
          // Cartesia 400 "unable to infer voice mode" on speak() after greeting.
          cartesiaContextId = "";
          if (streamSid && sigWs.readyState === WebSocket.OPEN) {
            sigWs.send(JSON.stringify({ event: "mark", streamSid, mark: { name: "done" } }));
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
    if (!cartesiaWs || cartesiaWs.readyState !== WebSocket.OPEN) {
      log(`cartesiaSend SKIPPED: no ws or not open (state=${cartesiaWs?.readyState})`);
      return;
    }
    const ttsSpeed = Math.min(1.2, Math.max(0.55, voiceProfile.speed * ENV.voiceTtsSpeedScale));
    log(`cartesiaSend: "${text.slice(0,40)}" voiceId=${voiceProfile.cartesiaId} speed=${ttsSpeed}`);
    if (!cartesiaContextId) cartesiaContextId = `ctx_${Date.now()}`;

    const voiceId = voiceProfile.cartesiaId?.trim() || "694f9389-aac1-45b6-b726-9d9369183238";
    // voice must be ONLY { mode, id } — nesting __experimental_controls breaks validation (400 invalid voice spec).
    cartesiaWs.send(JSON.stringify({
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
        encoding: "pcm_s16le",
        sample_rate: 8000,
      },
      continue: continueCtx,
    }));
  }

  function cartesiaFlush() {
    if (!cartesiaWs || cartesiaWs.readyState !== WebSocket.OPEN || !cartesiaContextId) return;
    cartesiaWs.send(JSON.stringify({ context_id: cartesiaContextId, flush: true }));
  }

  function stopSpeaking() {
    if (!cartesiaWs || cartesiaWs.readyState !== WebSocket.OPEN) return;
    if (cartesiaContextId) {
      cartesiaWs.send(JSON.stringify({ context_id: cartesiaContextId, cancel: true }));
    }
    isSpeaking = false;
    cartesiaContextId = `ctx_${Date.now()}`;
    // Clear SignalWire audio buffer
    if (streamSid && sigWs.readyState === WebSocket.OPEN) {
      sigWs.send(JSON.stringify({ event: "clear", streamSid }));
    }
  }

  // ── Deepgram STT ────────────────────────────────────────────────────────────
  function connectDeepgram() {
    if (dgWs && dgWs.readyState === WebSocket.CONNECTING) return;
    const apiKey = (process.env.DEEPGRAM_API_KEY ?? "").trim();
    if (!apiKey) {
      log("Deepgram skipped: no DEEPGRAM_API_KEY");
      return;
    }

    // Minimal query set avoids HTTP 400 on handshake (telephony-optimized model + mulaw 8k).
    // Extra flags (utterance_end_ms, vad_events, smart_format) caused 400 on some projects — opt in via env.
    const model = (process.env.VOICE_DEEPGRAM_MODEL ?? "nova-2-phonecall").trim();
    const params = new URLSearchParams({
      model,
      encoding: "mulaw",
      sample_rate: "8000",
      channels: "1",
      punctuate: "true",
      interim_results: "true",
      endpointing: String(ENV.voiceDeepgramEndpointingMs),
      language: "en",
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

          /**
           * STT backup barge-in only on **finalized** text chunks.
           * Interim results (interim_results=true) often contain noise, "uh", coughs, or 1–2 chars —
           * those were cancelling TTS and bumping generationEpoch, which felt like lost context and
           * "any small sound throws the AI off". Energy-based barge-in still handles fast interrupts.
           */
          const sttBackupBarge =
            isSpeaking &&
            greetingDone &&
            isFinal &&
            transcript.trim().length >= 3 &&
            !turnCtl.interruptRequested;
          if (sttBackupBarge) {
            log(`[BARGE-IN] STT (final): "${transcript}"`);
            turnCtl = onUserSpeechStart(turnCtl);
            generationEpoch++;
            stopSpeaking();
          }

          if (isFinal && speechFinal && greetingDone) {
            traceEvent(callId, "stt_final", { textLen: transcript.length });
            log(`[STT] Final: "${transcript}"`);
            markSttFinalForLatency(callId);
            void enqueueUserTurn(transcript).catch((e) =>
              log(`enqueueUserTurn failed: ${e instanceof Error ? e.message : String(e)}`)
            );
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
  async function enqueueUserTurn(transcript: string): Promise<void> {
    if (userTurnBusy) {
      pendingUserTranscript = transcript;
      log(`[STT] Queued final while busy (${transcript.slice(0, 72)}…)`);
      return;
    }
    userTurnBusy = true;
    try {
      let next: string | null = transcript;
      while (next) {
        const t = next;
        next = null;
        await handleUserTurnImpl(t);
        if (pendingUserTranscript) {
          next = pendingUserTranscript;
          pendingUserTranscript = null;
        }
      }
    } finally {
      userTurnBusy = false;
    }
  }

  async function handleUserTurnImpl(transcript: string): Promise<void> {
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
    callState = updateCallState(callState, transcript);

    // Deterministic ZIP / discount snippets when user asks (before LLM)
    const zip = extractZipFromTranscript(transcript);
    const tl = transcript.toLowerCase();
    if (zip && (tl.includes("zip") || tl.includes("serve") || tl.includes("area") || tl.includes("coverage"))) {
      const line = lookupServiceAreaSpoken(zip, clientConfig);
      await speak(line, epoch);
      callState = markQuestionAnswered(callState);
      traceTurnTiming(callId, { totalMs: Date.now() - turnStartedAt });
      return;
    }
    if (tl.includes("discount") || tl.includes("promo") || tl.includes("deal")) {
      const line = lookupDiscountsSpoken(clientConfig);
      await speak(line, epoch);
      callState = markQuestionAnswered(callState);
      traceTurnTiming(callId, { totalMs: Date.now() - turnStartedAt });
      return;
    }

    // End call immediately
    if (callState.endCallRequested) {
      log("[POLICY] End call detected");
      traceEvent(callId, "hangup_signal", { reason: "end_intent" });
      await speak("No problem, thanks for calling, have a great day.", epoch);
      setTimeout(() => cleanup(), 1500);
      return;
    }

    appendHistory("user", transcript);

    // Run sentiment in background — update for next turn
    setImmediate(async () => {
      try {
        const { inferSentimentFromTranscript } = await import("../_core/services/sentimentInfer");
        const result = inferSentimentFromTranscript(transcript);
        if (result) { currentSentiment = result; }
      } catch {}
    });

    // PRIMARY: Cerebras qwen-3-235b (fast + intelligent)
    // FALLBACK: Claude (if Cerebras fails for any reason)
    const sorry = "Sorry, I'm having a brief connection issue. Could you repeat that?";
    traceEvent(callId, "llm_route", { path: "cerebras-qwen" });
    log("[ROUTE] Cerebras qwen-3-235b → Claude fallback");

    try {
      await respondCerebras(epoch, transcript);
    } catch (e: any) {
      log(`[Cerebras] Failed: ${e.message} — falling back to Claude`);
      try {
        await respondAnthropicFallback(epoch, transcript);
      } catch (e2: any) {
        log(`[Claude] Also failed: ${e2.message}`);
        try { await speak(sorry, epoch); } catch {}
      }
    }
    traceTurnTiming(callId, { totalMs: Date.now() - turnStartedAt });
  }

  async function buildSystemPromptWithTenant(userTranscript: string): Promise<string> {
    const sentimentNote = currentSentiment !== "neutral"
      ? `\n\nCALLER SENTIMENT: ${currentSentiment.toUpperCase()} — adjust tone. Frustrated: direct/factual. Confused: simplify. Positive: maintain momentum.`
      : "";
    const base = buildVoiceSystemPrompt(callState, businessName, industry, clientConfig) + sentimentNote;
    if (!activeUserId) return base;
    try {
      const { buildVoiceTenantContextBlock } = await import("../_core/services/tenantContextForVoice");
      const block = await buildVoiceTenantContextBlock({
        userId: activeUserId,
        leadId: activeLeadId ?? null,
        userMessage: userTranscript,
      });
      if (block.trim()) return `${base}\n\n${block}`;
    } catch (e) {
      log(`[Voice] tenant KB context failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    return base;
  }

  async function respondCerebras(epoch: number, userTranscript: string): Promise<void> {
    const prompt = await buildSystemPromptWithTenant(userTranscript);
    const messages = [
      { role: "system" as const, content: prompt },
      ...historyForLlm(),
    ];

    const models = cerebrasModelCandidates();
    let lastErr: unknown;
    for (let i = 0; i < models.length; i++) {
      const model = models[i]!;
      try {
        log(`[Cerebras] streaming model=${model} maxTok=${ENV.voiceLlmMaxTokens} temp=${ENV.voiceLlmTemperature}`);
        // Get next key from shared pool (handles rotation + rate-limit cooldown)
        const keySlot = cerebrasPool.getKey();
        if (!keySlot) throw new Error("No Cerebras keys available");
        const cerebrasClient = new OpenAI({ apiKey: keySlot.key, baseURL: "https://api.cerebras.ai/v1" });
        const body: Record<string, unknown> = {
          model,
          messages,
          stream: true,
          max_tokens: ENV.voiceLlmMaxTokens,
          temperature: ENV.voiceLlmTemperature,
        };
        const stream = await cerebrasClient.chat.completions.create(
          body as unknown as OpenAI.Chat.ChatCompletionCreateParamsStreaming
        );
        log(`[Cerebras] Key #${keySlot.index + 1} model=${model}`);
        await streamToCartesia(stream as any, epoch, "cerebras");
        return;
      } catch (e: unknown) {
        lastErr = e;
        const msg = e instanceof Error ? e.message : String(e);
        const is404 =
          (e as { status?: number })?.status === 404 || /\b404\b/.test(msg);
        log(`[Cerebras] model ${model} failed: ${msg}`);
        if (is404 && i < models.length - 1) continue;
        throw e;
      }
    }
    throw lastErr;
  }

  async function respondAnthropicFallback(epoch: number, userTranscript: string): Promise<void> {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const prompt = await buildSystemPromptWithTenant(userTranscript);
    const messages = historyForLlm().map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const stream = await client.messages.stream({
      model: process.env.CLAUDE_MODEL || "claude-3-5-haiku-20241022",
      max_tokens: ENV.voiceLlmMaxTokens,
      temperature: ENV.voiceLlmTemperature,
      system: prompt,
      messages,
    });

    await streamToCartesia(stream as any, epoch, "claude");
  }

  // ── Stream LLM tokens → Cartesia clause by clause ────────────────────────
  async function streamToCartesia(
    stream: any,
    epoch: number,
    source: "cerebras" | "claude"
  ): Promise<void> {
    // Fresh context for every response — prevents "context closed" cascade errors
    cartesiaContextId = `ctx_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    let assembled = "";
    let spokenUpTo = 0;
    let fullText = "";
    /** Cartesia requires the first frame of a context to use continue=false; continuation uses continue=true. */
    let firstTtsClause = true;

    const sendClause = (text: string) => {
      if (!text.trim() || epoch !== generationEpoch || isEnded) return;
      // Strip tool calls, URLs, markdown from speech
      const clean = text
        .replace(/TOOL:\s*\w+\s*\{[^}]*\}/g, "")  // remove tool calls
        .replace(/https?:\/\/[^\s]+/gi, "")           // remove URLs
        .replace(/www\.[^\s]+/gi, "")                  // remove www links
        .replace(/\*+/g, "")
        .replace(/[_#`]/g, " ")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")   // [text](url) → text only
        .replace(/\s+/g, " ")
        .trim();
      if (!clean) return;
      // Each clause gets its OWN context_id — never chain continue=true
      // Chaining causes "context closed" errors when Cartesia finalizes mid-stream
      cartesiaContextId = `ctx_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
      cartesiaSend(clean, false);
      firstTtsClause = false;
    };

    try {
      if (source === "cerebras") {
        for await (const chunk of stream) {
          if (epoch !== generationEpoch || isEnded) break;
          const delta = chunk.choices?.[0]?.delta?.content || "";
          if (!delta) continue;
          assembled += delta;
          fullText += delta;
          spokenUpTo = drainSpeakableToTts(assembled, spokenUpTo, sendClause);
        }
      } else {
        // Claude streaming
        for await (const event of stream) {
          if (epoch !== generationEpoch || isEnded) break;
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            const delta = event.delta.text || "";
            assembled += delta;
            fullText += delta;
            spokenUpTo = drainSpeakableToTts(assembled, spokenUpTo, sendClause);
          }
        }
      }
    } catch (e: any) {
      log(`[STREAM] Error: ${e.message}`);
      throw e;
    }

    // Flush anything left (stream ended mid-phrase)
    if (epoch === generationEpoch && !isEnded) {
      spokenUpTo = drainSpeakableToTts(assembled, spokenUpTo, sendClause);
      const remaining = fullText.slice(spokenUpTo);
      if (remaining.trim()) sendClause(remaining);
      cartesiaFlush();
    }

    // Store assistant response
    const cleanResponse = fullText.replace(/TOOL:\s*\w+\s*\{[^}]*\}/g, "").trim();
    if (cleanResponse) {
      appendHistory("assistant", cleanResponse);
      callState = markQuestionAnswered(callState);
    }

    // Handle tool calls
    await handleToolCalls(fullText, epoch);
  }

  async function speak(text: string, epoch: number): Promise<void> {
    if (epoch !== generationEpoch || isEnded) return;
    log(`speak() called: "${text.slice(0,50)}" cartesiaWs=${cartesiaWs?.readyState}`);
    // Always start a new Cartesia context — reusing ctx after greeting without a timely
    // `done` causes 400 "unable to infer voice mode" and loops the sorry line.
    cartesiaContextId = `ctx_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    cartesiaSend(text, false);
    cartesiaFlush();
    appendHistory("assistant", text);
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
      await speak("No problem, thanks for calling, have a great day.", epoch);
      setTimeout(() => cleanup(), 1500);
    } else if (toolName === "book_appointment") {
      if (!canOfferBooking(callState)) {
        log("[TOOL] book_appointment blocked — policy");
        await speak("Got it. What day works for a quick call?", epoch);
        return;
      }
      try {
        const { createManualAppointment } = await import("../db");
        await (createManualAppointment as any)({
          leadId: activeLeadId || 0,
          userId: activeUserId || 1,
          scheduledAt: `${toolArgs.date || "TBD"} ${toolArgs.time || "TBD"}`,
          notes: `AI booking. Caller: ${toolArgs.name}, Phone: ${toolArgs.phone}`,
          status: "confirmed",
        });
        log(`[TOOL] Appointment booked for ${toolArgs.name}`);
      } catch (e) { log(`[TOOL] Booking error: ${e}`); }
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

  // ── Cleanup ───────────────────────────────────────────────────────────────
  async function cleanup(): Promise<void> {
    if (isEnded) return;
    isEnded = true;
    log("Call cleanup");

    // Auto-generate call summary in background
    if (conversationHistory.length > 1 && activeUserId) {
      const history = [...conversationHistory];
      const uid = activeUserId;
      const lid = activeLeadId;
      setImmediate(async () => {
        try {
          const { generateCallSummaryFromTranscript } = await import("../_core/services/callSummaryService");
          const transcript2 = history.map(m => (m.role === "user" ? "Caller" : "AI") + ": " + m.content).join("\n");
          await generateCallSummaryFromTranscript(transcript2, undefined);
          log("[SUMMARY] Call summary generated");
        } catch (e) { log(`[SUMMARY] Failed: ${e instanceof Error ? e.message : String(e)}`); }
      });
    }

    if (keepaliveTimer) { clearInterval(keepaliveTimer); keepaliveTimer = null; }
    try { dgWs?.close(); } catch {}
    try { cartesiaWs?.close(); } catch {}

    // Terminate SignalWire call
    const sid = callSid;
    if (sid && ENV.signalwireSpaceUrl && ENV.signalwireProjectId && ENV.signalwireToken) {
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
        log(`[CLEANUP] SignalWire call ${sid} terminated`);
      } catch {}
    }

    traceEnd(callId);
    if (activeSessionId) {
      try {
        voiceSessionManager.completeSession(activeSessionId);
        await voiceSessionManager.persistSessionToDatabase(activeSessionId);
      } catch {}
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
      const params = msg.start?.customParameters || msg.customParameters || {};
      if (params.sessionId) activeSessionId = String(params.sessionId);
      if (params.leadId !== undefined && params.leadId !== "")
        activeLeadId = parseInt(String(params.leadId), 10);
      if (sigWs) (sigWs as any)._callSid = callSid;
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
          if (activeLeadId) {
            const { getLeadById } = await import("../db");
            const lead = await getLeadById(activeLeadId);
            if (lead) {
              const l = lead as { industry?: string | null };
              if (l.industry) industry = l.industry;
              clientConfig = mergeClientConfig({
                businessName,
                industry,
              });
            }
          }
          const sess = activeSessionId ? voiceSessionManager.getSession(activeSessionId) : null;
          if (sess?.voiceProfileId) voiceProfile = resolveVoiceProfileForEngine(sess.voiceProfileId);
          if (sess?.userId) activeUserId = sess.userId ?? undefined;
          if (activeSessionId && callSid) {
            voiceSessionManager.updateSession(activeSessionId, { callSid } as any);
          }
        } catch (e) {
          log(`Session bind: ${e}`);
        }
        await new Promise((r) => setTimeout(r, 200));
        if (!isEnded) {
          const bname = clientConfig.businessName.replace("ApexAI","Apex A I").replace("Apex AI","Apex A I"); const greeting = `Hi, thanks for calling ${bname}. How can I help you today?`;
          await speak(greeting, generationEpoch);
          traceEvent(callId, "greeting_sent");
          log("[GREETING] Sent");
          setTimeout(() => {
            greetingDone = true;
            log("[GREETING] Barge-in enabled");
          }, 2500);
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
      if (greetingDone && isSpeaking) {
        const energy = estimateMulawEnergy(audio);
        const th = ENV.voiceBargeInEnergyThreshold;
        if (energy > th && !turnCtl.interruptRequested) {
          log(`[BARGE-IN] energy=${energy} (threshold=${th})`);
          traceEvent(callId, "barge_in_energy", { energy, threshold: th });
          turnCtl = onUserSpeechStart(turnCtl);
          generationEpoch++;
          stopSpeaking();
        } else if (energy <= th && !turnCtl.interruptRequested) {
          return;
        }
      }

      if (dgReady && dgWs && dgWs.readyState === WebSocket.OPEN) {
        dgWs.send(audio);
      }
    }

    else if (event === "stop") {
      log("Stream stopped");
      await cleanup();
    }
  });

  sigWs.on("close", () => { log("SignalWire WS closed"); cleanup(); });
  sigWs.on("error", (e) => { log(`SignalWire error: ${e.message}`); cleanup(); });
}
