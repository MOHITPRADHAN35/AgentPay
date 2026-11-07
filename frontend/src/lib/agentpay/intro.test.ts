import { describe, expect, it } from "vitest";
import { shouldShowIntro } from "./intro";

describe("introduction access", () => {
  it("introduces a first visit", () => expect(shouldShowIntro(null, false)).toBe(true));
  it("does not replay after entering the app", () => expect(shouldShowIntro("yes", false)).toBe(false));
  it("allows direct dashboard access on a first visit", () => expect(shouldShowIntro(null, true)).toBe(false));
});