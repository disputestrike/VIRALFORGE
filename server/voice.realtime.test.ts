import { beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceRealtimePipeline } from "./_core/services/voiceRealtimePipeline";
import * as voiceSessionManager from "./_core/services/voiceSessionManager";

vi.mock("./_core/services/ttsService", () => ({
  synthesizeSpeech: vi.fn().mockResolvedValue(Buffer.from("greeting-audio")),
}));

vi.mock("./_core/services/voiceProfiles", () => ({
  resolveVoiceProfile: vi.fn().mockResolvedValue({
    id: "cartesia-sarah-sales",
    provider: "cartesia",
    label: "Sarah Sales",
    externalVoiceId: "voice-123",
    useCase: "sales",
    telephonyOptimized: true,
  }),
}));

vi.mock("./_core/services/voiceProcessingService", () => ({
  processAudioMessage: vi.fn().mockResolvedValue({
    audioPayload: Buffer.from("reply-audio").toString("base64"),
    text: "Hello? Is this Apex AI?",
    response: "Yes, this is Apex AI. How can I help you today?",
    action: "follow_up",
    timings: {
      sttMs: 120,
      classificationMs: 15,
      llmMs: 180,
      ttsMs: 90,
    },
  }),
}));

type FakeSocket = {
  sent: string[];
  send: (data: string) => void;
  close: () => void;
  _sessionId?: string;
  _leadId?: string;
};

function createFakeSocket(): FakeSocket {
  return {
    sent: [],
    send(data: string) {
      this.sent.push(data);
    },
    close() {},
  };
}

describe("VoiceRealtimePipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INTERRUPTION_ENERGY_THRESHOLD = "50";
  });

  it("sends a greeting when the stream starts", async () => {
    const socket = createFakeSocket();
    voiceSessionManager.createSession(1, "default", "session_1", {
      userId: 1,
      language: "en",
      voiceProfileId: "cartesia-sarah-sales",
    });

    const pipeline = new VoiceRealtimePipeline({
      socket,
      requestSessionId: "session_1",
      requestLeadId: "1",
      logger: console,
    });

    await pipeline.handleRawMessage(JSON.stringify({
      event: "start",
      start: {
        streamSid: "stream_1",
        callSid: "call_1",
        customParameters: {
          sessionId: "session_1",
          leadId: "1",
        },
      },
    }));

    expect(socket.sent).toHaveLength(2);
    expect(socket.sent[0]).toContain("\"event\":\"media\"");
    expect(socket.sent[1]).toContain("\"event\":\"mark\"");
  });

  it("interrupts assistant playback and sends a reply after caller audio", async () => {
    const socket = createFakeSocket();
    voiceSessionManager.createSession(1, "default", "session_2", {
      userId: 1,
      language: "en",
      voiceProfileId: "cartesia-sarah-sales",
    });

    const pipeline = new VoiceRealtimePipeline({
      socket,
      requestSessionId: "session_2",
      requestLeadId: "1",
      logger: console,
    });

    await pipeline.handleRawMessage(JSON.stringify({
      event: "start",
      start: {
        streamSid: "stream_2",
        customParameters: {
          sessionId: "session_2",
          leadId: "1",
        },
      },
    }));

    await pipeline.handleRawMessage(JSON.stringify({
      event: "media",
      media: {
        track: "inbound",
        chunk: "1",
        timestamp: "1",
        payload: Buffer.alloc(3200, 0x01).toString("base64"),
      },
    }));

    await new Promise((resolve) => setTimeout(resolve, 3500));

    expect(socket.sent.some((payload) => payload.includes("\"event\":\"clear\""))).toBe(true);
    expect(socket.sent.filter((payload) => payload.includes("\"event\":\"media\"")).length).toBeGreaterThanOrEqual(1);
    expect(socket.sent.some((payload) => payload.includes("\"event\":\"mark\""))).toBe(true);
  }, 15000);
});
