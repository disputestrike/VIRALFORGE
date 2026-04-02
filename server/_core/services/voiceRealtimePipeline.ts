/**
 * VoiceRealtimePipeline — Full scaffold implementation
 *
 * Deepgram live WebSocket STT with VAD
 * Anthropic Claude streaming → Cartesia streaming TTS (clause by clause)
 * Energy-based barge-in detection (PCM energy, not mulaw heuristics)
 * generationEpoch: stale generation loops abort immediately on barge-in
 * Silence fallback line: "one moment" if no reply starts within 700ms
 * Customer state extraction: email, phone, qualification from transcript
 * Tool layer: booking, CRM save, SMS, human handoff → real ApexAI functions
 */

import * as voiceSessionManager from "./voiceSessionManager";
import { resolveVoiceProfile } from "./voiceProfiles";
import { ENV } from "../env";

type OutboundSocket = { send(data: string): void; close?(): void };
type PipelineLogger = Pick<Console, "log" | "warn" | "error">;

export type VoiceRealtimeOptions = {
  socket: OutboundSocket;
  requestSessionId?: string | null;
  requestLeadId?: string | null;
  logger?: PipelineLogger;
};

// ── Customer state tracked per call ──────────────────────────────────────────
interface CustomerState {
  firstName?: string;
  phone?: string;
  email?: string;
  objectionHistory: string[];
  qualification: { budget?: string; timeline?: string; authority?: string };
}

export class VoiceRealtimePipeline {
  private readonly socket: OutboundSocket;
  private readonly requestSessionId?: string | null;
  private readonly requestLeadId?: string | null;
  private readonly logger: PipelineLogger;

  private streamSid: string | null = null;
  private sessionId: string | null = null;

  // Audio buffer
  private audioChunks: Buffer[] = [];
  private silenceTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  // Speaking guard
  private isSpeaking = false;
  private speakingTimeout: NodeJS.Timeout | null = null;

  // generationEpoch — increment on barge-in to abort stale loops
  private generationEpoch = 0;

  // Deepgram live WebSocket
  private deepgramWs: any = null;
  private deepgramReady = false;

  // Cartesia WebSocket for streaming TTS
  private cartesiaWs: any = null;
  private cartesiaContextId: string | null = null;
  /** Cartesia: first clause in an assistant utterance must use continue=false. */
  private cartesiaNeedsNewContext = true;
  /** Last voice id sent on WS — flush frames must repeat voice (API rejects bare flush). */
  private lastCartesiaVoiceId = "694f9389-aac1-45b6-b726-9d9369183238";
  /** True if the last Cartesia send used continue:true (context still open — needs flush at end). */
  private lastCartesiaContinueWasTrue = false;

  // Customer state
  private customer: CustomerState = { objectionHistory: [], qualification: {} };

  // Silence fallback timer
  private replyStartTimer: NodeJS.Timeout | null = null;
  private silenceFallbackFired = false;
  private _lastTranscript = "";  // for dedup check
  // Keepalive to prevent WS timeout
  private keepaliveTimer: NodeJS.Timeout | null = null;
  /** Media stream stop/close is not call hangup — recover or timeout before DB finalize. */
  private streamStopRecoveryTimer: NodeJS.Timeout | null = null;

  constructor(options: VoiceRealtimeOptions) {
    this.socket = options.socket;
    this.requestSessionId = options.requestSessionId;
    this.requestLeadId = options.requestLeadId;
    this.logger = options.logger || console;
  }

  async handleRawMessage(raw: Buffer | string): Promise<void> {
    try {
      const msg = JSON.parse(Buffer.isBuffer(raw) ? raw.toString() : raw);
      switch (msg.event) {
        case "start": await this.handleStart(msg); break;
        case "media": await this.handleMedia(msg); break;
        case "mark":        this.handleMark(msg);  break;
        case "stop":        this.handleStop();      break;
      }
    } catch (e) { this.logger.error("[PIPE] parse error", e); }
  }

  handleClose(): void {
    this.logger.log("[PIPE] WebSocket closed — deferring cleanup (not immediate hangup)");
    if (this.sessionId) {
      try {
        voiceSessionManager.updateSession(this.sessionId, {
          streamState: "closed",
          awaitingRecovery: true,
        });
      } catch {}
    }
    this.schedulePipelineStreamRecovery(() => {
      if (this.sessionId) voiceSessionManager.endSession(this.sessionId);
    });
  }
  handleError(e: unknown): void { this.logger.error("[PIPE] error", e); }

  // ── START ─────────────────────────────────────────────────────────────────

