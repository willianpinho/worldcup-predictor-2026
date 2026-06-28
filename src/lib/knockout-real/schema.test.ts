import { describe, expect, it } from "vitest";
import { REAL_CONTEXT } from "./context";
import { buildValidRealRun } from "./schema.fixture";
import { parseRealKnockoutRun } from "./schema";

// Deep clone so each mutation test starts from a pristine valid bracket.
const clone = () => structuredClone(buildValidRealRun());

describe("parseRealKnockoutRun", () => {
  it("accepts a consistent bracket built on the real R32 draw", () => {
    const result = parseRealKnockoutRun(buildValidRealRun());
    expect(result.ok).toBe(true);
  });

  it("rejects a champion who did not win the final", () => {
    const run = clone();
    run.champion = run.rounds.final.teamB; // final winner is teamA
    const result = parseRealKnockoutRun(run);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join("\n")).toMatch(/champion/i);
  });

  it("rejects a winner that is not one of the two teams", () => {
    const run = clone();
    run.rounds.roundOf32[0].winner = REAL_CONTEXT.roundOf32[5].teamA;
    const result = parseRealKnockoutRun(run);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join("\n")).toMatch(/not one of/i);
  });

  it("rejects penalties without pens scores", () => {
    const run = clone();
    const m = run.rounds.final;
    m.decidedBy = "penalties";
    m.scoreA = 1;
    m.scoreB = 1; // level, but pensA/pensB missing
    const result = parseRealKnockoutRun(run);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.join("\n")).toMatch(/pensA and pensB|require/i);
  });

  it("rejects an R32 tie that is not the official draw", () => {
    const run = clone();
    // Replace teamB with a different real qualifier — still a qualifier, but the
    // PAIRING is not a real R32 tie, so the official-draw pin must reject it.
    run.rounds.roundOf32[0].teamB = REAL_CONTEXT.roundOf32[2].teamB;
    run.rounds.roundOf32[0].winner = run.rounds.roundOf32[0].teamA;
    const result = parseRealKnockoutRun(run);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.join("\n")).toMatch(
        /real R32 tie|missing the real tie/i,
      );
  });

  it("rejects a team that is not one of the 32 real qualifiers", () => {
    const run = clone();
    run.rounds.roundOf32[0].teamB = "Atlantis";
    run.rounds.roundOf32[0].winner = run.rounds.roundOf32[0].teamA;
    const result = parseRealKnockoutRun(run);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.join("\n")).toMatch(
        /not one of the 32 real qualifiers/i,
      );
  });

  it("rejects a round-progression violation (R16 team that lost in R32)", () => {
    const run = clone();
    // teamB of R32-1 lost; smuggling it into the round of 16 must fail.
    const loser = run.rounds.roundOf32[0].teamB;
    run.rounds.roundOf16[0].teamA = loser;
    run.rounds.roundOf16[0].winner = loser;
    const result = parseRealKnockoutRun(run);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.join("\n")).toMatch(/did not win a match/i);
  });

  it("rejects a third-place match not contested by the semi-final losers", () => {
    const run = clone();
    run.rounds.thirdPlace.teamA = run.rounds.final.teamA; // a finalist, not an SF loser
    run.rounds.thirdPlace.winner = run.rounds.thirdPlace.teamA;
    const result = parseRealKnockoutRun(run);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join("\n")).toMatch(/third-place/i);
  });
});
