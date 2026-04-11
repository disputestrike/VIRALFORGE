import { describe, expect, it } from "vitest";
import {
  classifyDeterministicBucket,
  classifyIntent,
  routeBlueprintDeterministic,
  createApexControllerState,
  splitIntoSentences,
  canEnterBooking,
  PHRASE_PRESSURE,
} from "./apexStrictBlueprint";

describe("classifyDeterministicBucket", () => {
  it("matches pressure and recovery phrases", () => {
    expect(classifyDeterministicBucket("So what?")).toBe("pressure");
    expect(classifyDeterministicBucket("Why should I care")).toBe("pressure");
    expect(classifyDeterministicBucket("You're not listening")).toBe("recovery");
    expect(classifyDeterministicBucket("That sounds gimmicky")).toBe("skepticism");
    expect(classifyDeterministicBucket("Wait no wrong number")).toBe("chaos_input");
  });

  it("matches silence complaint before generic recovery", () => {
    expect(classifyDeterministicBucket("Why aren't you talking?")).toBe("silence_meta");
    expect(classifyDeterministicBucket("You're not talking")).toBe("silence_meta");
    expect(classifyIntent("Say something!")).toBe("re_engagement");
  });
});

describe("routeBlueprintDeterministic", () => {
  it("tracks pressure but defers the spoken answer to the LLM", () => {
    let s = createApexControllerState();
    for (let i = 0; i < 3; i++) {
      const r = routeBlueprintDeterministic(s, "so what", new Date(), {
        bookingScoreThreshold: 0.65,
      });
      s = r.next;
      expect(r.route.kind).toBe("none");
    }
    const last = routeBlueprintDeterministic(s, "so what", new Date(), {
      bookingScoreThreshold: 0.65,
    });
    expect(last.route.kind).toBe("none");
    expect(last.next.escalationLevel).toBeGreaterThan(0);
  });

  it("lets the LLM handle booking language once intent is detected", () => {
    let s = createApexControllerState();
    s = { ...s, answered: false };
    const r = routeBlueprintDeterministic(s, "I'm interested", new Date(), {
      bookingScoreThreshold: 0.65,
    });
    expect(r.route.kind).toBe("none");
  });

  it("blocks soft booking when skepticism latch", () => {
    let s = createApexControllerState();
    s = { ...s, answered: true, skepticismLatch: true };
    const r = routeBlueprintDeterministic(s, "sounds interesting", new Date(), {
      bookingScoreThreshold: 0.65,
    });
    if (r.route.kind === "speak" && r.route.text.includes("10")) {
      throw new Error("booking should not fire under skepticism latch without explicit intent");
    }
  });

  it("defers core_explain to the LLM", () => {
    const s = createApexControllerState();
    const r = routeBlueprintDeterministic(s, "tell me about ApexAI", new Date(), {
      bookingScoreThreshold: 0.65,
    });
    expect(r.route.kind).toBe("none");
  });

  it("defers benefit questions to the LLM too", () => {
    const s = createApexControllerState();
    const r = routeBlueprintDeterministic(s, "how does this help", new Date(), {
      bookingScoreThreshold: 0.65,
    });
    expect(r.route.kind).toBe("none");
  });
});

describe("canEnterBooking", () => {
  it("allows explicit booking even when answered is false", () => {
    const s = createApexControllerState();
    const r = canEnterBooking({ ...s, answered: false }, "book a demo", 0.65);
    expect(r.ok).toBe(true);
  });
});

describe("splitIntoSentences", () => {
  it("splits on boundaries", () => {
    const s = splitIntoSentences("A. B! C?");
    expect(s.length).toBeGreaterThanOrEqual(2);
  });
});

describe("PHRASE_PRESSURE", () => {
  it("includes so what", () => {
    expect(PHRASE_PRESSURE.some((p) => p.includes("so what"))).toBe(true);
  });
});

describe("classifyIntent", () => {
  it("returns unknown for neutral text", () => {
    expect(classifyIntent("okay")).toBe("unknown");
  });

  it("maps silence_meta to re_engagement", () => {
    expect(classifyIntent("why are you not talking")).toBe("re_engagement");
  });
});
