import { describe, expect, it } from "vitest";
import {
  floorAfterAgentSpeaks,
  floorAfterAgentStops,
  floorAfterUserBargeIn,
} from "./turnManager";

describe("turnManager floor helpers", () => {
  it("returns consistent floor owners", () => {
    expect(floorAfterUserBargeIn()).toBe("user");
    expect(floorAfterAgentSpeaks()).toBe("agent");
    expect(floorAfterAgentStops()).toBe("none");
  });
});
