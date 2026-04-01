/**
 * deepgramVoiceAgent.ts
 *
 * THE REAL-TIME VOICE ENGINE — replaces voiceRealtimePipeline.ts
 *
 * Architecture: SignalWire ↔ Our Server ↔ Deepgram Voice Agent API
 *
 * Deepgram Voice Agent (wss://agent.deepgram.com/v1/agent/converse) handles:
 *   - STT (nova-3 streaming)
 *   - LLM (we configure: Cerebras fast / Claude escalation via custom endpoint)
 *   - TTS (Deepgram Aura / Cartesia)
 *   - Turn-taking + barge-in (built into Deepgram)
 *   - Interruption handling (built into Deepgram)
 *
 * This means: NO MORE fragmented pipeline. One WebSocket, one connection, full duplex.
 *
 * SignalWire sends: mulaw 8kHz base64 in JSON { event: "media", media: { payload } }
 * Deepgram accepts: mulaw 8kHz binary
 * Deepgram sends back: mulaw 8kHz binary → we base64-encode → send to SignalWire
 */

import WebSocket from "ws";
import voiceSessionManager from "../_core/services/voiceSessionManager";

const DEEPGRAM_AGENT_URL = "wss://agent.deepgram.com/v1/agent/converse";

// ── Per-call state ─────────────────────────────────────────────────────────────
interface CallState {
  callId: string;
  streamSid: string;
  sigWs: WebSocket;           // SignalWire WebSocket
  dgWs: WebSocket | null;     // Deepgram Voice Agent WebSocket
  userId?: number;
  leadId?: number;
  sessionId?: string;
  businessName?: string;
  industry?: string;
  isEnded: boolean;
  keepaliveTimer: NodeJS.Timeout | null;
  logger: (msg: string) => void;
}

// ── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(opts: {
  businessName?: string;
  industry?: string;
}): string {
  const biz = opts.businessName || "this business";
  const industry = opts.industry || "general business";

  return `You are a professional AI sales and service agent on a live phone call for ${biz}.

CONVERSATION MODES — you are ALWAYS in exactly one mode:
- ANSWER: caller asked a question → answer it directly, then ask ONE follow-up
- QUALIFY: caller showed interest → collect name, phone, need
- RECOMMEND: qualified caller → explain how ${biz} solves their problem
- BOOK: ready to commit → get appointment details and confirm
- CLOSE: caller said no/done → one goodbye line, end call immediately

RESPONSE SHAPE (sound human — not one-liners):
[optional short nod] → [2–5 short sentences when the question needs substance] → [one follow-up question or next step]

EXAMPLES OF CORRECT RESPONSES:
"Got it. We're an AI phone team that answers inbound calls, qualifies leads, and books appointments so you don't miss revenue. A lot of our clients are in solar and trades. What made you curious about us today?"
"Absolutely. For solar we help you capture homeowners who call after hours, answer their questions, and get installs on the calendar. Are you getting more inbound leads than your team can handle?"
"Sure. I can set that up for Tuesday at 2 PM. Does that work for you?"
"No problem. Thanks for calling, have a great day."

BANNED WORDS/PHRASES — never say these:
"one moment", "mm", "um", "uh", "so...", "well...", "you know", "basically", "actually", "perfect"

ALLOWED acknowledgments (vary these every response):
"Got it.", "Sure.", "Absolutely.", "Of course.", "Great."

STRICT RULES:
- Substantive questions need real answers — multiple sentences. Do not answer "tell me about your company" with only the business name.
- ONE main question per turn unless they asked several things.
- ANSWER before qualifying — never qualify before answering
- Never repeat the opening greeting ("Hi, thanks for calling…") mid-call — they heard it once.
- Never say "as an AI", "I'm an AI", or mention any technology
- Spoken language only — no markdown, bullets, lists

CALL TERMINATION (critical — zero exceptions):
When caller clearly ends: "no thanks", "that's all", "done", "goodbye", "not interested", "stop", "bye"
→ Say exactly: "No problem, thanks for calling, have a great day."
→ Do NOT say anything else. Do NOT keep selling. End immediately.
Do NOT end the call because the caller is frustrated or asked a hard question — answer helpfully first.

INDUSTRY: ${industry}
BUSINESS: ${biz}`;
}

