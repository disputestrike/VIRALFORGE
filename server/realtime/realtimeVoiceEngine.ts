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
import voiceSessionManager from "../_core/services/voiceSessionManager";
import { traceStart, traceEvent, traceEnd, traceTurnTiming } from "./voiceMetrics";
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
import { ENV } from "../_core/env";
import { cerebrasModelCandidates } from "../_core/services/llmRouter";

/**
 * Push LLM text to TTS as soon as it's speakable — not only on full sentence end.
 * Cuts time-to-first-audio and avoids the "robot waiting for a period" feel.
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

    const sent = rest.match(/^([^.!?]{1,}?[.!?]+\s*)/);
    if (sent?.[1]?.trim() && sent[1].trim().length >= 2) {
      sendClause(sent[1]);
      i += sent[1].length;
      continue;
    }

    const comma = rest.match(/^([^,\n]{8,120},)/);
    if (comma?.[1]?.trim()) {
      sendClause(comma[1]);
      i += comma[1].length;
      continue;
    }

    if (rest.length >= 54) {
      const cut = rest.lastIndexOf(" ", 80);
      if (cut >= 34) {
        const frag = rest.slice(0, cut);
        if (frag.trim().length >= 20) {
          sendClause(frag);
          i += frag.length;
          continue;
        }
      }
    }
    break;
  }
  return i;
}

// ── Clients ───────────────────────────────────────────────────────────────────
// Cerebras key pool — round robin across up to 10 keys (+ legacy CEREBRAS_API_KEY)
class CerebrasPool {
  private keys: string[] = [];
  private idx = 0;

  constructor() {
    for (let i = 1; i <= 10; i++) {
      const key = process.env[`CEREBRAS_API_KEY_${i}`];
      if (key?.trim()) this.keys.push(key.trim());
    }
    if (this.keys.length === 0 && process.env.CEREBRAS_API_KEY?.trim()) {
      this.keys.push(process.env.CEREBRAS_API_KEY.trim());
    }
    console.log(`[Cerebras] Pool: ${this.keys.length} key(s)`);
  }

  getClient(): OpenAI {
    if (this.keys.length === 0) throw new Error("No Cerebras keys");
    const key = this.keys[this.idx % this.keys.length];
    this.idx++;
    return new OpenAI({ apiKey: key, baseURL: "https://api.cerebras.ai/v1" });
  }
}

const cerebrasPool = new CerebrasPool();

// ── System prompt builder ─────────────────────────────────────────────────────
function buildPrompt(
  state: CallState,
  businessName: string,
  industry: string,
  client: ClientConfig
): string {
  const modeInstructions = {
    answer: "Answer the caller's question directly. Then ask one follow-up.",
    qualify: "Find out what they need. Ask ONE qualifying question.",
    recommend: "Explain how we solve their specific problem. Be concrete.",
    book: "Get their name, phone, and preferred time. Confirm clearly.",
    close: 'Say exactly: "No problem, thanks for calling, have a great day." Nothing else.',
  };

  const bookingLocked = !canOfferBooking(state);
  const bookingRule = bookingLocked
    ? "DO NOT offer appointment times or calendar slots. Answer the question or offer one next step that is NOT scheduling."
    : "You may offer specific times only if the caller is ready to book.";

  return `You are a high-performance AI phone agent for ${businessName}.
Industry: ${industry}

CURRENT MODE: ${state.mode.toUpperCase()}
INSTRUCTION: ${modeInstructions[state.mode]}
BOOKING POLICY: ${bookingRule}

CONFIG FACTS (prefer these over guessing):
- Service areas / ZIPs: ${client.serviceAreas.length ? client.serviceAreas.join(", ") : "not listed — do not claim coverage without verification"}
- Discounts: ${client.discountsLine || "say promotions vary by eligibility"}

VOICE & PACE (sound human, not a script):
- You're a sharp human on the phone — warm, confident, brief. Never stiff or robotic.
- Max 2 short sentences per turn; ~18 words per sentence max. Keep it tight.
- Skip long filler ("um", "uh", "one moment", "let me check", "as an AI"). Short natural nods are OK: "Yeah," "Okay," "Sure —" before the answer.
- One question per turn max unless they asked two things.
- Answer what they asked first; then one clear next step if needed.
- If caller declines: say "No problem, thanks for calling, have a great day." then TOOL: end_call {}
- Never say "as an AI" or name any technology.
- Spoken words only — no markdown, bullets, or lists.

RESPONSE SHAPE: [optional 1–4 word nod] → [direct answer] → [optional one short follow-up]

Vary wording each turn — don't repeat the same opener every time.

EXAMPLE PERFECT RESPONSES:
"Got it. We handle solar inbound calls and book appointments directly to your calendar. Are you getting a lot of inbound leads right now?"
"Absolutely. For HVAC companies we qualify homeowners and book service appointments automatically. Want me to show you how?"
"Sure. I can set that up for Tuesday at 2 PM — does that work for you?"
"No problem, thanks for calling, have a great day."

TOOLS (use exact format):
TOOL: book_appointment {"name": "...", "phone": "...", "date": "...", "time": "..."}
TOOL: save_lead {"firstName": "...", "phone": "...", "email": "..."}
TOOL: end_call {}`;
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
  let voiceProfile: VoiceProfile = getVoiceProfile(voiceProfileId || "professional-female");
  const conversationHistory: { role: "user" | "assistant"; content: string }[] = [];
  let turnStartedAt = 0;
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
      `wss://api.cartesia.ai/tts/websocket?api_key=${process.env.CARTESIA_API_KEY}&cartesia_version=2024-06-10`
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
          // Request pcm_mulaw + 8kHz in cartesiaSend — same as voiceRealtimePipeline; forward base64 mulaw to SignalWire.
          if (streamSid && sigWs.readyState === WebSocket.OPEN) {
            sigWs.send(JSON.stringify({
              event: "media",
              streamSid,
              media: { payload: msg.data },
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

    // voice must be ONLY { mode, id } — nesting __experimental_controls breaks validation (400 invalid voice spec).
    cartesiaWs.send(JSON.stringify({
      context_id: cartesiaContextId,
      model_id: "sonic-english",
      voice: {
        mode: "id",
        id: voiceProfile.cartesiaId,
      },
      transcript: text,
      speed: ttsSpeed,
      output_format: {
        container: "raw",
        encoding: "pcm_mulaw",
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
    const params = new URLSearchParams({
      model: "nova-2",           // nova-2 with mulaw 8kHz phone audio
      encoding: "mulaw",
      sample_rate: "8000",
      channels: "1",
      punctuate: "true",
      interim_results: "true",
      endpointing: "400",
      utterance_end_ms: "1000",
      vad_events: "true",
      smart_format: "true",
    });

    const ws = new WebSocket(
      `wss://api.deepgram.com/v1/listen?${params}`,
      { headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` } }
    );
    dgWs = ws;

    ws.on("open", () => {
      log("Deepgram STT connected");
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

          // Barge-in: only after greeting is done to prevent echo loop
          if (isSpeaking && greetingDone && transcript.length > 3) {
            log(`[BARGE-IN] User spoke: "${transcript}"`);
            turnCtl = onUserSpeechStart(turnCtl);
            generationEpoch++;
            stopSpeaking();
          }

          if (isFinal && speechFinal && greetingDone) {
            traceEvent(callId, "stt_final", { textLen: transcript.length });
            log(`[STT] Final: "${transcript}"`);
            await handleUserTurn(transcript);
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
  async function handleUserTurn(transcript: string): Promise<void> {
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

    conversationHistory.push({ role: "user", content: transcript });

    traceEvent(callId, "llm_route", { path: "cerebras" });
    log("[ROUTE] Cerebras (A/B — set LLM_ALLOW_ANTHROPIC_FALLBACK for Claude)");

    const allowAnthropic =
      process.env.LLM_ALLOW_ANTHROPIC_FALLBACK === "true" &&
      !!(process.env.ANTHROPIC_API_KEY ?? "").trim();

    const sorry =
      "Sorry, I'm having a brief connection issue. Could you repeat that?";

    try {
      await respondCerebras(epoch);
    } catch (e: any) {
      log(`[ERROR] Cerebras LLM failed: ${e.message}`);
      try {
        await respondCerebras(epoch);
      } catch (e2: any) {
        log(`[ERROR] Cerebras retry failed: ${e2.message}`);
        if (allowAnthropic) {
          try {
            await respondAnthropicFallback(epoch);
          } catch (e3: any) {
            log(`[ERROR] Anthropic fallback failed: ${e3.message}`);
            try {
              await speak(sorry, epoch);
            } catch {}
          }
        } else {
          try {
            await speak(sorry, epoch);
          } catch {}
        }
      }
    }
    traceTurnTiming(callId, { totalMs: Date.now() - turnStartedAt });
  }

  async function respondCerebras(epoch: number): Promise<void> {
    const client = cerebrasPool.getClient();
    const prompt = buildPrompt(callState, businessName, industry, clientConfig);
    const messages = [
      { role: "system" as const, content: prompt },
      ...conversationHistory.slice(-8),
    ];

    const models = cerebrasModelCandidates();
    let lastErr: unknown;
    for (let i = 0; i < models.length; i++) {
      const model = models[i]!;
      try {
        log(`[Cerebras] streaming model=${model}`);
        const stream = await client.chat.completions.create({
          model,
          messages,
          stream: true,
          max_tokens: 110,
          temperature: 0.45,
        });
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

  async function respondAnthropicFallback(epoch: number): Promise<void> {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const prompt = buildPrompt(callState, businessName, industry, clientConfig);
    const messages = conversationHistory.slice(-8).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const stream = await client.messages.stream({
      model: process.env.CLAUDE_MODEL || "claude-opus-4-5",
      max_tokens: 200,
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
    // New TTS utterance for this reply — do not chunk into greeting context_id.
    cartesiaContextId = "";
    let assembled = "";
    let spokenUpTo = 0;
    let fullText = "";

    const sendClause = (text: string) => {
      if (!text.trim() || epoch !== generationEpoch || isEnded) return;
      // Strip tool calls from speech
      const clean = text
        .replace(/TOOL:\s*\w+\s*\{[^}]*\}/g, "")
        .replace(/\*+/g, "")
        .replace(/[_#`]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!clean) return;
      cartesiaSend(clean, true);
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
      conversationHistory.push({ role: "assistant", content: cleanResponse });
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
    conversationHistory.push({ role: "assistant", content: text });
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

    if (keepaliveTimer) { clearInterval(keepaliveTimer); keepaliveTimer = null; }
    try { dgWs?.close(); } catch {}
    try { cartesiaWs?.close(); } catch {}

    // Terminate SignalWire call
    const sid = callSid;
    if (sid && process.env.SIGNALWIRE_SPACE_URL && process.env.SIGNALWIRE_PROJECT_ID) {
      try {
        await fetch(
          `https://${process.env.SIGNALWIRE_SPACE_URL}/api/laml/2010-04-01/Accounts/${process.env.SIGNALWIRE_PROJECT_ID}/Calls/${sid}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Authorization: "Basic " + Buffer.from(
                `${process.env.SIGNALWIRE_PROJECT_ID}:${process.env.SIGNALWIRE_API_KEY}`
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
      ensureAudioPipeline();
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
          if (sess?.voiceProfileId) voiceProfile = getVoiceProfile(sess.voiceProfileId);
          if (sess?.userId) activeUserId = sess.userId ?? undefined;
          if (activeSessionId && callSid) {
            voiceSessionManager.updateSession(activeSessionId, { callSid } as any);
          }
        } catch (e) {
          log(`Session bind: ${e}`);
        }
        await new Promise((r) => setTimeout(r, 200));
        if (!isEnded) {
          const greeting = `Hi, thanks for calling ${clientConfig.businessName}. How can I help you today?`;
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

      if (dgReady && dgWs && dgWs.readyState === WebSocket.OPEN) {
        const audio = Buffer.from(payload, "base64");
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
