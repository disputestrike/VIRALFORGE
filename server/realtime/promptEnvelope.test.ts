import { describe, expect, it } from "vitest";
import { inferBlueprintPhase, buildStrictControllerBlock } from "./promptEnvelope";
import type { ClassifiedTurn } from "./strictTypes";
import { emptyStrictFacts } from "./strictTypes";

function classified(intent: ClassifiedTurn["intent"], overrides: Partial<ClassifiedTurn> = {}): ClassifiedTurn {
  return {
    intent,
    confidence: 0.85,
    ...overrides,
  };
}

describe("inferBlueprintPhase", () => {
  it("uses discovery before business context is known", () => {
    expect(
      inferBlueprintPhase({
        mode: "qualify",
        classified: classified("question"),
        facts: emptyStrictFacts(),
      })
    ).toBe("discovery");
  });

  it("uses demo for explicit demo requests", () => {
    expect(
      inferBlueprintPhase({
        mode: "recommend",
        classified: classified("demo_request"),
        facts: { ...emptyStrictFacts(), industry: "solar" },
      })
    ).toBe("demo");
  });

  it("uses support for support requests", () => {
    expect(
      inferBlueprintPhase({
        mode: "answer",
        classified: classified("support_request"),
        facts: emptyStrictFacts(),
      })
    ).toBe("support");
  });

  it("uses value delivery for answer turns instead of discovery", () => {
    expect(
      inferBlueprintPhase({
        mode: "answer",
        classified: classified("question"),
        facts: emptyStrictFacts(),
      })
    ).toBe("value_delivery");
  });
});

describe("buildStrictControllerBlock", () => {
  it("includes blueprint phase guidance for the turn", () => {
    const out = buildStrictControllerBlock({
      facts: emptyStrictFacts(),
      mode: "recommend",
      classified: classified("demo_request"),
      dateAnchor: "SERVER DATE: April 10, 2026",
      repeatIndustryBan: false,
    });
    expect(out).toContain("Blueprint phase: demo");
    expect(out).toContain("Phase goal:");
  });
});
