/**
 * Hard control instructions prepended to the model context — authority layer.
 */

import type { ConversationMode } from "./callPolicy";
import type { ClassifiedTurn, StrictFacts } from "./strictTypes";

export function buildStrictControllerBlock(opts: {
  facts: StrictFacts;
  mode: ConversationMode;
  classified: ClassifiedTurn;
  dateAnchor: string;
  repeatIndustryBan: boolean;
}): string {
  const lines: string[] = [
    "=== STRICT CONTROLLER (follow these over habitual phrasing) ===",
    opts.dateAnchor,
    `Turn mode: ${opts.mode}`,
    `Turn intent (classifier): ${opts.classified.intent}`,
    "",
    "KNOWN FACTS — never ask for these again:",
  ];
  if (opts.facts.industry) lines.push(`- Caller industry: ${opts.facts.industry}`);
  if (opts.facts.callVolume != null) lines.push(`- Caller mentioned volume: ~${opts.facts.callVolume} calls/month`);
  if (opts.facts.painLabels.length)
    lines.push(`- Caller pain themes: ${opts.facts.painLabels.join(", ")}`);
  if (opts.facts.name) lines.push(`- Name captured: ${opts.facts.name}`);
  if (opts.facts.phoneDigits) lines.push(`- Phone digits captured: ${opts.facts.phoneDigits}`);
  if (!opts.facts.industry && !opts.facts.callVolume && opts.facts.painLabels.length === 0) {
    lines.push("- (none yet — one focused question is OK)");
  }
  lines.push(
    "",
    "LANGUAGE: Confident and direct. Do not chain 'you're right', 'I apologize', or 'perfect'.",
    "Do not invent calendar dates — use SERVER DATE only.",
    "One question per turn unless closing.",
    "Structure: brief acknowledge → answer → one next step."
  );
  if (opts.repeatIndustryBan) {
    lines.push(
      "",
      "CRITICAL: Industry is already known — do NOT ask what industry or type of business again."
    );
  }
  lines.push("=== END STRICT CONTROLLER ===");
  return lines.join("\n");
}
