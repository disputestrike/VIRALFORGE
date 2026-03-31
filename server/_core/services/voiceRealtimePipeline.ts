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

export class VoiceRealtimePipeline {
  private readonly socket: OutboundSocket;
  private readonly requestSessionId?: string | null;
  private readonly requestLeadId?: string | null;
  private readonly logger: PipelineLogger;

  // Stream state
  private streamSid: string | null = null;
  private sessionId: string | null = null;

  // Audio buffering
  private audioChunks: Buffer[] = [];
  private silenceTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  // Speaking guard — prevents echo loop
  // Set to true when AI is speaking, cleared by mark event + safety timeout
  private isSpeaking = false;
  private speakingTimeout: NodeJS.Timeout | null = null;

  constructor(options: VoiceRealtimeOptions) {
    this.socket = options.socket;
    this.requestSessionId = options.requestSessionId;
    this.requestLeadId = options.requestLeadId;
    this.logger = options.logger || console;
  }

  async handleRawMessage(raw: Buffer | string): Promise<void> {
    try {
      const message = JSON.parse(Buffer.isBuffer(raw) ? raw.toString() : raw);

      switch (message.event) {
        case "start":  await this.handleStart(message);   break;
        case "media":  await this.handleMedia(message);   break;
        case "mark":         this.handleMark(message);    break;
        case "stop":         this.handleStop();           break;
      }
    } catch (error) {
      this.logger.error("[VOICE-WS] parse error", error);
    }
  }

  handleClose(code?: number, reason?: string): void {
    this.logger.log("[VOICE-WS] closed", { code, reason, sessionId: this.sessionId });
    this.cleanup();
    if (this.sessionId) {
      voiceSessionManager.endSession(this.sessionId);
    }
  }

  handleError(error: unknown): void {
    this.logger.error("[VOICE-WS] error", error);
  }

  // ── START ─────────────────────────────────────────────────────────────────

  private async handleStart(message: any): Promise<void> {
    this.streamSid = message.start?.streamSid ?? null;
    const customParams = message.start?.customParameters || {};

    // Session ID: prefer customParameters (passed in <Parameter> tags from /voice/start)
    // then fall back to URL param, then streamSid
    this.sessionId =
      customParams.sessionId ||
      this.requestSessionId ||
      this.streamSid;

    const leadId = customParams.leadId || this.requestLeadId;

    this.logger.log("[VOICE-WS] START", {
      streamSid: this.streamSid,
      sessionId: this.sessionId,
      leadId,
    });

    if (!this.sessionId) {
      this.logger.error("[VOICE-WS] no sessionId — closing");
      this.socket.close?.();
      return;
    }

    // Store on socket for inline handler fallback
    (this.socket as any)._sessionId = this.sessionId;
    (this.socket as any)._leadId = leadId;

    // Create session if it doesn't exist yet
    if (!voiceSessionManager.getSession(this.sessionId)) {
      voiceSessionManager.createSession(
        leadId ? parseInt(leadId, 10) : 0,
        "default",
        this.sessionId
      );
    }

    // Send greeting
    await this.sendGreeting();
  }

  // ── GREETING ──────────────────────────────────────────────────────────────

  private async sendGreeting(): Promise<void> {
    if (!this.sessionId || !this.streamSid) return;

    const session = voiceSessionManager.getSession(this.sessionId);
    if (!session || session.greetingSent) return;

    this.logger.log("[VOICE-WS] sending greeting", { sessionId: this.sessionId });

    try {
      // Resolve voice — fallback to Cartesia Sarah if anything fails
      let voiceId = "694f9389-aac1-45b6-b726-9d9369183238";
      let provider: "cartesia" | "elevenlabs" | undefined = "cartesia";
      try {
        const profile = await resolveVoiceProfile({
          userId: session.userId,
          leadId: session.leadId,
          explicitVoiceProfileId: session.voiceProfileId,
        });
        voiceId = profile.externalVoiceId;
        provider = profile.provider === "other" ? undefined : profile.provider;
      } catch (profileErr) {
        this.logger.warn("[VOICE-WS] voice profile failed, using default", profileErr);
      }

      const greetingText =
        "Hello! Thanks for calling. How can I help you today?";

      const audioBuffer = await synthesizeSpeech(greetingText, {
        voiceId,
        provider,
      });

      voiceSessionManager.updateSession(this.sessionId, { greetingSent: true });
      this.setSpeaking(audioBuffer.length);

      this.socket.send(JSON.stringify({
        event: "media",
        streamSid: this.streamSid,
        media: { payload: audioBuffer.toString("base64") },
      }));
      this.socket.send(JSON.stringify({
        event: "mark",
        streamSid: this.streamSid,
        mark: { name: `greet_${Date.now()}` },
      }));

      this.logger.log("[VOICE-WS] greeting sent", {
        bytes: audioBuffer.length,
        sessionId: this.sessionId,
      });
    } catch (err) {
      this.logger.error("[VOICE-WS] greeting failed", err);
      // Even if greeting fails, set greetingSent so we don't retry
      voiceSessionManager.updateSession(this.sessionId, { greetingSent: true });
      this.isSpeaking = false;
    }
  }

  // ── MEDIA ────────────────────────────────────────────────────────────────

