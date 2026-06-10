import { describe, expect, it } from "vitest";
import { buildValidRun } from "./schema.fixture";
import { parseKnockoutRun } from "./schema";

// Deep clone so each mutation test starts from a pristine valid bracket.
const clone = () => structuredClone(buildValidRun());

describe("parseKnockoutRun", () => {
  it("accepts a fully consistent synthetic bracket", () => {
    const result = parseKnockoutRun(buildValidRun());
    expect(result.ok).toBe(true);
  });

  it("rejects a champion who did not win the final", () => {
    const run = clone();
    run.champion = "T02"; // final winner is T01
    const result = parseKnockoutRun(run);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join("\n")).toMatch(/champion/i);
  });

  it("rejects a winner that is not one of the two teams", () => {
    const run = clone();
    run.rounds.roundOf32[0].winner = "T31"; // tie is T01 vs T02
    const result = parseKnockoutRun(run);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join("\n")).toMatch(/not one of/i);
  });

  it("rejects penalties without pens scores", () => {
    const run = clone();
    const m = run.rounds.final;
    m.decidedBy = "penalties";
    m.scoreA = 1;
    m.scoreB = 1; // level, but pensA/pensB missing
    const result = parseKnockoutRun(run);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.join("\n")).toMatch(/pensA and pensB|require/i);
  });

  it("rejects a non-level score decided by penalties", () => {
    const run = clone();
    const m = run.rounds.final;
    m.decidedBy = "penalties";
    m.pensA = 4;
    m.pensB = 2; // but score below is 1–0, not level
    const result = parseKnockoutRun(run);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join("\n")).toMatch(/level score/i);
  });

  it("rejects a round-progression violation (R16 team that lost in R32)", () => {
    const run = clone();
    // T02 lost roundOf32[0]; smuggling it into the round of 16 must fail. The pairing
    // topology itself is free-form (set-based check), so only non-winners are rejected.
    run.rounds.roundOf16[0].teamA = "T02";
    run.rounds.roundOf16[0].winner = "T02";
    run.rounds.roundOf16[0].scoreA = 1;
    run.rounds.roundOf16[0].scoreB = 0;
    const result = parseKnockoutRun(run);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.join("\n")).toMatch(/did not win a match/i);
  });

  it("rejects a regulation match that ended level", () => {
    const run = clone();
    const m = run.rounds.roundOf32[0];
    m.scoreA = 1;
    m.scoreB = 1; // level but decidedBy regulation
    const result = parseKnockoutRun(run);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.join("\n")).toMatch(/cannot end level/i);
  });

  it("rejects a third-place match not contested by the semi-final losers", () => {
    const run = clone();
    run.rounds.thirdPlace.teamA = "T05";
    run.rounds.thirdPlace.winner = "T05";
    const result = parseKnockoutRun(run);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join("\n")).toMatch(/third-place/i);
  });

  it("rejects an R32 team that is not among the 32 qualifiers", () => {
    const run = clone();
    // T99 never qualified.
    run.rounds.roundOf32[0].teamB = "T99";
    run.rounds.roundOf32[0].winner = "T01";
    const result = parseKnockoutRun(run);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors.join("\n")).toMatch(/not among the 32 qualifiers/i);
  });
});
