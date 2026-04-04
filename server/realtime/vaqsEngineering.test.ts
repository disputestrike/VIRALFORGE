/**
 * VAQS (Voice Agent Quality Spec) — automated engineering verification.
 * @see docs/internal/VOICE_AGENT_QUALITY_SPEC_SHEET.md
 *
 * Run: pnpm run test:vaqs
 * Full suite: pnpm test (includes this file)
 *
 * This file proves **implementation crosswalk** (code + telemetry contracts). It does not replace
 * live PSTN scenarios §7 of the spec sheet (listening rubric, noise fixtures).
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { VAQS_AUTOMATED_CROSSWALK, VAQS_MANUAL_ONLY_HINTS } from "./vaqsCrosswalk";
import { FINAL_SILENCE_DEBOUNCE_MS } from "./apexStrictBlueprint";
import { ENV } from "../_core/env";

const here = dirname(fileURLToPath(import.meta.url));
const apexRoot = join(here, "../..");

const REQUIRED_VOICE_TRACE_PHASES = [
  "stt_final",
  "deepgram_turn_committed",
  "response_pause",
  "llm_stream_start",
  "tts_first_chunk",
  "latency_stt_final_to_tts_first",
  "tts_first_clause_streaming",
  "barge_in_energy",
] as const;

function readJoinedRelPaths(paths: string[]): string {
  return paths
    .map((rel) => {
      const abs = join(apexRoot, rel);
      return readFileSync(abs, "utf8");
    })
    .join("\n");
}

describe("VAQS automated crosswalk", () => {
  it.each(VAQS_AUTOMATED_CROSSWALK)(
    "$id ($dimension): $description",
    (row) => {
      for (const rel of row.paths) {
        const abs = join(apexRoot, rel);
        expect(existsSync(abs), `missing evidence file: ${rel}`).toBe(true);
      }
      if (row.mustContain?.length) {
        const haystack = readJoinedRelPaths(row.paths);
        for (const needle of row.mustContain) {
          expect(haystack, `${row.id}: expected "${needle}" in ${row.paths.join(", ")}`).toContain(needle);
        }
      }
    }
  );

  it("covers all 21 VAQS rows (automated + manual registry)", () => {
    const autoIds = new Set(VAQS_AUTOMATED_CROSSWALK.map((r) => r.id));
    expect(autoIds.size).toBe(21);
    for (let n = 1; n <= 21; n++) {
      const id = `VAQS-${String(n).padStart(2, "0")}`;
      expect(autoIds.has(id), `missing automated row for ${id}`).toBe(true);
    }
    expect(VAQS_MANUAL_ONLY_HINTS.length).toBeGreaterThan(0);
  });
});

describe("VAQS telemetry contract (LA / RT)", () => {
  it("voiceMetrics.ts declares required trace phases for dashboards and QA", () => {
    const vm = readFileSync(join(apexRoot, "server/realtime/voiceMetrics.ts"), "utf8");
    for (const phase of REQUIRED_VOICE_TRACE_PHASES) {
      expect(vm).toContain(`"${phase}"`);
    }
  });

  it("FINAL_SILENCE_DEBOUNCE_MS stays in VAQS hangover band (500–800ms)", () => {
    expect(FINAL_SILENCE_DEBOUNCE_MS).toBeGreaterThanOrEqual(500);
    expect(FINAL_SILENCE_DEBOUNCE_MS).toBeLessThanOrEqual(800);
  });

  it("Deepgram endpointing and utterance-end are within env clamps (orchestration sanity)", () => {
    expect(ENV.voiceDeepgramEndpointingMs).toBeGreaterThanOrEqual(100);
    expect(ENV.voiceDeepgramEndpointingMs).toBeLessThanOrEqual(2000);
    expect(ENV.voiceDeepgramUtteranceEndMs).toBeGreaterThanOrEqual(300);
    expect(ENV.voiceDeepgramUtteranceEndMs).toBeLessThanOrEqual(3000);
  });

  it("Barge-in sustain frames clamped (noise vs responsiveness)", () => {
    expect(ENV.voiceBargeInSustainFrames).toBeGreaterThanOrEqual(1);
    expect(ENV.voiceBargeInSustainFrames).toBeLessThanOrEqual(10);
  });
});
