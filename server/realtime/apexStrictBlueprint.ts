/**
 * APEX AI — strict controller blueprint (conversation operating system).
 * Deterministic rules + prompt injection; telephony hooks live in realtimeVoiceEngine.
 *
 * Rule: USER ALWAYS WINS THE TURN — stop TTS / cancel stale generation on interrupt (caller).
 */

export const USER_ALWAYS_WINS_THE_TURN = true;

/** After Deepgram speech_final, wait this long before treating utterance as final (true end-of-turn). */
// Keep within the validated hangover band while relying on faster endpointing and tighter prompts for sharpness.
export const FINAL_SILENCE_DEBOUNCE_MS = 500;

/** Post-process clamp for spoken replies (voice). Elite phone answers should stay compact. */
export const MAX_SENTENCES = 3;
export const MAX_FOLLOW_UP_QUESTIONS = 1;
export const TARGET_MAX_SPOKEN_MS = 6000;

export type BlueprintIntent =
  | "core_explain"
  | "benefit"
  | "objection_staff"
  | "objection_ai_cant_sell"
  | "objection_messes_up"
  | "pressure"
  | "pricing"
  | "booking"
  | "recovery"
  | "re_engagement"
  | "skepticism"
  | "chaos_input"
  | "unknown";

export type ApexControllerMode = "normal" | "recovery";

export interface ApexControllerState {
  lastUserIntent: BlueprintIntent | null;
  lastQuestion: string | null;
  lastAnswer: string | null;
  escalationLevel: number;
  mode: ApexControllerMode;
  industry: string | null;
  /** True after assistant has answered the pending user intent (intent lock). */
  answered: boolean;
  /** Server date anchor — updated when caller corrects “today” / scheduling context. */
  dateAnchorOverride: Date | null;
  /** Last computed booking readiness score 0–1 (heuristic). */
  bookingScore: number;
  /** After skepticism turn — blocks soft booking until cleared by non-skeptic utterance or explicit booking. */
  skepticismLatch: boolean;
}

export function createApexControllerState(): ApexControllerState {
  return {
    lastUserIntent: null,
    lastQuestion: null,
    lastAnswer: null,
    escalationLevel: 0,
    mode: "normal",
    industry: null,
    answered: true,
    dateAnchorOverride: null,
    bookingScore: 0,
    skepticismLatch: false,
  };
}

function contains(text: string, phrases: string[]): boolean {
  const t = text.toLowerCase();
  return phrases.some((p) => t.includes(p.toLowerCase()));
}

/** Phrase maps — deterministic, run before LLM. Order: specific buckets first in classifyDeterministic. */

export const PHRASE_PRESSURE = [
  "so what",
  "why should i care",
  "why should i",
  "that doesn't matter",
  "thats not useful",
  "that's not useful",
  "i don't see the point",
  "dont see the point",
  "who cares",
  "okay and",
  "ok and",
  "why does that matter",
];

export const PHRASE_OBJECTION_STAFF = [
  "we already have that handled",
  "already have people",
  "my team does that",
  "we're covered",
  "were covered",
  "we dont need that",
  "we don't need that",
  "we already answer calls",
  "already have staff",
  "my people handle that",
];

/** Caller thinks the line went dead — answer with substance + momentum, not “I’m talking.” */
export const PHRASE_SILENCE_COMPLAINT = [
  "why aren't you talking",
  "why are you not talking",
  "you're not talking",
  "youre not talking",
  "you aren't saying anything",
  "you arent saying anything",
  "say something",
  "you stopped talking",
];

export const PHRASE_RECOVERY = [
  "you're not listening",
  "youre not listening",
  "that's not what i asked",
  "thats not what i asked",
  "you missed the question",
  "that's not my point",
  "you messed up",
  "you misunderstood me",
  "that's not what i said",
  "thats not what i said",
  "you got it wrong",
];

