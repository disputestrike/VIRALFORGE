import { describe, expect, it } from "vitest";
import {
  getVoiceProfileById,
  listVoiceProfiles,
} from "./voiceProfiles";

describe("voiceProfiles", () => {
  it("lists Cartesia-backed profiles", () => {
    const list = listVoiceProfiles();
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((p) => p.provider === "cartesia")).toBe(true);
  });

  it("resolves a known id", () => {
    const p = getVoiceProfileById("cartesia-sarah-sales");
    expect(p.id).toBe("cartesia-sarah-sales");
    expect(p.externalVoiceId).toMatch(/^[a-f0-9-]{36}$/i);
  });

  it("falls back to default for unknown or empty id", () => {
    const def = getVoiceProfileById("cartesia-sarah-sales");
    expect(getVoiceProfileById("no-such-voice").id).toBe(def.id);
    expect(getVoiceProfileById(null).id).toBe(def.id);
    expect(getVoiceProfileById(undefined).id).toBe(def.id);
  });
});
