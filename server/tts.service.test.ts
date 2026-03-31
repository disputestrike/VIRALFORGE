import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("ttsService", () => {
  const originalEnv = {
    CARTESIA_API_KEY: process.env.CARTESIA_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID,
    TTS_PROVIDER: process.env.TTS_PROVIDER,
  };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.CARTESIA_API_KEY = "cartesia-test";
    process.env.ELEVENLABS_API_KEY = "elevenlabs-test";
    process.env.ELEVENLABS_VOICE_ID = "eleven-default";
    delete process.env.TTS_PROVIDER;
  });

  afterEach(() => {
    process.env.CARTESIA_API_KEY = originalEnv.CARTESIA_API_KEY;
    process.env.ELEVENLABS_API_KEY = originalEnv.ELEVENLABS_API_KEY;
    process.env.ELEVENLABS_VOICE_ID = originalEnv.ELEVENLABS_VOICE_ID;
    process.env.TTS_PROVIDER = originalEnv.TTS_PROVIDER;
    vi.unstubAllGlobals();
  });

  it("prefers cartesia when both providers are configured and no explicit provider is set", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
      text: async () => "",
    });
    vi.stubGlobal("fetch", fetchMock);

    const { synthesizeSpeech } = await import("./_core/services/ttsService");
    const audio = await synthesizeSpeech("Hello there");

    expect(audio.length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("api.cartesia.ai");
  });

  it("falls back to elevenlabs when cartesia returns insufficient credits", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 402,
        text: async () => "Insufficient credits",
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => Uint8Array.from([9, 8, 7]).buffer,
        text: async () => "",
      });
    vi.stubGlobal("fetch", fetchMock);

    const { synthesizeSpeech } = await import("./_core/services/ttsService");
    const audio = await synthesizeSpeech("Fallback please", {
      provider: "cartesia",
      voiceId: "cartesia-voice",
    });

    expect(audio.length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("api.cartesia.ai");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("api.elevenlabs.io");
  });
});
