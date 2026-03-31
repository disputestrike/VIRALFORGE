import * as voiceProcessingService from "./voiceProcessingService";
import * as voiceSessionManager from "./voiceSessionManager";
import { resolveVoiceProfile } from "./voiceProfiles";
import { synthesizeSpeech } from "./ttsService";

type OutboundSocket = {
  send(data: string): void;
  close?(): void;
};

type PipelineLogger = Pick<Console, "log" | "warn" | "error">;

export type VoiceRealtimeOptions = {
  socket: OutboundSocket;
  requestSessionId?: string | null;
  requestLeadId?: string | null;
  logger?: PipelineLogger;
};

type TimingMetrics = {
  speechStartDetectedMs?: number;
  speechEndDetectedMs?: number;
  sttMs?: number;
  classificationMs?: number;
  llmMs?: number;
  ttsMs?: number;
  playbackStartMs?: number;
  totalMs?: number;
};

export class VoiceRealtimePipeline {
  private readonly socket: OutboundSocket;
  private readonly requestSessionId?: string | null;
  private readonly requestLeadId?: string | null;
  private readonly logger: PipelineLogger;
  private streamSid: string | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private firstChunkAt = 0;
  private speechStartedAt = 0;
  private chunkCount = 0;
  private activeMetrics: TimingMetrics = {};
  private audioChunks: Buffer[] = [];

  constructor(options: VoiceRealtimeOptions) {
    this.socket = options.socket;
    this.requestSessionId = options.requestSessionId;
    this.requestLeadId = options.requestLeadId;
    this.logger = options.logger || console;
  }

  async handleRawMessage(raw: Buffer | string): Promise<void> {
    try {
      const message = JSON.parse(Buffer.isBuffer(raw) ? raw.toString() : raw);

      if (message.event === "start") {
        await this.handleStart(message);
        return;
      }

      if (message.event === "media") {
        await this.handleMedia(message);
        return;
      }

      if (message.event === "mark") {
        this.handleMark(message);
        return;
      }

      if (message.event === "stop") {
        this.handleStop();
      }
    } catch (error) {
      this.logger.error("[VOICE-WS] error parsing message", error);
    }
  }

  handleClose(code?: number, reason?: string): void {
    const sessionId = this.getActiveSessionId();
    this.logger.log("[VOICE-WS] closed", { code, reason, sessionId });
    if (sessionId) {
      voiceSessionManager.traceEvent(sessionId, "ws_closed", { code, reason });
      voiceSessionManager.endSession(sessionId);
    }
  }

