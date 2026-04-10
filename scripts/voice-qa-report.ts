#!/usr/bin/env tsx
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildVoiceQaScorecard,
  parseTranscriptToTurns,
  type Turn,
} from "../server/realtime/callQualityTagger";

type TranscriptPayload =
  | Turn[]
  | { turns?: Turn[]; transcript?: string; text?: string; messages?: Turn[] };

function usage(): never {
  console.error(
    "Usage: pnpm voice:qa --file <transcript.json|transcript.txt> [--min-score 95] [--json]"
  );
  process.exit(1);
}

function readArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function loadTurnsFromPayload(raw: string, ext: string): Turn[] {
  if (ext === ".json") {
    const parsed = JSON.parse(raw) as TranscriptPayload;
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.turns)) return parsed.turns;
    if (Array.isArray(parsed.messages)) return parsed.messages;
    if (typeof parsed.transcript === "string") return parseTranscriptToTurns(parsed.transcript);
    if (typeof parsed.text === "string") return parseTranscriptToTurns(parsed.text);
    throw new Error("Unsupported JSON shape. Expected turns/messages array or transcript/text string.");
  }
  return parseTranscriptToTurns(raw);
}

const fileArg = readArg("--file");
if (!fileArg) usage();

const minScoreRaw = readArg("--min-score");
const minScore = minScoreRaw ? Number(minScoreRaw) : undefined;
if (minScoreRaw && Number.isNaN(minScore)) {
  console.error(`Invalid --min-score value: ${minScoreRaw}`);
  process.exit(1);
}

const asJson = process.argv.includes("--json");
const fullPath = resolve(process.cwd(), fileArg);
const raw = readFileSync(fullPath, "utf8");
const ext = fullPath.slice(fullPath.lastIndexOf(".")).toLowerCase();
const turns = loadTurnsFromPayload(raw, ext);

if (turns.length === 0) {
  console.error("No turns were parsed from the transcript input.");
  process.exit(1);
}

const scorecard = buildVoiceQaScorecard(turns);

if (asJson) {
  console.log(
    JSON.stringify(
      {
        file: fullPath,
        ...scorecard,
      },
      null,
      2
    )
  );
} else {
  console.log(`Voice QA report for ${fullPath}`);
  console.log(`Score: ${scorecard.score}/100`);
  console.log(`Grade: ${scorecard.grade}`);
  console.log(`Healthy: ${scorecard.healthy ? "yes" : "no"}`);
  console.log(`Summary: ${scorecard.summary}`);
  console.log("");
  console.log("Metrics:");
  console.log(
    `  assistantTurns=${scorecard.metrics.assistantTurns}, userTurns=${scorecard.metrics.userTurns}, avgAssistantSentences=${scorecard.metrics.averageAssistantSentences}, maxAssistantSentences=${scorecard.metrics.maxAssistantSentences}`
  );
  console.log(
    `  stackedQuestionTurns=${scorecard.metrics.stackedQuestionTurns}, harshTurns=${scorecard.metrics.harshTurns}, fillerHits=${scorecard.metrics.fillerHits}, exclamationCount=${scorecard.metrics.exclamationCount}`
  );
  console.log("");
  console.log("Failures:");
  if (scorecard.failures.length === 0) {
    console.log("  PASS");
  } else {
    scorecard.failures.forEach((failure) => {
      console.log(`  - [${failure.severity}] ${failure.code}: ${failure.description}`);
    });
  }
  console.log("");
  console.log("Recommendations:");
  if (scorecard.recommendations.length === 0) {
    console.log("  - Keep this transcript as a reference-quality sample.");
  } else {
    scorecard.recommendations.forEach((rec) => {
      console.log(`  - ${rec}`);
    });
  }
}

if (typeof minScore === "number" && scorecard.score < minScore) {
  process.exit(2);
}