  private async handleStart(msg: any): Promise<void> {
    this.streamSid = msg.start?.streamSid ?? null;
    const params = msg.start?.customParameters || {};
    this.sessionId = params.sessionId || this.requestSessionId || this.streamSid;
    const leadId = params.leadId || this.requestLeadId;
    // Store callSid for live transfer handoff
    const callSid = msg.start?.callSid || params.callSid || this.sessionId;

    this.logger.log("[PIPE] START", { sessionId: this.sessionId, streamSid: this.streamSid, callSid });

    if (!this.sessionId) { this.socket.close?.(); return; }

    (this.socket as any)._sessionId = this.sessionId;
    (this.socket as any)._leadId = leadId;
    (this.socket as any)._callSid = callSid;

    if (!voiceSessionManager.getSession(this.sessionId)) {
      voiceSessionManager.createSession(leadId ? parseInt(leadId, 10) : 0, "default", this.sessionId);
    }
    if (this.streamStopRecoveryTimer) {
      clearTimeout(this.streamStopRecoveryTimer);
      this.streamStopRecoveryTimer = null;
    }
    voiceSessionManager.updateSession(this.sessionId, {
      callSid,
      streamState: "active",
      awaitingRecovery: false,
      callState: "in_progress",
    } as any);

    // Connect Deepgram live WebSocket for streaming VAD STT
    this.connectDeepgram();

    // Connect Cartesia WebSocket for streaming TTS
    await this.connectCartesia();

    // Wait briefly for Deepgram WS to connect (it's async import)
    await new Promise<void>(resolve => setTimeout(resolve, 500));

    // Wait up to 2s for Cartesia WS to open before greeting
    await new Promise<void>(resolve => {
      if (this.cartesiaWs?.readyState === 1) { resolve(); return; }
      const check = setInterval(() => {
        if (this.cartesiaWs?.readyState === 1) { clearInterval(check); resolve(); }
      }, 50);
      setTimeout(() => { clearInterval(check); resolve(); }, 2000);
    });

    // Send greeting
    await this.sendGreeting();
  }

  // ── DEEPGRAM LIVE WS ──────────────────────────────────────────────────────

  private connectDeepgram(): void {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      // No Deepgram key — fall back to batch processing via silence timer
      this.logger.warn("[PIPE] No DEEPGRAM_API_KEY — using silence-timer STT fallback");
      return;
    }

    const model = (process.env.VOICE_DEEPGRAM_MODEL ?? "nova-2-phonecall").trim();
    const params = new URLSearchParams({
      model,
      encoding: "mulaw",
      sample_rate: "8000",
      channels: "1",
      interim_results: "true",
      punctuate: "true",
      endpointing: String(ENV.voiceDeepgramEndpointingMs),
      language: "en",
    });
    if (process.env.VOICE_DEEPGRAM_USE_UTTERANCE_END === "true") {
      params.set("utterance_end_ms", String(ENV.voiceDeepgramUtteranceEndMs));
    }
    if (process.env.VOICE_DEEPGRAM_VAD_EVENTS === "true") {
      params.set("vad_events", "true");
    }
    if (process.env.VOICE_DEEPGRAM_SMART_FORMAT === "true") {
      params.set("smart_format", "true");
    }

    const session = this.sessionId ? voiceSessionManager.getSession(this.sessionId) : null;
    if (session?.language && session.language !== "en") {
      params.set("language", session.language);
    }

    const url = `wss://api.deepgram.com/v1/listen?${params}`;