export const PHRASE_SKEPTICISM = [
  "sounds gimmicky",
  "sounds like a bot",
  "ai can't do that",
  "ai cant do that",
  "don't trust ai",
  "dont trust ai",
  "sounds fake",
  "sounds robotic",
  "don't buy that",
  "dont buy that",
  "just ai hype",
  "ai hype",
];

export const PHRASE_CHAOS_INPUT = [
  "wait no",
  "hold on",
  "start over",
  "that's wrong",
  "thats wrong",
  "let me give you another number",
  "no that's not right",
  "no thats not right",
  "scratch that",
  "actually never mind",
  "never mind",
  "let me rephrase",
];

export const PHRASE_EXPLICIT_BOOKING = [
  "i'm interested",
  "im interested",
  "what's next",
  "whats next",
  "let's do it",
  "lets do it",
  "book a demo",
  "set me up",
  "let's schedule",
  "lets schedule",
  "i want to see it",
  "okay let's talk",
  "ok let's talk",
  "okay lets talk",
];

export type DeterministicBucket =
  | "pressure"
  | "objection_staff"
  | "silence_meta"
  | "recovery"
  | "skepticism"
  | "chaos_input"
  | "core_explain"
  | "benefit"
  | "pricing"
  | "booking_signal"
  | "none";

/** Which phrase map fired (first match wins by bucket order). */
export function classifyDeterministicBucket(text: string): DeterministicBucket {
  const t = text.trim();
  if (!t) return "none";
  if (contains(t, PHRASE_SILENCE_COMPLAINT)) return "silence_meta";
  if (contains(t, PHRASE_RECOVERY)) return "recovery";
  if (contains(t, PHRASE_SKEPTICISM)) return "skepticism";
  if (contains(t, PHRASE_CHAOS_INPUT)) return "chaos_input";
  if (contains(t, PHRASE_PRESSURE)) return "pressure";
  if (contains(t, PHRASE_OBJECTION_STAFF)) return "objection_staff";
  if (contains(t, ["what do you do", "who are you", "tell me about"])) return "core_explain";
  if (contains(t, ["how would this help", "how does this help"])) return "benefit";
  if (contains(t, ["price", "cost", "how much", "pricing"])) return "pricing";
  if (contains(t, PHRASE_EXPLICIT_BOOKING)) return "booking_signal";
  return "none";
}

/** Legacy intent for prompt / traces — maps bucket + fallbacks. */
export function classifyIntent(text: string): BlueprintIntent {
  const b = classifyDeterministicBucket(text);
  switch (b) {
    case "core_explain":
      return "core_explain";
    case "benefit":
      return "benefit";
    case "objection_staff":
      return "objection_staff";
    case "pressure":
      return "pressure";
    case "pricing":
      return "pricing";
    case "booking_signal":
      return "booking";
    case "recovery":
      return "recovery";
    case "skepticism":
      return "skepticism";
    case "chaos_input":
      return "chaos_input";
    case "silence_meta":
      return "re_engagement";
    default:
      if (contains(text, ["book", "demo", "schedule"])) return "booking";
      return "unknown";
  }
}

/** Production copy — deterministic; app-wide (not vertical-specific). */
export const COPY_BLOCKS = {
  core_explain:
    "Apex AI answers inbound calls 24/7, qualifies leads, and books appointments on your calendar — so your team spends time closing, not chasing missed calls.",
  benefit:
    "You stop losing revenue to voicemail and speed-to-lead gaps: calls get answered instantly, qualified, and routed or booked without adding headcount.",
  objection_staff:
    "Totally fair — your team still owns the relationship. Apex removes the repetitive phone tag and qualification noise so your people focus on real conversations that close.",
  objection_ai_cant_sell:
    "The AI isn’t replacing judgment — it’s handling the high-volume, repetitive part so nothing slips through. Your team still closes; the line just stops bleeding leads.",
  objection_messes_up:
    "If the handoff’s messy, that’s on us to fix — the goal is clean qualification and booking, not a black box. We keep the workflow tight and measurable.",
  pressure_level_1: "You get more booked appointments without adding staff.",
  pressure_level_2:
    "If your team is already capturing every single call perfectly, then you don't need this.",
  pressure_level_3:
    "But if even a few calls are missed or delayed, that's lost revenue every day.",
  pressure_level_4: "Sounds like you're covered. No need to change anything.",
  /** Controlled recovery: acknowledge → reset frame → return control to caller. */
  recovery_controlled:
    "I hear you. Would you like me to end the call, or is there something specific I can help with?",
  chaos: "Got it. Go ahead whenever you're ready.",
  /** After “why aren’t you talking” — bridge then LLM continues the real thread. */
  silence_complaint_bridge:
    "Hey — I'm right here with you. Let me pick back up on what we were talking about.",
  /** Continuation tone — assumptive, not a cold handoff. */
  booking:
    "Let's do this — I can show you exactly how this works for your business.\n\nI've got tomorrow at 10 or 2 — which works better?",
  close: "Thanks so much for calling. Have a great day, and feel free to call back anytime.",
} as const;

