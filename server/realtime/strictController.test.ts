import { describe, expect, it } from "vitest";
import { buildDateAnswer, isDateRelatedQuestion } from "./dateAuthority";
import { classifyTurn } from "./classifyTurn";
import { repeatIndustryViolation } from "./repeatGuard";
import { mergeStrictFactsFromTranscript } from "./strictFacts";
import { emptyStrictFacts } from "./strictTypes";
import { createCallState } from "./callPolicy";
import { canStrictBook } from "./bookingGuard";
import {
  mergeStrictTurnState,
  planStrictLlmTurn,
  routeStrictBeforeLlm,
  strictFactsToSessionSnapshot,
} from "./strictController";

describe("dateAuthority", () => {
  it("detects date questions", () => {
    expect(isDateRelatedQuestion("What's today's date?")).toBe(true);
    expect(isDateRelatedQuestion("What year is it?")).toBe(true);
  });

  it("answers from clock without guessing year", () => {
    const fixed = new Date("2026-04-01T15:00:00Z");
    const a = buildDateAnswer(fixed, "what's today", "UTC");
    expect(a).toContain("2026");
  });
});

describe("classifyTurn", () => {
  it("classifies solar industry statement", () => {
    const c = classifyTurn("Solar.");
    expect(c.intent).not.toBe("end_call");
  });
});

describe("repeatIndustryViolation", () => {
  it("flags re-ask when industry known", () => {
    const facts = mergeStrictFactsFromTranscript("I'm in solar", emptyStrictFacts());
    expect(repeatIndustryViolation(facts, "What industry are you in?")).toBe(true);
  });
});

describe("strictController", () => {
  it("mergeStrictTurnState sets interest from industry", () => {
    const p = createCallState();
    const { strictFacts, policyState } = mergeStrictTurnState(
      "we do solar",
      emptyStrictFacts(),
      p
    );
    expect(strictFacts.industry).toBeTruthy();
    expect(policyState.interestConfirmed).toBe(true);
  });

  it("routeStrictBeforeLlm returns date_authority for date questions", () => {
    const c = classifyTurn("What's today's date?");
    const r = routeStrictBeforeLlm("What's today's date?", new Date("2026-06-15T12:00:00Z"), c);
    expect(r?.kind).toBe("date_authority");
    expect(r?.speakText).toContain("2026");
  });

  it("routeStrictBeforeLlm meta_voice uses custom agent name", () => {
    const t = "You sound like a robot";
    const c = classifyTurn(t);
    const r = routeStrictBeforeLlm(t, new Date(), c, "Nora");
    expect(r?.kind).toBe("meta_voice");
    expect(r?.speakText).toContain("Nora");
    expect(r?.speakText).not.toContain("Alex");
  });

  it("strictFactsToSessionSnapshot clones arrays", () => {
    const f = mergeStrictFactsFromTranscript("missed calls", emptyStrictFacts());
    const s = strictFactsToSessionSnapshot(f);
    s.painLabels.push("x");
    expect(f.painLabels.includes("x")).toBe(false);
  });

  it("planStrictLlmTurn returns strictBlock and policy mode", () => {
    let p = createCallState();
    p = { ...p, questionAnswered: true, interestConfirmed: true, bookingAllowed: true };
    const facts = mergeStrictFactsFromTranscript("solar install", emptyStrictFacts());
    const facts2 = mergeStrictFactsFromTranscript("we need more leads", facts);
    const classified = classifyTurn("book a demo");
    const plan = planStrictLlmTurn({
      policyState: p,
      strictFacts: facts2,
      transcript: "book a demo",
      lastAssistantQuestion: null,
      now: new Date(),
      classified,
    });
    expect(plan.strictBlock).toContain("STRICT CONTROLLER");
    expect(plan.trace.mode).toBe("book");
  });
});

describe("canStrictBook", () => {
  it("requires industry, policy gate, and pain or explicit booking ask", () => {
    let p = createCallState();
    p = { ...p, questionAnswered: true, interestConfirmed: true, bookingAllowed: true };
    const facts = mergeStrictFactsFromTranscript("solar", emptyStrictFacts());
    const cNeutral = classifyTurn("okay");
    expect(canStrictBook(p, facts, cNeutral)).toBe(false);
    const cBook = classifyTurn("book a demo");
    expect(canStrictBook(p, facts, cBook)).toBe(true);
    const factsPain = mergeStrictFactsFromTranscript("we miss calls", facts);
    expect(canStrictBook(p, factsPain, cNeutral)).toBe(true);
  });
});
