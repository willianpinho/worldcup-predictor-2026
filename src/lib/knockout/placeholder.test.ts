import { describe, expect, it } from "vitest";
import { isPlaceholder, prettyPlaceholder } from "./placeholder";

describe("prettyPlaceholder", () => {
  it("labels group winners and runners-up", () => {
    expect(prettyPlaceholder("1A")).toBe("Group A winner");
    expect(prettyPlaceholder("2B")).toBe("Group B runner-up");
    expect(prettyPlaceholder("1L")).toBe("Group L winner");
  });

  it("labels best-third placeholders (slash-separated group set)", () => {
    expect(prettyPlaceholder("3A/B/C/D/F")).toBe("Best 3rd (A/B/C/D/F)");
    expect(prettyPlaceholder("3E/H/I/J/K")).toBe("Best 3rd (E/H/I/J/K)");
  });

  it("labels winner/loser of a match number", () => {
    expect(prettyPlaceholder("W73")).toBe("Winner of match 73");
    expect(prettyPlaceholder("L101")).toBe("Loser of match 101");
    expect(prettyPlaceholder("W100")).toBe("Winner of match 100");
  });

  it("returns real team names unchanged", () => {
    expect(prettyPlaceholder("Brazil")).toBe("Brazil");
    expect(prettyPlaceholder("South Africa")).toBe("South Africa");
    // Names that superficially resemble codes but aren't (extra chars) pass through.
    expect(prettyPlaceholder("1Aston")).toBe("1Aston");
  });
});

describe("isPlaceholder", () => {
  it("is true for codes, false for real teams", () => {
    expect(isPlaceholder("1A")).toBe(true);
    expect(isPlaceholder("2C")).toBe(true);
    expect(isPlaceholder("3A/B/C/D/F")).toBe(true);
    expect(isPlaceholder("W84")).toBe(true);
    expect(isPlaceholder("L102")).toBe(true);

    expect(isPlaceholder("Brazil")).toBe(false);
    expect(isPlaceholder("USA")).toBe(false);
    expect(isPlaceholder("England")).toBe(false);
  });
});
