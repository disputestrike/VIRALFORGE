/**
 * realtimeVoiceEngine.ts — THE CORE ORCHESTRATOR
 * 
 * Pipeline: SignalWire → Deepgram STT → Cerebras/Claude → Cartesia TTS → SignalWire
 * 
 * Key principles:
 * 1. PCM16 16kHz internal standard
 * 2. Streaming everything — never wait for full response
 * 3. Instant barge-in — user speech kills AI speech immediately
 * 4. Epoch system — stale generations are discarded
 * 5. Clean hangup — one goodbye, then terminate
 */

import WebSocket from "ws";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import {
  createCallState,
  updateCallState,
  markQuestionAnswered,
  detectEndCallIntent,
  isObjection,
  isComplexTurn,
  type CallState,
} from "./callPolicy";
import { getVoiceProfile, DEFAULT_VOICE, type VoiceProfile } from "./voiceProfiles";
import voiceSessionManager from "../_core/services/voiceSessionManager";

// ── Clients ───────────────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// Cerebras key pool — round robin across 5 keys
class CerebrasPool {
  private keys: string[] = [];
  private idx = 0;

  constructor() {
    for (let i = 1; i <= 5; i++) {
      const key = process.env[`CEREBRAS_API_KEY_${i}`];
      if (key) this.keys.push(key);
    }
    // fallback to single key
    if (this.keys.length === 0 && process.env.CEREBRAS_API_KEY) {
      this.keys.push(process.env.CEREBRAS_API_KEY);
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

// ── mulaw ↔ PCM16 conversion ──────────────────────────────────────────────────
function mulawToPcm16(mulaw: Buffer): Buffer {
  const pcm = Buffer.allocUnsafe(mulaw.length * 2);
  for (let i = 0; i < mulaw.length; i++) {
    let u = ~mulaw[i] & 0xff;
    const sign = u & 0x80;
    const exp = (u >> 4) & 0x07;
    const mant = u & 0x0f;
    let sample = ((mant << 4) + 0x08) << exp;
    sample -= 33;
    pcm.writeInt16LE(sign ? -sample : sample, i * 2);
  }
  return pcm;
}

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

// ── System prompt builder ─────────────────────────────────────────────────────
function buildPrompt(state: CallState, businessName: string, industry: string): string {
  const modeInstructions = {
    answer: "Answer the caller's question directly. Then ask one follow-up.",
    qualify: "Find out what they need. Ask ONE qualifying question.",
    recommend: "Explain how we solve their specific problem. Be concrete.",
    book: "Get their name, phone, and preferred time. Confirm clearly.",
    close: 'Say exactly: "No problem, thanks for calling, have a great day." Nothing else.',
  };

  return `You are a high-performance AI phone agent for ${businessName}.
Industry: ${industry}

CURRENT MODE: ${state.mode.toUpperCase()}
INSTRUCTION: ${modeInstructions[state.mode]}

ABSOLUTE RULES:
- MAX 2 sentences per response. NEVER more. This is enforced.
- MAX 20 words per sentence.
- ZERO filler words: never say "um", "uh", "one moment", "let me check", "perfect", "great", "so..."
- ONE question per response maximum.
- Answer questions BEFORE trying to qualify or book.
- If caller declines: say "No problem, thanks for calling, have a great day." then TOOL: end_call {}
- Never say "as an AI" or mention Claude, Cerebras, or any technology.
- Spoken words only — no markdown, no bullets, no lists.

ALLOWED acknowledgments (vary each turn): "Got it." / "Sure." / "Absolutely." / "Of course."

RESPONSE SHAPE: [Acknowledge 1-3 words] → [Answer 1 sentence] → [One next question or action]

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
    businessName = "ApexAI",
    industry = "business services",
    voiceProfileId,
  } = opts;

  const callId = `call_${Date.now()}`;
  const log = (msg: string) => console.log(`[${callId}] ${msg}`);

  // State
  let streamSid = "";
  let callSid = "";
  let dgWs: WebSocket | null = null;
  let cartesiaWs: WebSocket | null = null;
  let cartesiaContextId = "";
  let generationEpoch = 0;
  let isSpeaking = false;
  let isEnded = false;
  let greetingDone = false;  // prevent barge-in during greeting
  let dgReady = false;       // don't send audio to Deepgram until connected
  let callState = createCallState();
  let keepaliveTimer: NodeJS.Timeout | null = null;
  const voiceProfile = getVoiceProfile(voiceProfileId || "professional-female");
  const conversationHistory: { role: "user" | "assistant"; content: string }[] = [];

  // ── Cartesia ────────────────────────────────────────────────────────────────
  function connectCartesia() {
    const ws = new WebSocket(
      `wss://api.cartesia.ai/tts/websocket?api_key=${process.env.CARTESIA_API_KEY}&cartesia_version=2024-06-10`
    );

    ws.on("open", () => {
      log("Cartesia connected");
      cartesiaWs = ws;
    });

    ws.on("message", (data: Buffer | string) => {
      if (typeof data === "string") {
        try {
          const msg = JSON.parse(data);
          if (msg.type === "chunk" && msg.data) {
            // Cartesia sends PCM16 s16le at 8kHz — convert to mulaw for SignalWire
            if (streamSid && sigWs.readyState === WebSocket.OPEN) {
              log(`Cartesia chunk: ${msg.data?.length || 0} chars → sending to SignalWire`);
              const pcm16 = Buffer.from(msg.data, "base64");
              const mulaw = pcm16ToMulaw(pcm16);
              sigWs.send(JSON.stringify({
                event: "media",
                streamSid,
                media: { payload: mulaw.toString("base64") },
              }));
              isSpeaking = true;
            }
          } else if (msg.type === "error") {
            log(`Cartesia error msg: ${JSON.stringify(msg)}`);
          } else if (msg.type === "done") {
            isSpeaking = false;
            if (streamSid && sigWs.readyState === WebSocket.OPEN) {
              sigWs.send(JSON.stringify({ event: "mark", streamSid, mark: { name: "done" } }));
            }
          }
        } catch {}
      }
    });

    ws.on("close", () => { log("Cartesia closed"); cartesiaWs = null; });
    ws.on("error", (e) => log(`Cartesia error: ${e.message}`));
  }

  function cartesiaSend(text: string, continueCtx = true) {
    if (!cartesiaWs || cartesiaWs.readyState !== WebSocket.OPEN) return;
    if (!cartesiaContextId) cartesiaContextId = `ctx_${Date.now()}`;

    cartesiaWs.send(JSON.stringify({
      context_id: cartesiaContextId,
      model_id: "sonic-2",
      voice: { mode: "id", id: voiceProfile.cartesiaId },
      transcript: text,
      output_format: {
        container: "raw",
        encoding: "pcm_s16le",  // Cartesia outputs PCM16, we convert to mulaw
        sample_rate: 8000,
      },
      speed: voiceProfile.speed,
      continue: continueCtx,
      add_timestamps: false,
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
    const params = new URLSearchParams({
      model: "nova-2",           // nova-2 with mulaw 8kHz phone audio
      encoding: "mulaw",
      sample_rate: "8000",
      channels: "1",
      punctuate: "true",
      interim_results: "true",
      endpointing: "500",
      utterance_end_ms: "1000",
      vad_events: "true",
      smart_format: "true",
    });

    const ws = new WebSocket(
      `wss://api.deepgram.com/v1/listen?${params}`,
      { headers: { Authorization: `Token ${process.env.DEEPGRAM_API_KEY}` } }
    );

    ws.on("open", () => {
      log("Deepgram STT connected");
      dgWs = ws;
      dgReady = true;
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
            stopSpeaking();
            generationEpoch++;
          }

          if (isFinal && speechFinal && greetingDone) {
            log(`[STT] Final: "${transcript}"`);
            await handleUserTurn(transcript);
          }
        }
      } catch {}
    });

    ws.on("close", () => { log("Deepgram closed"); dgWs = null; });
    ws.on("error", (e) => { log(`Deepgram error: ${e.message}`); });
  }

  // ── LLM response ────────────────────────────────────────────────────────────
  async function handleUserTurn(transcript: string): Promise<void> {
    if (isEnded) return;

    const epoch = ++generationEpoch;
    callState = updateCallState(callState, transcript);

    // End call immediately
    if (callState.endCallRequested) {
      log("[POLICY] End call detected");
      await speak("No problem, thanks for calling, have a great day.", epoch);
      setTimeout(() => cleanup(), 2000);
      return;
    }

    conversationHistory.push({ role: "user", content: transcript });

    const useClause = isObjection(transcript) || isComplexTurn(transcript) || callState.objectionCount > 0;
    log(`[ROUTE] ${useClause ? "Claude (smart)" : "Cerebras (fast)"}`);

    try {
      if (useClause) {
        await respondClaude(epoch);
      } else {
        await respondCerebras(epoch);
      }
    } catch (e: any) {
      log(`[ERROR] LLM failed: ${e.message}`);
      // Fallback to Claude if Cerebras fails
      if (!useClause) {
        try { await respondClaude(epoch); } catch {}
      }
    }
  }

  async function respondCerebras(epoch: number): Promise<void> {
    const client = cerebrasPool.getClient();
    const prompt = buildPrompt(callState, businessName, industry);
    const messages = [
      { role: "system" as const, content: prompt },
      ...conversationHistory.slice(-8),
    ];

    const stream = await client.chat.completions.create({
      model: process.env.CEREBRAS_MODEL || "llama-3.3-70b",
      messages,
      stream: true,
      max_tokens: 120,
      temperature: 0.3,
    });

    await streamToCartesia(stream as any, epoch, "cerebras");
  }

  async function respondClaude(epoch: number): Promise<void> {
    const prompt = buildPrompt(callState, businessName, industry);
    const messages = conversationHistory.slice(-8).map(m => ({
      role: m.role,
      content: m.content,
    }));

    const stream = await anthropic.messages.stream({
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
    let assembled = "";
    let spokenUpTo = 0;
    let fullText = "";

    const clauseRegex = /[^.!?]+[.!?]+/g;

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

          // Find and send complete clauses
          const matches = assembled.match(clauseRegex);
          if (matches) {
            const lastMatch = assembled.lastIndexOf(matches[matches.length - 1]);
            const ready = assembled.slice(0, lastMatch + matches[matches.length - 1].length);
            const fresh = ready.slice(spokenUpTo);
            if (fresh.trim()) {
              sendClause(fresh);
              spokenUpTo = ready.length;
            }
          }
        }
      } else {
        // Claude streaming
        for await (const event of stream) {
          if (epoch !== generationEpoch || isEnded) break;
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            const delta = event.delta.text || "";
            assembled += delta;
            fullText += delta;

            const matches = assembled.match(clauseRegex);
            if (matches) {
              const lastMatch = assembled.lastIndexOf(matches[matches.length - 1]);
              const ready = assembled.slice(0, lastMatch + matches[matches.length - 1].length);
              const fresh = ready.slice(spokenUpTo);
              if (fresh.trim()) {
                sendClause(fresh);
                spokenUpTo = ready.length;
              }
            }
          }
        }
      }
    } catch (e: any) {
      log(`[STREAM] Error: ${e.message}`);
      throw e;
    }

