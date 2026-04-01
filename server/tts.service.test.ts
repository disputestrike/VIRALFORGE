import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("ttsService", () => {
  const originalEnv = {
    CARTESIA_API_KEY: process.env.CARTESIA_API_KEY,
    CARTESIA_VOICE_ID: process.env.CARTESIA_VOICE_ID,
  };

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    process.env.CARTESIA_API_KEY = "cartesia-test";
    delete process.env.CARTESIA_VOICE_ID;
  });

  afterEach(() => {
    process.env.CARTESIA_API_KEY = originalEnv.CARTESIA_API_KEY;
    process.env.CARTESIA_VOICE_ID = originalEnv.CARTESIA_VOICE_ID;
    vi.unstubAllGlobals();
  });

  it("uses Cartesia when CARTESIA_API_KEY is set", async () => {
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

  it("does not fall back to another provider when Cartesia fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      text: async () => "Insufficient credits",
    });
    vi.stubGlobal("fetch", fetchMock);

    const { synthesizeSpeech } = await import("./_core/services/ttsService");
    await expect(
      synthesizeSpeech("No fallback", { provider: "cartesia", voiceId: "cartesia-voice" })
    ).rejects.toThrow(/Cartesia API error/);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("api.cartesia.ai");
  });
});
