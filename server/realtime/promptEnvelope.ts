/**
 * Hard control instructions prepended to the model context — authority layer.
 */

import type { ConversationMode } from "./callPolicy";
import type { ClassifiedTurn, StrictFacts } from "./strictTypes";
import type { BlueprintConversationPhase } from "./callPolicy";

const BLUEPRINT_PHASE_GUIDANCE: Record<BlueprintConversationPhase, string> = {
  greeting: "Welcome and orient briefly, then move into the caller's need.",
  discovery: "Gather broad context first. Ask one simple framing question if needed.",
  qualification: "Probe one layer deeper into need, urgency, volume, or fit.",
  value_delivery: "Explain the relevant value clearly and tie it to the caller's situation.",
  demo: "Run a concise live-demo or role-play explanation instead of trying to close too early.",
  objection_handling: "Address the objection directly, then reopen the path forward calmly.",
  support: "Solve the issue or route accurately. Avoid sales language unless the caller changes direction.",
  booking: "Collect the booking details cleanly and confirm the next step.",
  escalation: "Hand off to a human or callback path with calm, explicit wording.",
  end: "Close warmly and clearly. Do not reopen the conversation.",
};

export function inferBlueprintPhase(opts: {
  mode: ConversationMode;
  classified: ClassifiedTurn;
  facts: StrictFacts;
}): BlueprintConversationPhase {
  const { mode, classified, facts } = opts;
  if (classified.indicatesDone || mode === "close") return "end";
  if (classified.asksForHuman || mode === "handoff") return "escalation";
  if (classified.intent === "support_request") return "support";
  if (classified.intent === "demo_request") return "demo";
  if (mode === "book" || classified.providesAvailability || classified.providesContactInfo) {
    return "booking";
  }
  if (classified.containsObjection) return "objection_handling";
  if (mode === "recommend") return "value_delivery";
  if (mode === "qualify") {
    return facts.industry || facts.painLabels.length > 0 || facts.callVolume != null
      ? "qualification"
      : "discovery";
  }
  if (mode === "answer" && (classified.intent === "ask_what_it_is" || classified.intent === "question")) {
    return "discovery";
  }
  return "value_delivery";
}

export function buildStrictControllerBlock(opts: {
  facts: StrictFacts;
  mode: ConversationMode;
  classified: ClassifiedTurn;
  dateAnchor: string;
  repeatIndustryBan: boolean;
}): string {
  const blueprintPhase = inferBlueprintPhase({
    mode: opts.mode,
    classified: opts.classified,
    facts: opts.facts,
  });
  const lines: string[] = [
    "=== STRICT CONTROLLER (follow these over habitual phrasing) ===",
    opts.dateAnchor,
    `Turn mode: ${opts.mode}`,
    `Blueprint phase: ${blueprintPhase}`,
    `Phase goal: ${BLUEPRINT_PHASE_GUIDANCE[blueprintPhase]}`,
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
    "Tone must stay professional and useful. Do not scold the caller or sound corrective.",
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