    // Dynamic import of ws
    import("ws").then(({ default: WebSocket }) => {
      const ws = new WebSocket(url, { headers: { Authorization: `Token ${apiKey}` } });

      ws.on("unexpected-response", (_req: unknown, res: import("http").IncomingMessage) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8").slice(0, 800);
          this.logger.error(`[PIPE:DG] handshake HTTP ${res.statusCode}: ${body}`);
        });
      });

      ws.on("open", () => {
        this.deepgramReady = true;
        this.logger.log(`[PIPE:DG] connected model=${model}`);
      });

      ws.on("message", async (raw: any) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === "Results") {
            const transcript: string = msg.channel?.alternatives?.[0]?.transcript ?? "";
            const isFinal: boolean = msg.is_final;
            const speechFinal: boolean = msg.speech_final;

            if (!transcript.trim()) return;

            if (isFinal && speechFinal) {
              this.logger.log(`[PIPE:DG] final: "${transcript}"`);
              await this.onFinalTranscript(transcript);
            }
          }
        } catch {}
      });

      ws.on("close", () => { this.deepgramReady = false; this.logger.log("[PIPE:DG] closed"); });
      ws.on("error", (e: any) => this.logger.error("[PIPE:DG] error", e));

      this.deepgramWs = ws;
    }).catch(e => this.logger.error("[PIPE:DG] ws import failed", e));
  }

  // ── CARTESIA STREAMING WS ─────────────────────────────────────────────────

  private async connectCartesia(): Promise<void> {
    const apiKey = process.env.CARTESIA_API_KEY;
    if (!apiKey) return;

    const url = `wss://api.cartesia.ai/tts/websocket?api_key=${apiKey}&cartesia_version=2024-06-10`;

    import("ws").then(({ default: WebSocket }) => {
      const ws = new WebSocket(url);

      ws.on("open", () => this.logger.log("[PIPE:TTS] Cartesia WS connected"));

      ws.on("message", (raw: any) => {
        try {
          const msg = JSON.parse(raw.toString());

          // Streaming audio chunk — send immediately to telephony (ignore stale contexts)
          if (msg.type === "chunk" && msg.data) {
            const cid = msg.context_id;
            if (typeof cid === "string" && cid.length > 0) {
              if (!this.cartesiaContextId || cid !== this.cartesiaContextId) return;
            } else if (!this.cartesiaContextId) {
              return;
            }
            this.sendMedia(msg.data);
            this.isSpeaking = true;
            if (this.replyStartTimer) { clearTimeout(this.replyStartTimer); this.replyStartTimer = null; }
          }

          if (msg.type === "error") {
            const errStr = typeof msg.error === "string" ? msg.error : JSON.stringify(msg.error ?? "");
            if (
              /context has closed|no longer accepting|invalid context id/i.test(errStr) ||
              (msg.status_code === 400 && /closed|context/i.test(errStr))
            ) {
              // Do not null cartesiaContextId here — same race as realtimeVoiceEngine (silence).
              void errStr;
            }
          }

          if (msg.type === "done") {
            this.isSpeaking = false;
            this.cartesiaContextId = null;
            this.sendMark("assistant_done");
            this.setSpeakingTimeout(0); // clear
          }
        } catch {}
      });

      ws.on("close", () => this.logger.log("[PIPE:TTS] Cartesia WS closed"));
      ws.on("error", (e: any) => this.logger.error("[PIPE:TTS] Cartesia error", e));

      this.cartesiaWs = ws;
    }).catch(e => this.logger.error("[PIPE:TTS] ws import failed", e));
  }

  private async cartesiaSendText(text: string): Promise<void> {
    if (!this.cartesiaWs || this.cartesiaWs.readyState !== 1 /* OPEN */) return;

    const hadNoContext = !this.cartesiaContextId;
    if (!this.cartesiaContextId) {
      this.cartesiaContextId = `ctx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    const session = this.sessionId ? voiceSessionManager.getSession(this.sessionId) : null;
    // Use user's selected voice profile if available
    let voiceId = "694f9389-aac1-45b6-b726-9d9369183238"; // Sarah default (Cartesia)
    try {
      if (session?.voiceProfileId || session?.userId) {
        const { resolveVoiceProfile } = await import("./voiceProfiles");
        const profile = await resolveVoiceProfile({
          userId: session?.userId,
          explicitVoiceProfileId: session?.voiceProfileId,
        });
        if (profile.provider === "cartesia") voiceId = profile.externalVoiceId;
      }
    } catch {}

    this.lastCartesiaVoiceId = voiceId;

    let continueCtx = !this.cartesiaNeedsNewContext;
    this.cartesiaNeedsNewContext = false;
    if (hadNoContext && continueCtx) continueCtx = false;

    this.lastCartesiaContinueWasTrue = continueCtx;

    this.cartesiaWs.send(JSON.stringify({
      context_id: this.cartesiaContextId,
      model_id: "sonic-english",
      voice: { mode: "id", id: voiceId },
      transcript: text,
      output_format: { container: "raw", encoding: "pcm_mulaw", sample_rate: 8000 },
      continue: continueCtx,
    }));
  }

  private cartesiaFlushExplicit(contextId: string | null | undefined): void {
    if (!this.cartesiaWs || this.cartesiaWs.readyState !== 1 || !contextId) return;
    const voiceId = this.lastCartesiaVoiceId;
    this.cartesiaWs.send(
      JSON.stringify({
        context_id: contextId,
        model_id: "sonic-english",
        voice: { mode: "id", id: voiceId },
        transcript: "",
        output_format: { container: "raw", encoding: "pcm_mulaw", sample_rate: 8000 },
        continue: true,
        flush: true,
      })
    );
  }

  private cartesiaFlush(): void {
    this.cartesiaFlushExplicit(this.cartesiaContextId);
  }

  private cartesiaCancel(): void {
    if (!this.cartesiaWs || this.cartesiaWs.readyState !== 1 || !this.cartesiaContextId) return;
    this.cartesiaWs.send(JSON.stringify({ context_id: this.cartesiaContextId, cancel: true }));
    this.cartesiaContextId = null;
    this.isSpeaking = false;
  }

  // ── GREETING ──────────────────────────────────────────────────────────────

  private async sendGreeting(): Promise<void> {
    if (!this.sessionId) return;
    const session = voiceSessionManager.getSession(this.sessionId);
    if (!session || session.greetingSent) return;

    voiceSessionManager.updateSession(this.sessionId, { greetingSent: true });

    const greeting = "Hi, thanks for calling. How can I help you today?";

    if (this.cartesiaWs?.readyState === 1) {
      this.cartesiaCancel();
      this.sendClear();
      this.cartesiaNeedsNewContext = true;
      // Single utterance with continue:false closes the context — do not flush after (400 context closed).
      await this.cartesiaSendText(greeting);
      this.setSpeakingTimeout(3000);
    } else {
      // Fallback: batch TTS
      await this.speakBatch(greeting);
    }

    voiceSessionManager.addMessage(this.sessionId, "assistant", greeting);
    this.logger.log("[PIPE] greeting sent");
  }

  // ── MEDIA (inbound audio from caller) ─────────────────────────────────────

  private async handleMedia(msg: any): Promise<void> {
    if (msg.media?.track === "outbound") return;

    const payload = msg.media?.payload ?? "";
    const rawBytes = Buffer.from(payload, "base64");
    if (rawBytes.length === 0) return;

    // Energy-based barge-in (from scaffold: estimateSpeechEnergyPcm16)
    if (this.isSpeaking) {
      const energy = this.estimateEnergy(rawBytes);
      const threshold = ENV.voiceBargeInEnergyThreshold;
      if (energy > threshold) {
        this.logger.log(`[PIPE] barge-in energy=${energy} (threshold=${threshold})`);
        this.interruptSpeech();
      } else {
        return;
      }
    }

    // If Deepgram live WS is connected, stream audio to it
    if (this.deepgramReady && this.deepgramWs?.readyState === 1) {
      this.deepgramWs.send(rawBytes);
      return; // Deepgram VAD handles turn detection
    }

    // Fallback: silence-timer based buffering (when no Deepgram key)
    this.audioChunks.push(rawBytes);
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => void this.processBufferedAudio(), 600);
    if (this.audioSize() >= 48000) {
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      await this.processBufferedAudio();
    }
  }

  // ── ENERGY-BASED BARGE-IN DETECTION ──────────────────────────────────────

  /**
   * Estimate speech energy from mulaw buffer.
   * Mulaw → approximate linear energy without full decode.
   * Higher values = more speech energy.
   */
  private estimateEnergy(mulawBuf: Buffer): number {
    let sum = 0;
    for (let i = 0; i < mulawBuf.length; i++) {
      const b = mulawBuf[i];
      // mulaw silence = 0xFF or 0x7F. Distance from silence = energy proxy.
      const distFromSilence = Math.min(Math.abs(b - 0xFF), Math.abs(b - 0x7F));
      sum += distFromSilence;
    }
    return mulawBuf.length > 0 ? Math.round(sum / mulawBuf.length) : 0;
  }

  private interruptSpeech(): void {
    this.generationEpoch++; // abort any in-flight generation loops
    this.cartesiaCancel();
    this.sendClear();
    this.clearAudioBuffer();
    this.logger.log("[PIPE] speech interrupted, epoch=", this.generationEpoch);
  }

  // ── MARK ─────────────────────────────────────────────────────────────────

  private handleMark(msg: any): void {
    const name = msg.mark?.name ?? "";
    this.logger.log("[PIPE] mark:", name);
    this.isSpeaking = false;
    this.setSpeakingTimeout(0);
  }

  // ── STOP ─────────────────────────────────────────────────────────────────

  private startKeepalive(): void {
    if (this.keepaliveTimer) clearInterval(this.keepaliveTimer);
    // Send a mark event every 25s — keeps SignalWire WS alive
    this.keepaliveTimer = setInterval(() => {
      if (this.streamSid && !this.isProcessing) {
        try {
          this.socket.send(JSON.stringify({
            event: "mark",
            streamSid: this.streamSid,
            mark: { name: `keepalive_${Date.now()}` }
          }));
        } catch {}
      }
    }, 25000);
  }

  private schedulePipelineStreamRecovery(onTimeout: () => void): void {
    if (this.streamStopRecoveryTimer) clearTimeout(this.streamStopRecoveryTimer);
    this.streamStopRecoveryTimer = setTimeout(() => {
      this.streamStopRecoveryTimer = null;
      const s = this.sessionId ? voiceSessionManager.getSession(this.sessionId) : null;
      if (s?.callState === "in_progress" && s.streamState !== "active") {
        this.cleanup();
        onTimeout();
      }
    }, 5000);
  }

  private handleStop(): void {
    this.logger.log("[PIPE] Stream stop — deferring session finalize");
    this.streamSid = null;
    if (this.sessionId) {
      try {
        voiceSessionManager.updateSession(this.sessionId, {
          streamState: "stopped",
          awaitingRecovery: true,
        });
      } catch {}
    }
    this.schedulePipelineStreamRecovery(() => {
      if (this.sessionId) {
        voiceSessionManager.completeSession(this.sessionId);
        void this.sendCallSummaryToOwner();
      }
    });
  }

  private async sendCallSummaryToOwner(): Promise<void> {
    if (!this.sessionId) return;
    try {
      const session = voiceSessionManager.getSession(this.sessionId);
      if (!session?.userId) return;

      // Build summary from conversation history
      const history = session.conversationHistory ?? [];
      if (history.length === 0) return;

      const callerLines = history.filter(m => m.role === "user").map(m => m.content);
      const name = this.customer.firstName || "Unknown caller";
      const phone = this.customer.phone || "No phone captured";
      const email = this.customer.email || "";
      const turns = history.length;

      // Build a brief summary of what they wanted
      const firstUserMsg = callerLines[0] || "";
      const lastUserMsg = callerLines[callerLines.length - 1] || "";

      const summaryLines = [
        `📞 New call summary`,
        `Caller: ${name}`,
        `Phone: ${phone}`,
        email ? `Email: ${email}` : null,
        `Turns: ${turns} exchanges`,
        `First said: "${firstUserMsg.slice(0, 80)}${firstUserMsg.length > 80 ? '...' : ''}"`,
        this.customer.objectionHistory.length > 0 ? `⚠️ Had objections` : null,
        this.customer.qualification.budget ? `Budget: ${this.customer.qualification.budget.slice(0, 50)}` : null,
      ].filter(Boolean).join("\n");

      // Get owner's phone number and transfer number (use as notification number)
      const { getDb } = await import("../../db");
      const { users } = await import("../../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return;

      const [owner] = await (db as any).select().from(users)
        .where(eq(users.id, session.userId)).limit(1);

      const notifyPhone = owner?.transferNumber;
      if (!notifyPhone) return;

      const { sendSMS } = await import("./signalwireService");
      await sendSMS({ to: notifyPhone, body: summaryLines });
      this.logger.log(`[PIPE] Call summary sent to ${notifyPhone}`);
    } catch (e) {
      this.logger.error("[PIPE] Call summary SMS failed:", e);
    }
  }

  // ── DEEPGRAM FINAL TRANSCRIPT → LLM → STREAMING TTS ─────────────────────

  private async onFinalTranscript(transcript: string): Promise<void> {
    if (!this.sessionId || this.isProcessing) return;

    const sessionEarly = voiceSessionManager.getSession(this.sessionId);
    if (sessionEarly?.userId) {
      const { findEscalationMatch } = await import("./escalationRulesService");
      const match = await findEscalationMatch(sessionEarly.userId, transcript);
      if (match) {
        const callSid = (this.socket as any)._callSid || this.sessionId;
        let target = match.transferNumber?.trim() || null;
        if (!target) target = await this.getTransferNumber();
        if (target && callSid) {
          try {
            const { transferCallToHuman } = await import("./signalwireService");
            await transferCallToHuman(callSid, target);
            this.logger.log(`[Escalation] keyword matched → ${target}`);
          } catch (e) {
            this.logger.error("[Escalation] transfer failed", e);
          }
          return;
        }
      }
    }

    this.isProcessing = true;
    const epoch = ++this.generationEpoch;

    // Extract customer data inline
    this.extractCustomerState(transcript);

    // Add to session history
    voiceSessionManager.addMessage(this.sessionId, "user", transcript);

    // Update objection history
    if (this.isObjection(transcript)) {
      this.customer.objectionHistory.push(transcript);
    }

    // NO SILENCE FALLBACK — filler words ("one moment") are banned.
    // If there is silence, it's a pipeline issue, not a UX issue.
    this.silenceFallbackFired = false;

    try {
      await this.streamResponse(transcript, epoch);
    } catch (e) {
      this.logger.error("[PIPE] response error", e);
      if (epoch === this.generationEpoch) {
        await this.speakBatch("Sorry about that, let me try again.");
      }
    } finally {
      this.isProcessing = false;
    }
  }

  // ── FALLBACK: silence-timer batch processing ──────────────────────────────

  private async processBufferedAudio(): Promise<void> {
    if (!this.sessionId || this.isProcessing || this.audioChunks.length === 0) return;

    const combined = Buffer.concat(this.audioChunks);
    this.clearAudioBuffer();

    if (combined.length < 800) return; // too short (~100ms at 8kHz)
    // Don't filter by isSpeechLike here — silence timer already gated this
    // Whisper/Deepgram will return empty string if no speech detected

    this.isProcessing = true;

    let text = "";
    try {
      // Use batch STT
      const { transcribeAudio } = await import("./sttService");
      const session = this.sessionId ? voiceSessionManager.getSession(this.sessionId) : null;
      text = await transcribeAudio(combined, session?.language || "en");
    } catch (e) {
      this.logger.error("[PIPE] batch STT error", e);
    } finally {
      // Release isProcessing BEFORE calling onFinalTranscript
      // so onFinalTranscript can acquire it for the LLM+TTS phase
      this.isProcessing = false;
    }

    if (text.trim()) {
      await this.onFinalTranscript(text);
    }
  }

  // ── STREAMING RESPONSE: Claude → Cartesia clauses ───────────────────────

  private async streamResponse(transcript: string, epoch: number): Promise<void> {
    if (!this.sessionId) return;

    const session = voiceSessionManager.getSession(this.sessionId);
    const history = session?.conversationHistory ?? [];

    const recentHistory = history.slice(-16);
    const systemPrompt = await this.buildSystemPromptAsync(session, transcript);
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...recentHistory.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    const semantic = this.chooseRoute(transcript, this.customer.objectionHistory.length);
    this.logger.log(`[PIPE] llm=anthropic semantic=${semantic} epoch=${epoch}`);

    if (!(process.env.ANTHROPIC_API_KEY ?? "").trim()) {
      this.logger.error("[PIPE] ANTHROPIC_API_KEY missing — cannot run LLM");
      return;
    }

    await this.streamClaude(messages, transcript, epoch);
  }

  // ── CLAUDE STREAMING → CARTESIA ──────────────────────────────────────────

  private async streamClaude(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    transcript: string,
    epoch: number
  ): Promise<void> {
    this.cartesiaCancel();
    this.sendClear();
    this.cartesiaNeedsNewContext = true;
    this.lastCartesiaContinueWasTrue = false;
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    const systemMsg = messages.find(m => m.role === "system")?.content ?? "";
    const chatMsgs = messages
      .filter(m => m.role !== "system")
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    const stream = await client.messages.stream({
      model: ENV.voiceClaudeModel,
      max_tokens: Math.min(1024, Math.max(400, ENV.voiceLlmMaxTokens * 2)),
      temperature: Math.min(0.75, Math.max(0.35, ENV.voiceLlmTemperature)),
      system: systemMsg,
      messages: chatMsgs,
    });

    let assembled = "";
    let spokenUpTo = 0;

    for await (const event of stream) {
      if (epoch !== this.generationEpoch) { stream.abort(); return; }

      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        assembled += event.delta.text;

        const clauses = this.splitClauses(assembled);
        const ready = clauses.slice(0, -1).join(" ");
        if (ready.length > spokenUpTo) {
          const fresh = sanitizeForSpeech(ready.slice(spokenUpTo));
          if (fresh.trim()) {
            await this.cartesiaSendText(fresh);
            spokenUpTo = ready.length;
            this.setSpeakingTimeout(8000);
          }
        }
      }
    }

    if (epoch !== this.generationEpoch) return;

    const remaining = sanitizeForSpeech(assembled.slice(spokenUpTo));
    if (remaining.trim()) await this.cartesiaSendText(remaining);
    if (this.lastCartesiaContinueWasTrue && this.cartesiaContextId) {
      this.cartesiaFlushExplicit(this.cartesiaContextId);
    }

    const rawText = assembled.trim();
    const fullText = sanitizeForSpeech(rawText);
    if (this.sessionId && fullText) {
      voiceSessionManager.addMessage(this.sessionId, "assistant", fullText);
      // Run tools on RAW text (before TOOL: is stripped by sanitize)
      await this.runToolIfNeeded(rawText, epoch);
    }
  }

  // ── BATCH TTS FALLBACK (when Cartesia WS not available) ──────────────────

  private async speakBatch(text: string): Promise<void> {
    if (!this.streamSid) return;
    try {
      const { synthesizeSpeech } = await import("./ttsService");
      const audio = await synthesizeSpeech(text);
      this.isSpeaking = true;
      this.setSpeakingTimeout(Math.ceil(audio.length / 8) + 2000);
      this.sendMedia(audio.toString("base64"));
      this.sendMark(`batch_${Date.now()}`);
      if (this.sessionId) voiceSessionManager.addMessage(this.sessionId, "assistant", text);
    } catch (e) {
      this.logger.error("[PIPE] batch TTS failed", e);
    }
  }

  // ── TOOL LAYER ────────────────────────────────────────────────────────────

  private async runToolIfNeeded(text: string, epoch: number): Promise<void> {
    const toolMatch = text.match(/TOOL:\s*([a-zA-Z0-9_-]+)\s+(\{[\s\S]*?\})/);
    if (!toolMatch || !this.sessionId) return;

    const [, toolName, argsJson] = toolMatch;
    let args: Record<string, unknown> = {};
    try { args = JSON.parse(argsJson); } catch { return; }

    this.logger.log(`[PIPE:TOOL] ${toolName}`, args);

    let result = "";
    try {
      result = await this.executeTool(toolName, args);
    } catch (e) {
      result = JSON.stringify({ ok: false, error: String(e) });
    }

    if (epoch !== this.generationEpoch) return;

    // Follow-up after tool
    const followUp = `Tool ${toolName} result: ${result}. Respond naturally in 2–4 short spoken sentences — enough to feel human, not one line.`;
    voiceSessionManager.addMessage(this.sessionId, "user", followUp);
    await this.streamResponse(followUp, epoch);
  }

  private async executeTool(name: string, args: Record<string, unknown>): Promise<string> {
    const session = this.sessionId ? voiceSessionManager.getSession(this.sessionId) : null;

    switch (name) {
      case "book_appointment": {
        try {
          const { finalizeVoiceAppointmentBooking } = await import("./voiceBookingPipeline");
          const booked = await finalizeVoiceAppointmentBooking({
            leadId: session?.leadId || 0,
            userId: session?.userId ?? undefined,
            sessionId: this.sessionId || undefined,
            callerPhone: session?.callerPhone,
            businessName: undefined,
            toolArgs: {
              name: typeof args.name === "string" ? args.name : undefined,
              phone: typeof args.phone === "string" ? args.phone : undefined,
              date: typeof args.date === "string" ? args.date : undefined,
              time: typeof args.time === "string" ? args.time : undefined,
              service: typeof args.service === "string" ? args.service : undefined,
              notes: typeof args.notes === "string" ? args.notes : undefined,
            },
            transcriptSnippet: session?.transcript?.slice(-2500),
          });
          return JSON.stringify({
            ok: !!booked,
            message: booked ? "Appointment saved; customer SMS and reminders queued." : "Booking failed",
          });
        } catch (e) {
          this.logger.error("[TOOL:book] error", e);
          return JSON.stringify({ ok: false, message: String(e) });
        }
      }

      case "save_lead": {
        try {
          if (args.email && typeof args.email === "string") this.customer.email = args.email;
          if (args.phone && typeof args.phone === "string") this.customer.phone = args.phone;
          if (args.firstName && typeof args.firstName === "string") this.customer.firstName = args.firstName;

          const db = await import("../../db");
          const leadId = session?.leadId;
          if (leadId && leadId > 0) {
            await db.updateLead(leadId, {
              email: this.customer.email,
              firstName: this.customer.firstName || undefined,
            });
          }
        } catch (e) { this.logger.error("[TOOL:save_lead] error", e); }
        return JSON.stringify({ ok: true, message: "Lead info saved." });
      }

      case "send_sms_followup": {
        try {
          const phone = this.customer.phone || (args.phone as string);
          if (phone) {
            const { sendSMS } = await import("./signalwireService");
            await sendSMS({ to: phone, body: String(args.message || "Thanks for your time! We'll follow up soon.") });
          }
        } catch (e) { this.logger.error("[TOOL:sms] error", e); }
        return JSON.stringify({ ok: true, message: "SMS sent." });
      }

      case "handoff_human": {
        try {
          const transferNumber = await this.getTransferNumber();
          const callSid = (this.socket as any)._callSid || this.sessionId;
          if (transferNumber && callSid) {
            const { transferCallToHuman } = await import("./signalwireService");
            await transferCallToHuman(callSid, transferNumber);
            this.logger.log(`[TOOL:handoff] Transferred ${callSid} → ${transferNumber}`);
          } else {
            this.logger.warn("[TOOL:handoff] No transfer number configured — set in /settings");
          }
        } catch (e) { this.logger.error("[TOOL:handoff] error", e); }
        return JSON.stringify({ ok: true, message: "Transferring you now. Please hold." });
      }

      case "end_call": {
        // User declined — clean, immediate termination
        this.logger.log("[TOOL:end_call] Ending call cleanly");
        try {
          // Terminate SignalWire call via REST API
          const callSid = (this.socket as any)._callSid;
          if (callSid && ENV.signalwireSpaceUrl && ENV.signalwireToken && ENV.signalwireProjectId) {
            const url = `https://${ENV.signalwireSpaceUrl}/api/laml/2010-04-01/Accounts/${ENV.signalwireProjectId}/Calls/${callSid}`;
            await fetch(url, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Authorization": "Basic " + Buffer.from(`${ENV.signalwireProjectId}:${ENV.signalwireToken}`).toString("base64"),
              },
              body: "Status=completed",
            });
            this.logger.log(`[TOOL:end_call] SignalWire call ${callSid} terminated`);
          }
          // Complete the session
          if (this.sessionId) {
            voiceSessionManager.completeSession(this.sessionId, "not_interested");
            await voiceSessionManager.persistSessionToDatabase(this.sessionId);
          }
          // Close the WebSocket
          setTimeout(() => this.socket.close?.(), 500);
        } catch (e) { this.logger.error("[TOOL:end_call] error", e); }
        return JSON.stringify({ ok: true, message: "Call ended." });
      }

      default:
        return JSON.stringify({ ok: false, error: `Unknown tool: ${name}` });
    }
  }

  private async getTransferNumber(): Promise<string | null> {
    const session = this.sessionId ? voiceSessionManager.getSession(this.sessionId) : null;
    if (!session?.userId) return process.env.TRANSFER_NUMBER || null;
    try {
      const db = await import("../../db");
      const { getDb } = db;
      const { users } = await import("../../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const dbInst = await getDb();
      if (!dbInst) return null;
      const [u] = await (dbInst as any).select().from(users).where(eq(users.id, session.userId)).limit(1);
      return u?.transferNumber || null;
    } catch { return null; }
  }

  // ── CUSTOMER STATE EXTRACTION ─────────────────────────────────────────────

  private extractCustomerState(transcript: string): void {
    const t = transcript.toLowerCase();

    const emailMatch = transcript.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (emailMatch) this.customer.email = emailMatch[0];

    const phoneMatch = transcript.match(/\+?1?\s*[\s\-.]?\(?\d{3}\)?[\s\-.]?\d{3}[\s\-.]?\d{4}/);
    if (phoneMatch) this.customer.phone = phoneMatch[0].replace(/\s/g, "");

    if (t.includes("budget") || t.includes("afford") || t.includes("spend")) {
      this.customer.qualification.budget = transcript;
    }
    if (t.includes("next month") || t.includes("quarter") || t.includes("this year") || t.includes("asap")) {
      this.customer.qualification.timeline = transcript;
    }
    if (t.includes("my team") || t.includes("my boss") || t.includes("i decide") || t.includes("i'm the owner")) {
      this.customer.qualification.authority = transcript;
    }
  }

  // ── ROUTING ───────────────────────────────────────────────────────────────

  private chooseRoute(transcript: string, objectionCount: number): "fast" | "smart" {
    if (objectionCount > 0) return "smart";
    const t = transcript.toLowerCase();

    const objectionKeywords = [
      "too expensive", "not interested", "call me later", "send me something",
      "is this legit", "who are you", "stop calling", "remove me", "scam",
      "don't trust", "already have", "busy", "not now", "why should i",
      "what makes you different", "prove it", "compare",
    ];
    if (objectionKeywords.some(k => t.includes(k))) return "smart";

    const complexKeywords = [
      "how does this work", "tell me more", "walk me through", "explain",
      "guarantee", "contract", "how long", "what happens", "integration",
    ];
    if (complexKeywords.some(k => t.includes(k))) return "smart";

    if (transcript.length > 150) return "smart";
    if ((transcript.match(/\?/g) ?? []).length >= 2) return "smart";
    if (/angry|upset|frustrated|ridiculous|terrible|hate/i.test(transcript)) return "smart";

    return "fast";
  }

  private isObjection(text: string): boolean {
    return this.chooseRoute(text, 0) === "smart" && text.length < 200;
  }

  // ── SYSTEM PROMPT ─────────────────────────────────────────────────────────

  private async buildSystemPromptAsync(session: any, userMessage: string): Promise<string> {
    const base = this.buildSystemPrompt(session);
    try {
      const { buildVoiceTenantContextBlock } = await import("./tenantContextForVoice");
      const ctx = await buildVoiceTenantContextBlock({
        userId: session?.userId,
        leadId: session?.leadId,
        userMessage,
      });
      if (ctx) return `${base}\n\n${ctx}`;
    } catch (e) {
      this.logger.warn("[PIPE] tenant KB/memory context failed", e);
    }
    return base;
  }

  private buildSystemPrompt(session: any): string {
    // Real phone conversations need substance — previous "max 2 sentences" rule caused robotic one-liners and lost deals.

    let prompt = `You are a sharp, friendly human-sounding sales and service agent on a LIVE phone call for Apex AI (AI phone agents, lead capture, workflows — match what the KNOWLEDGE / BRANDING blocks say if provided).

CONVERSATION QUALITY (non-negotiable):
- Have a REAL back-and-forth. Most turns should be **2–5 short sentences** when the caller asks something substantive ("tell me about your company", "what about solar", pricing, how it works). One terse sentence sounds broken and loses trust.
- **Answer the actual question first** with useful detail, then optionally one follow-up question. Do not dodge with a slogan.
- **Hold context**: refer to what they already said in this call when relevant. Do not reset the conversation.
- **Never repeat the opening greeting** ("Hi, thanks for calling…") after the first exchange — that reads as a bug.
- Vary your sentence openers; do not reuse the same line twice in a row.

When they ask "tell me about your company" or similar:
- Give a clear value proposition in **several sentences**: what you do, who it helps, one concrete outcome. Pull facts from KNOWLEDGE / BRANDING context when present.

When they express frustration ("why one line", "this is useless"):
- Acknowledge it briefly and **fix the behavior**: longer, direct, helpful answer — do NOT end the call and do NOT use the goodbye line.

STYLE:
- Spoken English only — no markdown, bullets, or lists.
- No filler crutches: avoid "one moment", "let me check the system", long "um" chains.
- Never say "as an AI" or name internal model vendors.

MODE HINTS (flexible):
- Questions → answer fully, then maybe one follow-up.
- Interest → qualify naturally (name, need) without interrogation.
- Ready to book → confirm details clearly.
- Clear decline only → short goodbye (see tools).

ENDING THE CALL (STRICT — do not hang up early):
- Use TOOL: end_call **only** when the caller clearly ends: e.g. goodbye, we're done, not interested in continuing, hang up, that's all I needed (and they sound finished).
- **Do not** end the call because they asked a hard question, complained about quality, or challenged you — stay and help.
- When you must end: say something like "No problem, thanks for calling, have a great day." then TOOL: end_call {}

TOOLS — exact format:
TOOL: book_appointment {"name": "...", "phone": "...", "date": "...", "time": "..."}
TOOL: save_lead {"firstName": "...", "phone": "...", "email": "..."}
TOOL: send_sms_followup {"phone": "...", "message": "..."}
TOOL: handoff_human {"reason": "..."}
TOOL: end_call {}`;

    if (session?.language && session.language !== "en") {
      const langs: Record<string, string> = {
        es: "Spanish", fr: "French", de: "German", pt: "Portuguese",
        it: "Italian", zh: "Mandarin", ja: "Japanese", ko: "Korean",
      };
      prompt += `\n\nIMPORTANT: Respond ONLY in ${langs[session.language] || session.language}.`;
    }

    return prompt;
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  private splitClauses(text: string): string[] {
    return (text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [])
      .map(s => s.trim()).filter(Boolean);
  }

  private isSpeechLike(buf: Buffer): boolean {
    if (buf.length === 0) return false;
    let nonSilence = 0;
    for (let i = 0; i < buf.length; i++) {
      if (buf[i] !== 0xFF && buf[i] !== 0x7F && buf[i] !== 0xFE && buf[i] !== 0x7E) nonSilence++;
    }
    return nonSilence > buf.length * 0.06; // 6% — phone audio is heavily compressed
  }

  private setSpeakingTimeout(ms: number): void {
    if (this.speakingTimeout) clearTimeout(this.speakingTimeout);
    if (ms <= 0) { this.speakingTimeout = null; return; }
    this.speakingTimeout = setTimeout(() => {
      if (this.isSpeaking) {
        this.logger.warn("[PIPE] speaking timeout — forcing idle");
        this.isSpeaking = false;
      }
    }, ms);
  }

  private sendMedia(payload: string): void {
    if (!this.streamSid) return;
    this.socket.send(JSON.stringify({ event: "media", streamSid: this.streamSid, media: { payload } }));
  }

  private sendMark(name: string): void {
    if (!this.streamSid) return;
    this.socket.send(JSON.stringify({ event: "mark", streamSid: this.streamSid, mark: { name } }));
  }

  private sendClear(): void {
    if (!this.streamSid) return;
    this.socket.send(JSON.stringify({ event: "clear", streamSid: this.streamSid }));
  }

  private clearAudioBuffer(): void { this.audioChunks = []; }
  private audioSize(): number { return this.audioChunks.reduce((s, c) => s + c.length, 0); }

  private cleanup(): void {
    if (this.streamStopRecoveryTimer) {
      clearTimeout(this.streamStopRecoveryTimer);
      this.streamStopRecoveryTimer = null;
    }
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.speakingTimeout) clearTimeout(this.speakingTimeout);
    if (this.replyStartTimer) clearTimeout(this.replyStartTimer);
    if (this.keepaliveTimer) { clearInterval(this.keepaliveTimer); this.keepaliveTimer = null; }
    try { this.deepgramWs?.close(); } catch {}
    try { this.cartesiaWs?.close(); } catch {}
    this.audioChunks = [];
    this.isProcessing = false;
    this.isSpeaking = false;
    this.silenceFallbackFired = false;
  }
}

function sanitizeForSpeech(text: string): string {
  let clean = text
    .replace(/TOOL:\s*[\s\S]*$/g, "")   // strip tool calls
    .replace(/\*+/g, "")                  // strip markdown bold
    .replace(/[_#`>]/g, " ")              // strip markdown chars
    .replace(/\s+/g, " ")
    .trim();

  // Remove filler phrases that kill call quality (from competitive analysis)
  const fillers = [
    /^(mm+[,.]?\s*)/i,
    /^(um+[,.]?\s*)/i,
    /^(uh+[,.]?\s*)/i,
    /\bone moment\b/gi,
    /\bjust a moment\b/gi,
    /\bjust one second\b/gi,
  ];
  for (const filler of fillers) {
    clean = clean.replace(filler, "");
  }

  return clean.trim();
}