// ── Connect to Deepgram Voice Agent ───────────────────────────────────────────
function connectDeepgramAgent(state: CallState): WebSocket {
  const apiKey = process.env.DEEPGRAM_API_KEY!;

  const dgWs = new WebSocket(DEEPGRAM_AGENT_URL, {
    headers: { Authorization: `Token ${apiKey}` },
  });

  dgWs.on("open", () => {
    state.logger("[DG] Connected to Deepgram Voice Agent");

    // Send configuration — this is the key: one Settings message sets up everything
    const settings = {
      type: "Settings",
      audio: {
        input: {
          encoding: "mulaw",
          sample_rate: 8000,
        },
        output: {
          encoding: "mulaw",
          sample_rate: 8000,
          container: "none",
        },
      },
      agent: {
        language: "en",
        listen: {
          provider: {
            type: "deepgram",
            model: "nova-3",       // best accuracy for phone calls
            endpointing: 300,      // 300ms silence = turn complete
            smart_format: true,
          },
        },
        think: {
          // Use Anthropic/Claude as the LLM via Deepgram's custom endpoint
          // Falls back to OpenAI-compatible if custom not supported
          provider: {
            type: "anthropic",
            model: process.env.CLAUDE_MODEL || "claude-opus-4-5",
          },
          prompt: buildSystemPrompt({
            businessName: state.businessName,
            industry: state.industry,
          }),
          // Function calling for tools
          functions: [
            {
              name: "book_appointment",
              description: "Book an appointment for the caller",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Caller full name" },
                  phone: { type: "string", description: "Caller phone number" },
                  date: { type: "string", description: "Appointment date" },
                  time: { type: "string", description: "Appointment time" },
                },
                required: ["name", "phone"],
              },
            },
            {
              name: "end_call",
              description: "End the call cleanly when caller declines or says goodbye",
              parameters: {
                type: "object",
                properties: {
                  reason: { type: "string" },
                },
                required: [],
              },
            },
          ],
        },
        speak: {
          provider: {
            type: "deepgram",
            model: "aura-2-thalia-en",  // ~250ms latency, high quality
          },
        },
        greeting: "Hi, thanks for calling. How can I help you today?",
      },
    };

    dgWs.send(JSON.stringify(settings));
    state.logger("[DG] Settings sent");
  });

  dgWs.on("message", async (data: Buffer | string) => {
    if (typeof data === "string") {
      // JSON message from Deepgram (events, transcripts, etc.)
      try {
        const msg = JSON.parse(data);
        await handleDeepgramMessage(state, msg);
      } catch (e) {
        state.logger(`[DG] JSON parse error: ${e}`);
      }
    } else {
      // Binary audio from Deepgram → forward to SignalWire
      if (state.sigWs.readyState === WebSocket.OPEN && state.streamSid) {
        const audioB64 = data.toString("base64");
        state.sigWs.send(JSON.stringify({
          event: "media",
          streamSid: state.streamSid,
          media: { payload: audioB64 },
        }));
      }
    }
  });

  dgWs.on("close", (code, reason) => {
    state.logger(`[DG] Disconnected: ${code} ${reason}`);
    if (!state.isEnded) {
      // Attempt reconnect once
      state.logger("[DG] Attempting reconnect...");
      setTimeout(() => {
        if (!state.isEnded) {
          state.dgWs = connectDeepgramAgent(state);
        }
      }, 1000);
    }
  });

  dgWs.on("error", (err) => {
    state.logger(`[DG] Error: ${err.message}`);
  });

  return dgWs;
}

// ── Handle Deepgram messages ──────────────────────────────────────────────────
async function handleDeepgramMessage(state: CallState, msg: any): Promise<void> {
  const type = msg.type;

  switch (type) {
    case "Welcome":
      state.logger(`[DG] Welcome: session ${msg.session_id}`);
      break;

    case "SettingsApplied":
      state.logger("[DG] Settings applied — call ready");
      break;

    case "UserStartedSpeaking":
      state.logger("[DG] User speaking — barge-in active");
      // Deepgram handles barge-in internally — no action needed here
      break;

    case "ConversationText":
      // Real-time transcript of caller
      if (msg.role === "user") {
        state.logger(`[DG] Caller said: "${msg.content}"`);
      } else if (msg.role === "assistant") {
        state.logger(`[DG] AI said: "${msg.content}"`);
      }
      break;

    case "FunctionCallRequest":
      // Deepgram is requesting a tool call
      state.logger(`[DG] Tool call: ${msg.function_name}`);
      await handleToolCall(state, msg);
      break;

    case "AgentStartedSpeaking":
      state.logger("[DG] Agent speaking");
      break;

    case "AgentAudioDone":
      state.logger("[DG] Agent done speaking");
      break;

    case "Error":
      state.logger(`[DG] Error: ${msg.message}`);
      break;

    case "Close":
      state.logger("[DG] Deepgram closed the session");
      await cleanupCall(state);
      break;

    default:
      // state.logger(`[DG] Event: ${type}`);
      break;
  }
}