export type BlueprintDeterministicResult =
  | { kind: "speak"; text: string; markAnswered: boolean; endCall?: boolean }
  | { kind: "speak_then_llm"; prefix: string; markAnswered: boolean }
  | { kind: "none" };

export function computeBookingScore(text: string): number {
  const t = text.toLowerCase();
  let score = 0;
  for (const p of PHRASE_EXPLICIT_BOOKING) {
    if (t.includes(p.toLowerCase())) score += 0.35;
  }
  if (/\b(yes|yeah|yep|sounds good|let'?s do it|schedule|book)\b/i.test(t)) score += 0.2;
  if (t.length > 80) score -= 0.1;
  return Math.min(1, Math.max(0, score));
}

export function canEnterBooking(
  state: ApexControllerState,
  userText: string,
  bookingScoreThreshold: number
): { ok: boolean; reason: string } {
  const explicit =
    contains(userText, PHRASE_EXPLICIT_BOOKING) ||
    /\bbook (a |an )?demo\b/i.test(userText) ||
    /\b(let'?s|let us) (schedule|book)\b/i.test(userText);
  const score = computeBookingScore(userText);
  const currentQuestionResolved = state.answered === true;
  const pressureOk = state.escalationLevel <= 1;
  const recoveryOk = state.mode !== "recovery";

  if (state.skepticismLatch && !explicit) {
    return { ok: false, reason: "skeptical" };
  }
  if (!currentQuestionResolved && !explicit) {
    return { ok: false, reason: "unresolved_question" };
  }
  if (!pressureOk) {
    return { ok: false, reason: "pressure_active" };
  }
  if (!recoveryOk) {
    return { ok: false, reason: "recovery_mode" };
  }

  if (explicit) {
    return { ok: true, reason: "explicit_intent" };
  }
  if (score >= bookingScoreThreshold && currentQuestionResolved) {
    return { ok: true, reason: "score_threshold" };
  }
  return { ok: false, reason: "gate" };
}

/** Split for TTS: sentence-by-sentence, not word-by-word. */
export function splitIntoSentences(text: string): string[] {
  const s = text.replace(/\s+/g, " ").trim();
  if (!s) return [];
  const parts = s.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [s];
  return parts.map((p) => p.trim()).filter(Boolean);
}

export function detectUserAngry(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /\b(fuck|fucked|bullshit|garbage|useless|stupid|worst|terrible|angry|pissed)\b/i.test(t) ||
    (t.includes("you") && (t.includes("wrong") || t.includes("bad") || t.includes("suck")))
  );
}

export function detectChaosFragments(text: string): boolean {
  const t = text.trim();
  if (t.length === 0) return false;
  if (t.length < 6) return true;
  if (/^(uh+|um+|er+|well|so|like)[,.]?\s*$/i.test(t)) return true;
  return false;
}

export function detectDateUserCorrection(text: string): boolean {
  const t = text.toLowerCase();
  return (
    contains(text, ["that's not", "that isn't", "wrong date", "not the right day"]) ||
    (t.includes("today") && (t.includes("actually") || t.includes("not"))) ||
    /\bmeant\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\b/i.test(t)
  );
}

export function dateCorrectionAck(): string {
  return "Got it — thanks for correcting that.";
}

export function objectionExampleBlock(): string {
  return [
    "That makes sense.",
    "",
    "The difference is your team is doing repetitive qualification work.",
    "",
    "Apex handles that automatically so your team focuses only on closing.",
  ].join("\n");
}

/** Mode-specific voice — injected into system prompt. */
export const TONE_PROFILE = {
  explain: "clear_direct — calm, clear, structured",
  objection: "confident_compressed — confident, compressed, no over-agreeing",
  pressure: "sharp_minimal — sharper, contrast-heavy, fewer words",
  recovery: "reset_controlled — short, controlled, reset energy",
  re_engagement: "warm_upbeat_sales — friendly, energetic, professional; keep momentum; never defensive or one-word",
  booking: "smooth_assumptive — smooth, assumptive, forward-moving",
  default: "clear_direct",
} as const;

function toneProfileLine(intent: BlueprintIntent): string {
  if (intent === "pressure") return TONE_PROFILE.pressure;
  if (intent === "re_engagement") return TONE_PROFILE.re_engagement;
  if (intent === "recovery" || intent === "chaos_input") return TONE_PROFILE.recovery;
  if (intent === "booking") return TONE_PROFILE.booking;
  if (
    intent === "objection_staff" ||
    intent === "objection_ai_cant_sell" ||
    intent === "objection_messes_up" ||
    intent === "skepticism"
  )
    return TONE_PROFILE.objection;
  if (intent === "core_explain" || intent === "benefit" || intent === "pricing" || intent === "unknown")
    return TONE_PROFILE.explain;
  return TONE_PROFILE.default;
}

/** Prompt block: intent lock + response shape + tone (injected above LLM). */
export function buildApexBlueprintPromptBlock(state: ApexControllerState, intent: BlueprintIntent): string {
  const lines: string[] = [
    "=== APEX STRICT BLUEPRINT (non-negotiable) ===",
    "USER ALWAYS WINS THE TURN: if they interrupt, abandon prior reply; answer their latest question first.",
    "",
    "VOICE: Sound like a confident operator — not a helpful chatbot. Decisive, direct, no padding.",
    "SALES TEMPO: Keep energy up — friendly, upbeat, forward-moving like a strong sales professional. Never end on a dead acknowledgment alone (no solo “got it”, “okay”, or “I’m talking”). Always add a concrete next beat: value, proof, or one crisp question.",
    `TONE PROFILE (this turn): ${toneProfileLine(intent)}`,
    "",
    "RULE — No softening filler. Avoid: typically, generally, might, could help, tends to, usually.",
    "Instead: assertive, concrete phrasing (e.g. “captures every lead instantly” not “can help improve response time”).",
    "",
    "RULE — Never label the answer on voice. Do NOT say: “Here's the answer”, “Here's the direct/right answer”, “Here's what you need to know”, or similar meta lines — start with the substance immediately.",
    "",
    "FIRST SENTENCE PUNCH: The first sentence must deliver the core value in ≤12 words.",
    "",
    "RESPONSE SHAPE (every non-chaos, non-close turn):",
    "[1] DIRECT ANSWER — one sentence (punch line).",
    "[2] VALUE / REFRAME — one sentence.",
    "[3] AT MOST ONE follow-up question — ONLY if the direct answer is sufficient AND intent allows a question.",
    "",
    "RULE — Never ask more than ONE question in a single turn.",
    "",
    `CONSTRAINTS: max ${MAX_SENTENCES} sentences; target spoken length <= ~${Math.round(TARGET_MAX_SPOKEN_MS / 1000)} seconds; no double questions; avoid generic filler openers (“great question”, etc.).`,
    "",
    `Blueprint intent (this turn): ${intent}`,
  ];

  if (state.answered === false && state.lastUserIntent) {
    lines.push(
      "",
      "INTENT LOCK: You have NOT fully answered the user's last intent yet.",
      `FORCE a direct answer for: ${state.lastUserIntent} — do NOT ask a new question until that is answered.`
    );
  }

  if (state.skepticismLatch || intent === "skepticism") {
    lines.push(
      "",
      "SKEPTICISM: Ask ZERO questions this turn — only direct answers and proof. No discovery, no “would you like”."
    );
  }

  if (intent === "re_engagement") {
    lines.push(
      "",
      "RE-ENGAGEMENT: Caller went quiet or challenged silence. Be warm and upbeat. Tie back to the LAST topic or their business — one concrete point, then optionally ONE short forward question. Never defensive; never a tautology (“I’m talking”).",
      "FORBIDDEN (sounds like a bad line check): still with me, still there, are you there, can you hear me, on the line, checking in, just wanted to make sure you’re there."
    );
  }

  if (intent === "objection_staff" || intent === "objection_ai_cant_sell") {
    lines.push(
      "",
      "OBJECTION: confident, compressed, no over-apologizing. ACKNOWLEDGE → REFRAME → ASSERT.",
      "Example structure (do not read verbatim unless fitting):",
      objectionExampleBlock()
    );
  }

  lines.push("=== END APEX BLUEPRINT ===");
  return lines.join("\n");
}

/**
 * Deterministic short-circuits. Runs before LLM. Booking uses strict gate.
 */
export function routeBlueprintDeterministic(
  state: ApexControllerState,
  transcript: string,
  now: Date,
  opts: {
    bookingScoreThreshold: number;
    /**
     * When the voice stack has a real LLM (Groq/xAI), skip canned one-liners for
     * “what do you do / tell me about” and “how does this help” so `dynamicPrompt`
     * + domain packs control substance and pace instead of COPY_BLOCKS only.
     */
    preferLlmForExplainAndBenefit?: boolean;
  }
): { next: ApexControllerState; route: BlueprintDeterministicResult } {
  let next: ApexControllerState = { ...state };
  const t = transcript.trim();
  if (!t) {
    return { next, route: { kind: "none" } };
  }

  const bucket = classifyDeterministicBucket(t);
  const score = computeBookingScore(t);
  next = { ...next, bookingScore: score };

  if (bucket !== "skepticism") {
    next = { ...next, skepticismLatch: false };
  }

  if (detectUserAngry(t) && bucket !== "recovery") {
    next = { ...next, mode: "recovery" };
    return {
      next,
      route: {
        kind: "speak",
        text: COPY_BLOCKS.recovery_controlled,
        markAnswered: true,
      },
    };
  }

  // If ALREADY in recovery and user is still angry/frustrated → end call gracefully
  if (detectUserAngry(t) && state.mode === "recovery") {
    next = { ...next, mode: "normal" };
    return {
      next,
      route: {
        kind: "speak",
        text: "No problem at all. Thanks for your time, have a great day.",
        markAnswered: true,
        endCall: true,
      },
    };
  }

  if (detectDateUserCorrection(t)) {
    next = { ...next, dateAnchorOverride: now, mode: "normal" };
    return {
      next,
      route: {
        kind: "speak",
        text: dateCorrectionAck(),
        markAnswered: false,
      },
    };
  }

  if (bucket === "chaos_input") {
    return {
      next,
      route: { kind: "speak", text: COPY_BLOCKS.chaos, markAnswered: false },
    };
  }

  if (bucket === "silence_meta") {
    next = {
      ...next,
      mode: "normal",
      answered: false,
      lastQuestion: t,
      lastUserIntent: "re_engagement",
    };
    return {
      next,
      route: {
        kind: "speak_then_llm",
        prefix: COPY_BLOCKS.silence_complaint_bridge,
        markAnswered: false,
      },
    };
  }

  if (detectChaosFragments(t) && bucket === "none") {
    return {
      next,
      route: { kind: "speak", text: COPY_BLOCKS.chaos, markAnswered: false },
    };
  }

  // Recovery / misread — reset then LLM answers (engine speaks prefix, then continues to LLM)
  if (bucket === "recovery") {
    next = { ...next, mode: "recovery", lastQuestion: t, answered: false };
    return {
      next,
      route: {
        kind: "speak_then_llm",
        prefix: COPY_BLOCKS.recovery_controlled,
        markAnswered: false,
      },
    };
  }

  if (bucket === "skepticism") {
    next = {
      ...next,
      mode: "normal",
      lastUserIntent: "skepticism",
      answered: false,
      lastQuestion: t,
      skepticismLatch: true,
    };
    return {
      next,
      route: {
        kind: "speak",
        text: COPY_BLOCKS.objection_ai_cant_sell,
        markAnswered: true,
      },
    };
  }

  if (bucket === "pressure") {
    const level = Math.min(4, next.escalationLevel + 1);
    next = { ...next, escalationLevel: level, lastUserIntent: "pressure", answered: false, lastQuestion: t };
    const line =
      level === 1
        ? COPY_BLOCKS.pressure_level_1
        : level === 2
          ? COPY_BLOCKS.pressure_level_2
          : level === 3
            ? COPY_BLOCKS.pressure_level_3
            : COPY_BLOCKS.pressure_level_4;
    if (level >= 4) {
      return {
        next,
        route: {
          kind: "speak",
          text: line,
          markAnswered: true,
          endCall: true,
        },
      };
    }
    return {
      next,
      route: { kind: "speak", text: line, markAnswered: true },
    };
  }

  if (bucket === "objection_staff") {
    next = { ...next, lastUserIntent: "objection_staff", answered: false, lastQuestion: t };
    return {
      next,
      route: { kind: "speak", text: COPY_BLOCKS.objection_staff, markAnswered: true },
    };
  }

  if (bucket === "core_explain") {
    next = { ...next, lastUserIntent: "core_explain", answered: false, lastQuestion: t };
    if (opts.preferLlmForExplainAndBenefit) {
      return { next, route: { kind: "none" } };
    }
    return {
      next,
      route: { kind: "speak", text: COPY_BLOCKS.core_explain, markAnswered: true },
    };
  }

  if (bucket === "benefit") {
    next = { ...next, lastUserIntent: "benefit", answered: false, lastQuestion: t };
    if (opts.preferLlmForExplainAndBenefit) {
      return { next, route: { kind: "none" } };
    }
    return {
      next,
      route: { kind: "speak", text: COPY_BLOCKS.benefit, markAnswered: true },
    };
  }

  if (bucket === "pricing") {
    next = { ...next, lastUserIntent: "pricing", answered: false, lastQuestion: t };
    return { next, route: { kind: "none" } };
  }

  if (bucket === "booking_signal") {
    const gate = canEnterBooking(next, t, opts.bookingScoreThreshold);
    if (gate.ok) {
      next = { ...next, lastUserIntent: "booking", answered: false, lastQuestion: t };
      return {
        next,
        route: { kind: "speak", text: COPY_BLOCKS.booking, markAnswered: true },
      };
    }
    next = { ...next, lastUserIntent: "booking", answered: false, lastQuestion: t };
    return { next, route: { kind: "none" } };
  }

  const intent = classifyIntent(t);
  next = {
    ...next,
    lastUserIntent: intent,
    answered: false,
    lastQuestion: t,
  };

  if (intent === "booking") {
    const gate = canEnterBooking(state, t, opts.bookingScoreThreshold);
    if (!gate.ok) {
      return { next, route: { kind: "none" } };
    }
    return {
      next,
      route: {
        kind: "speak",
        text: COPY_BLOCKS.booking,
        markAnswered: true,
      },
    };
  }

  return { next, route: { kind: "none" } };
}

/** After assistant text is committed, clear intent lock. */
export function markBlueprintAnswered(state: ApexControllerState, answerSnippet: string): ApexControllerState {
  return {
    ...state,
    answered: true,
    lastAnswer: answerSnippet.slice(0, 500),
    mode: state.mode === "recovery" ? "normal" : state.mode,
  };
}