  private async handleMedia(message: any): Promise<void> {
    // Skip outbound (AI's own audio coming back as echo)
    if (message.media?.track === "outbound") return;

    const payloadBuffer = Buffer.from(message.media?.payload || "", "base64");
    if (payloadBuffer.length === 0) return;

    // While AI is speaking: DISCARD silence, allow barge-in on real speech
    if (this.isSpeaking) {
      if (!this.isSpeechLike(payloadBuffer)) return; // discard echo/silence
      // Real speech during AI playback = barge-in
      this.logger.log("[VOICE-WS] barge-in detected", { sessionId: this.sessionId });
      this.clearSpeaking();
      this.clearAudioBuffer();
    }

    // Buffer all audio (speech + a little silence to detect end of utterance)
    this.audioChunks.push(payloadBuffer);

    // Reset silence timer — fires 600ms after last audio chunk
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => void this.processBuffer(), 600);

    // Also flush on large buffer (prevents memory growth on long utterances)
    if (this.audioSize() >= 48000) {
      if (this.silenceTimer) clearTimeout(this.silenceTimer);
      await this.processBuffer();
    }
  }

  // ── MARK ─────────────────────────────────────────────────────────────────

  private handleMark(message: any): void {
    const markName = message.mark?.name ?? "";
    this.logger.log("[VOICE-WS] mark — AI finished speaking", {
      markName,
      sessionId: this.sessionId,
    });
    // AI finished speaking — clear the speaking guard so caller audio is processed
    this.clearSpeaking();
  }

  // ── STOP ─────────────────────────────────────────────────────────────────

  private handleStop(): void {
    this.logger.log("[VOICE-WS] stop", { sessionId: this.sessionId });
    this.cleanup();
    if (this.sessionId) {
      voiceSessionManager.completeSession(this.sessionId);
    }
  }

  // ── PROCESS BUFFERED AUDIO ────────────────────────────────────────────────

  private async processBuffer(): Promise<void> {
    if (!this.sessionId || this.isProcessing) return;

    const audioSize = this.audioSize();

    // Need minimum audio to be worth transcribing (~200ms at 8kHz mulaw = 1600 bytes)
    if (audioSize < 1600) {
      this.clearAudioBuffer();
      return;
    }

    // Check if the buffered audio actually contains speech
    const combined = Buffer.concat(this.audioChunks);
    if (!this.isSpeechLike(combined)) {
      this.clearAudioBuffer();
      return;
    }

    this.isProcessing = true;
    this.clearAudioBuffer();

    this.logger.log("[VOICE-WS] processing audio", {
      bytes: audioSize,
      sessionId: this.sessionId,
    });

    try {
      const result = await voiceProcessingService.processAudioMessage(
        this.sessionId,
        combined
      );

      if (!result.audioPayload || !this.streamSid) {
        this.logger.log("[VOICE-WS] no audio response (silent turn)", {
          text: result.text,
          sessionId: this.sessionId,
        });
        return;
      }

      this.logger.log("[VOICE-WS] sending response", {
        stt: result.text,
        response: result.response?.slice(0, 60),
        action: result.action,
        ttsBytes: Math.ceil(result.audioPayload.length * 3 / 4),
      });

      // Clear any queued audio, then send response
      this.socket.send(JSON.stringify({ event: "clear", streamSid: this.streamSid }));

      const audioBytes = Math.ceil(result.audioPayload.length * 3 / 4);
      this.setSpeaking(audioBytes);

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

    } catch (err) {
      this.logger.error("[VOICE-WS] processing error", err);
      this.isSpeaking = false;
    } finally {
      this.isProcessing = false;
    }
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────

  /**
   * Detect if a mulaw audio buffer contains speech (not silence/echo).
   * Mulaw silence = 0xFF (negative) or 0x7F (positive zero crossing).
   * Lower threshold than before — real phone audio has variance even in "quiet" speech.
   */
  private isSpeechLike(buf: Buffer): boolean {
    if (buf.length === 0) return false;
    let nonSilence = 0;
    for (let i = 0; i < buf.length; i++) {
      const b = buf[i];
      // 0xFF and 0x7F are silence in mulaw. Values near these are near-silence.
      if (b !== 0xFF && b !== 0x7F && b !== 0xFE && b !== 0x7E) {
        nonSilence++;
      }
    }
    // 12% of bytes must be non-silence (was 18% — too strict, dropped quiet voices)
    return nonSilence > buf.length * 0.12;
  }

  /**
   * Mark AI as speaking. Sets a safety timeout to clear the flag even if
   * the mark event never arrives (e.g. call drops during playback).
   */
  private setSpeaking(audioBytes: number): void {
    this.isSpeaking = true;
    if (this.speakingTimeout) clearTimeout(this.speakingTimeout);
    // Safety timeout: audio duration in ms + 3 second buffer
    // mulaw 8kHz = 8000 bytes/second
    const durationMs = Math.ceil((audioBytes / 8000) * 1000) + 3000;
    this.speakingTimeout = setTimeout(() => {
      if (this.isSpeaking) {
        this.logger.warn("[VOICE-WS] speaking timeout — forcing idle", { sessionId: this.sessionId });
        this.isSpeaking = false;
      }
    }, durationMs);
  }

  private clearSpeaking(): void {
    this.isSpeaking = false;
    if (this.speakingTimeout) {
      clearTimeout(this.speakingTimeout);
      this.speakingTimeout = null;
    }
  }

  private clearAudioBuffer(): void {
    this.audioChunks = [];
  }

  private audioSize(): number {
    return this.audioChunks.reduce((s, c) => s + c.length, 0);
  }

  private cleanup(): void {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    if (this.speakingTimeout) clearTimeout(this.speakingTimeout);
    this.audioChunks = [];
    this.isProcessing = false;
    this.isSpeaking = false;
  }
}