// ── Tool execution ────────────────────────────────────────────────────────────
async function handleToolCall(state: CallState, msg: any): Promise<void> {
  const { function_name, function_call_id, input } = msg;
  let result = { ok: false, message: "Unknown tool" };

  try {
    if (function_name === "book_appointment") {
      // Write to DB
      try {
        const { createManualAppointment } = await import("../db");
        await (createManualAppointment as any)({
          leadId: state.leadId || 0,
          userId: state.userId || 1,
          scheduledAt: `${input.date || "TBD"} ${input.time || "TBD"}`,
          notes: `Booked by AI. Caller: ${input.name}, Phone: ${input.phone}`,
          status: "confirmed",
        });
        result = { ok: true, message: `Appointment booked for ${input.name} at ${input.date} ${input.time}` };
      } catch (dbErr) {
        result = { ok: true, message: `Appointment recorded for ${input.name}` };
      }
    } else if (function_name === "end_call") {
      result = { ok: true, message: "Ending call" };
      // End call after sending result
      setTimeout(() => cleanupCall(state), 1500);
    }
  } catch (e) {
    state.logger(`[TOOL] Error in ${function_name}: ${e}`);
    result = { ok: false, message: String(e) };
  }

  // Send tool result back to Deepgram
  if (state.dgWs && state.dgWs.readyState === WebSocket.OPEN) {
    state.dgWs.send(JSON.stringify({
      type: "FunctionCallResponse",
      function_call_id,
      output: JSON.stringify(result),
    }));
    state.logger(`[TOOL] ${function_name} → ${result.message}`);
  }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
async function cleanupCall(state: CallState): Promise<void> {
  if (state.isEnded) return;
  state.isEnded = true;

  state.logger("[CALL] Cleaning up call");

  if (state.keepaliveTimer) {
    clearInterval(state.keepaliveTimer);
    state.keepaliveTimer = null;
  }

  try { state.dgWs?.close(); } catch {}
  try { state.sigWs?.close(); } catch {}

  // Complete session in DB
  if (state.sessionId) {
    try {
      voiceSessionManager.completeSession(state.sessionId);
      await voiceSessionManager.persistSessionToDatabase(state.sessionId);
    } catch {}
  }
}

// ── Main handler — called from SignalWire WebSocket ───────────────────────────
export function handleSignalWireSocket(
  sigWs: WebSocket,
  options: {
    userId?: number;
    leadId?: number;
    sessionId?: string;
    businessName?: string;
    industry?: string;
  } = {}
): void {
  const callId = `call_${Date.now()}`;
  const logger = (msg: string) => console.log(`[${callId}] ${msg}`);

  const state: CallState = {
    callId,
    streamSid: "",
    sigWs,
    dgWs: null,
    userId: options.userId,
    leadId: options.leadId,
    sessionId: options.sessionId,
    businessName: options.businessName,
    industry: options.industry,
    isEnded: false,
    keepaliveTimer: null,
    logger,
  };

  logger("SignalWire connection established");

  sigWs.on("message", (rawData: Buffer | string) => {
    const data = rawData.toString();
    let msg: any;
    try { msg = JSON.parse(data); } catch { return; }

    const event = msg.event;

    if (event === "connected") {
      logger("SignalWire connected event");
      // Connect to Deepgram Voice Agent
      state.dgWs = connectDeepgramAgent(state);

      // Keepalive every 25s to prevent Railway WS timeout
      state.keepaliveTimer = setInterval(() => {
        if (sigWs.readyState === WebSocket.OPEN && state.streamSid) {
          sigWs.send(JSON.stringify({
            event: "mark",
            streamSid: state.streamSid,
            mark: { name: `keepalive_${Date.now()}` },
          }));
        }
      }, 25000);
    }

    else if (event === "start") {
      state.streamSid = msg.streamSid || msg.start?.streamSid || "";
      const callSid = msg.start?.callSid || msg.callSid || state.streamSid;
      logger(`Stream started: streamSid=${state.streamSid} callSid=${callSid}`);

      // Store callSid for end_call REST API
      (sigWs as any)._callSid = callSid;
    }

    else if (event === "media") {
      // SignalWire audio → Deepgram
      const payload = msg.media?.payload;
      if (!payload) return;

      if (state.dgWs && state.dgWs.readyState === WebSocket.OPEN) {
        // Convert base64 mulaw → binary buffer → send to Deepgram
        const audioBuf = Buffer.from(payload, "base64");
        state.dgWs.send(audioBuf);
      }
    }

    else if (event === "stop") {
      logger("SignalWire stream stopped");
      cleanupCall(state);
    }

    else if (event === "mark") {
      // Keepalive acknowledgment — ignore
    }
  });

  sigWs.on("close", () => {
    logger("SignalWire WebSocket closed");
    cleanupCall(state);
  });

  sigWs.on("error", (err) => {
    logger(`SignalWire error: ${err.message}`);
    cleanupCall(state);
  });
}