    // Send remaining text
    if (epoch === generationEpoch && !isEnded) {
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
      setTimeout(() => cleanup(), 2000);
    } else if (toolName === "book_appointment") {
      try {
        const { createManualAppointment } = await import("../db");
        await (createManualAppointment as any)({
          leadId: leadId || 0,
          userId: userId || 1,
          scheduledAt: `${toolArgs.date || "TBD"} ${toolArgs.time || "TBD"}`,
          notes: `AI booking. Caller: ${toolArgs.name}, Phone: ${toolArgs.phone}`,
          status: "confirmed",
        });
        log(`[TOOL] Appointment booked for ${toolArgs.name}`);
      } catch (e) { log(`[TOOL] Booking error: ${e}`); }
    } else if (toolName === "save_lead") {
      try {
        const { updateLead } = await import("../db");
        if (leadId) {
          await (updateLead as any)(leadId, {
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

    if (sessionId) {
      try {
        voiceSessionManager.completeSession(sessionId);
        await voiceSessionManager.persistSessionToDatabase(sessionId);
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
      connectCartesia();
      connectDeepgram();

      // Keepalive
      keepaliveTimer = setInterval(() => {
        if (streamSid && sigWs.readyState === WebSocket.OPEN) {
          sigWs.send(JSON.stringify({ event: "mark", streamSid, mark: { name: `ka_${Date.now()}` } }));
        }
      }, 25000);
    }

    else if (event === "start") {
      streamSid = msg.streamSid || msg.start?.streamSid || "";
      callSid = msg.start?.callSid || msg.callSid || streamSid;
      if (sigWs) (sigWs as any)._callSid = callSid;
      log(`Stream started: ${streamSid}`);

      // Wait for Cartesia WS to be ready, then send greeting
      const waitForCartesia = async () => {
        let waited = 0;
        while (!cartesiaWs || cartesiaWs.readyState !== 1) {  // 1 = OPEN
          if (waited > 3000 || isEnded) return;
          await new Promise(r => setTimeout(r, 50));
          waited += 50;
        }
        // 200ms natural pause before speaking
        await new Promise(r => setTimeout(r, 200));
        if (!isEnded) {
          const greeting = "Hi, thanks for calling. How can I help you today?";
          await speak(greeting, generationEpoch);
          log("[GREETING] Sent");
          // Allow barge-in 2.5 seconds after greeting starts
          setTimeout(() => { greetingDone = true; log("[GREETING] Barge-in enabled"); }, 2500);
        }
      };
      waitForCartesia();
    }

    else if (event === "media") {
      const payload = msg.media?.payload;
      if (!payload) return;

        // SignalWire sends mulaw 8kHz base64 — decode to binary and send to Deepgram
      if (dgReady && dgWs && dgWs.readyState === WebSocket.OPEN) {
        const audio = Buffer.from(payload, "base64");
        dgWs.send(audio);  // Send raw binary mulaw to Deepgram
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