  handleError(error: unknown): void {
    const sessionId = this.getActiveSessionId();
    this.logger.error("[VOICE-WS] closed/error", error);
    if (sessionId) {
      voiceSessionManager.traceEvent(sessionId, "ws_error", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async handleStart(message: any): Promise<void> {
    this.streamSid = message.start.streamSid;
    const customParams = message.start.customParameters || {};
    const resolvedSessionId = customParams.sessionId || this.requestSessionId || this.streamSid;
    const resolvedLeadId = customParams.leadId || this.requestLeadId;

    this.logger.log("[VOICE-WS] start event", {
      streamSid: this.streamSid,
      callSid: message.start?.callSid,
      customParameters: customParams,
      resolvedSessionId,
      resolvedLeadId,
    });

    if (!resolvedSessionId) {
      this.logger.error("[VOICE-WS] missing sessionId - closing");
      this.socket.close?.();
      return;
    }

    if (!voiceSessionManager.getSession(resolvedSessionId)) {
      voiceSessionManager.createSession(
        resolvedLeadId ? parseInt(resolvedLeadId, 10) : 0,
        "default",
        resolvedSessionId
      );
    }

    (this.socket as any)._sessionId = resolvedSessionId;
    (this.socket as any)._leadId = resolvedLeadId;
    voiceSessionManager.traceEvent(resolvedSessionId, "ws_start", {
      streamSid: this.streamSid,
      callSid: message.start?.callSid ?? null,
    });

    await this.sendGreeting();
  }

  private async sendGreeting(): Promise<void> {
    const sessionId = this.getActiveSessionId();
    if (!sessionId || !this.streamSid) return;
    const session = voiceSessionManager.getSession(sessionId);
    if (!session || session.greetingSent) return;

    voiceSessionManager.traceEvent(sessionId, "greeting_generation_started");
    try {
      // Resolve voice profile with fallback to Cartesia Sarah
      let voiceId: string | undefined;
      let provider: "cartesia" | "elevenlabs" | undefined;
      try {
        const voiceProfile = await resolveVoiceProfile({
          userId: session.userId,
          leadId: session.leadId,
          explicitVoiceProfileId: session.voiceProfileId,
        });
        voiceId = voiceProfile.externalVoiceId;
        provider = voiceProfile.provider === "other" ? undefined : voiceProfile.provider;
      } catch (profileErr) {
        this.logger.warn("[VOICE-WS] resolveVoiceProfile failed — using default Cartesia voice", profileErr);
        voiceId = "694f9389-aac1-45b6-b726-9d9369183238"; // Cartesia Sarah
        provider = "cartesia";
      }

      const greetingStartedAt = Date.now();
      const greetingAudio = await synthesizeSpeech(
        "Hello, thank you for calling. This is ApexAI. How can I help you today?",
        {
          voiceId,
          provider,
        }
      );
      const payload = greetingAudio.toString("base64");

      voiceSessionManager.updateSession(sessionId, {
        greetingSent: true,
      });
      voiceSessionManager.setTurnState(sessionId, "assistant_speaking", {
        phase: "greeting",
      });
      voiceSessionManager.traceEvent(sessionId, "greeting_playback_start", {
        payloadBytes: greetingAudio.length,
        ttsMs: Date.now() - greetingStartedAt,
      });

      this.socket.send(JSON.stringify({
        event: "media",
        streamSid: this.streamSid,
        media: { payload },
      }));
      this.socket.send(JSON.stringify({
        event: "mark",
        streamSid: this.streamSid,
        mark: { name: `greet_${Date.now()}` },
      }));
      this.logger.log("[VOICE-WS] greeting playback start", {
        sessionId,
        payloadBytes: greetingAudio.length,
      });
    } catch (error) {
      voiceSessionManager.traceEvent(sessionId, "greeting_failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      this.logger.error("[VOICE-WS] greeting failed", error);
    }
  }

  private async handleMedia(message: any): Promise<void> {
    if (message.media?.track === "outbound") return;

    const payloadBuffer = Buffer.from(message.media.payload || "", "base64");
    const sessionId = this.getActiveSessionId();
    const now = Date.now();
    const isSpeechLike = this.isSpeechLike(payloadBuffer);

    if (!this.firstChunkAt) {
      this.firstChunkAt = now;
      this.logger.log("[VOICE-WS] media chunk received", {
        chunk: message.media?.chunk,
        payloadBytes: payloadBuffer.length,
        track: message.media?.track,
      });
      if (sessionId) {
        voiceSessionManager.traceEvent(sessionId, "first_media_chunk_received", {
          chunk: message.media?.chunk,
          payloadBytes: payloadBuffer.length,
        });
      }
    }

    if (sessionId && isSpeechLike && !this.speechStartedAt) {
      this.speechStartedAt = now;
      this.activeMetrics.speechStartDetectedMs = now - this.firstChunkAt;
      voiceSessionManager.setTurnState(sessionId, "user_speaking", {
        chunk: message.media?.chunk,
        payloadBytes: payloadBuffer.length,
      });
      this.logger.log("[TURN] user_speaking", {
        sessionId,
        chunk: message.media?.chunk,
        payloadBytes: payloadBuffer.length,
      });
    }

    const session = sessionId ? voiceSessionManager.getSession(sessionId) : null;
    if (session?.turnState === "assistant_speaking" && isSpeechLike) {
      this.socket.send(JSON.stringify({ event: "clear", streamSid: this.streamSid }));
      voiceSessionManager.setTurnState(sessionId!, "user_speaking", {
        interrupt: true,
      });
      voiceSessionManager.traceEvent(sessionId!, "interrupt_tts");
      this.logger.log("[TURN] interrupt_tts", { sessionId });
    }

    this.audioChunks.push(payloadBuffer);
    this.chunkCount += 1;

    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    const delayMs = isSpeechLike ? 350 : 250;
    this.silenceTimer = setTimeout(() => {
      void this.processBufferedAudio();
    }, delayMs);

    if (this.audioSize() >= 32000) {
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      await this.processBufferedAudio();
    }
  }

  private handleMark(message: any): void {
    const sessionId = this.getActiveSessionId();
    this.logger.log("[VOICE-WS] mark event", { name: message.mark?.name, sessionId });
    if (sessionId) {
      voiceSessionManager.traceEvent(sessionId, "playback_finished", {
        markName: message.mark?.name,
      });
      voiceSessionManager.setTurnState(sessionId, "idle", {
        markName: message.mark?.name,
      });
    }
  }

  private handleStop(): void {
    const sessionId = this.getActiveSessionId();
    this.logger.log("[VOICE-WS] stop event", { sessionId, streamSid: this.streamSid });
    if (sessionId) {
      voiceSessionManager.traceEvent(sessionId, "stop_event", {
        streamSid: this.streamSid,
      });
      voiceSessionManager.completeSession(sessionId);
    }
  }

  private async processBufferedAudio(): Promise<void> {
    const sessionId = this.getActiveSessionId();
    if (!sessionId || this.isProcessing) return;
    if (this.audioChunks.length === 0) return;

    const audioSize = this.audioSize();
    if (audioSize < 1600) {
      voiceSessionManager.traceEvent(sessionId, "audio_discarded_too_small", {
        audioBytes: audioSize,
        chunkCount: this.chunkCount,
      });
      this.resetAudioBuffer();
      return;
    }

    this.isProcessing = true;
    voiceSessionManager.setTurnState(sessionId, "processing", {
      audioBytes: audioSize,
      chunkCount: this.chunkCount,
    });
    this.logger.log("[TURN] processing", { sessionId, audioBytes: audioSize });

    const processingStartedAt = Date.now();
    this.activeMetrics.speechEndDetectedMs = processingStartedAt - (this.speechStartedAt || processingStartedAt);
    const completeAudio = Buffer.concat(this.audioChunks);
    this.resetAudioBuffer();

    try {
      const result = await voiceProcessingService.processAudioMessage(sessionId, completeAudio);
      const timings = result.timings || {};
      const playbackStartedAt = Date.now();
      const finalMetrics = {
        ...this.activeMetrics,
        sttMs: timings.sttMs,
        classificationMs: timings.classificationMs,
        llmMs: timings.llmMs,
        ttsMs: timings.ttsMs,
        playbackStartMs: playbackStartedAt - processingStartedAt,
        totalMs: playbackStartedAt - processingStartedAt,
      };

      this.logger.log("[VOICE-WS] response timings", finalMetrics);
      voiceSessionManager.traceEvent(sessionId, "response_timings", finalMetrics);

      if (!result.audioPayload || !this.streamSid) {
        this.logger.warn("[VOICE-WS] outbound audio missing", {
          sessionId,
          transcript: result.text,
          response: result.response,
        });
        voiceSessionManager.setTurnState(sessionId, "idle", {
          reason: "no_audio_payload",
        });
        return;
      }

      this.socket.send(JSON.stringify({ event: "clear", streamSid: this.streamSid }));
      voiceSessionManager.setTurnState(sessionId, "assistant_speaking", {
        reason: "reply",
        action: result.action,
      });
      this.logger.log("[TURN] assistant_speaking", {
        sessionId,
        action: result.action,
      });

      this.socket.send(JSON.stringify({
        event: "media",
        streamSid: this.streamSid,
        media: { payload: result.audioPayload },
      }));
      this.socket.send(JSON.stringify({
        event: "mark",
        streamSid: this.streamSid,
        mark: { name: `done_${Date.now()}` },
      }));
      voiceSessionManager.traceEvent(sessionId, "outbound_audio_sent", {
        transcript: result.text,
        response: result.response,
        action: result.action,
        payloadBytes: Math.ceil(result.audioPayload.length * 3 / 4),
      });
    } catch (error) {
      this.logger.error("[VOICE-WS] processing failure", error);
      voiceSessionManager.traceEvent(sessionId, "processing_failed", {
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.activeMetrics = {};
      this.isProcessing = false;
    }
  }

  private isSpeechLike(audioBuffer: Buffer): boolean {
    if (audioBuffer.length === 0) return false;
    const nonSilenceBytes = Array.from(audioBuffer).filter((value) => value !== 0xff && value !== 0x7f).length;
    return nonSilenceBytes > Math.max(120, audioBuffer.length * 0.18);
  }

  private audioSize(): number {
    return this.audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  }

  private resetAudioBuffer(): void {
    this.audioChunks = [];
    this.chunkCount = 0;
    this.firstChunkAt = 0;
    this.speechStartedAt = 0;
  }

  private getActiveSessionId(): string | null {
    return (this.socket as any)._sessionId || this.requestSessionId || null;
  }
}
