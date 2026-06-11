import { describe, expect, it } from "vitest";
import type { KnockoutRun } from "./schema";
import {
  CHAMPION_POINTS,
  type RealKoMatch,
  realChampion,
  scoreBracket,
} from "./scoring";

// scoreBracket only reads rounds + champion; a cast keeps the fixture tiny.
function predicted(partial: {
  r32?: Array<[string, string]>;
  r16?: Array<[string, string]>;
  final?: [string, string];
  champion?: string;
}): KnockoutRun {
  const toMatches = (pairs: Array<[string, string]>) =>
    pairs.map(([teamA, teamB]) => ({ teamA, teamB }));
  return {
    rounds: {
      roundOf32: toMatches(partial.r32 ?? []),
      roundOf16: toMatches(partial.r16 ?? []),
      quarterfinals: [],
      semifinals: [],
      thirdPlace: { teamA: "x", teamB: "y" },
      final: partial.final
        ? { teamA: partial.final[0], teamB: partial.final[1] }
        : { teamA: "x", teamB: "y" },
    },
    champion: partial.champion ?? "x",
  } as unknown as KnockoutRun;
}

function real(
  stage: string,
  teamA: string,
  teamB: string,
  extra?: Partial<RealKoMatch>,
): RealKoMatch {
  return {
    stage,
    teamA,
    teamB,
    status: "SCHEDULED",
    scoreA: null,
    scoreB: null,
    pensA: null,
    pensB: null,
    ...extra,
  };
}

describe("scoreBracket", () => {
  it("scores correctly predicted teams per stage and ignores placeholders", () => {
    const run = predicted({
      r32: [
        ["Spain", "Iran"],
        ["Brazil", "South Korea"],
      ],
      r16: [["Spain", "Colombia"]],
    });
    const realMatches = [
      real("R32", "Spain", "Morocco"), // Spain predicted in R32 -> +1
      real("R32", "Brazil", "2A"), // Brazil +1, placeholder 2A ignored
      real("R16", "Spain", "W74"), // Spain in R16 -> +2
    ];
    const score = scoreBracket(run, realMatches);
    const byStage = Object.fromEntries(score.perStage.map((s) => [s.stage, s]));
    expect(byStage.R32.correct).toBe(2);
    expect(byStage.R32.known).toBe(3); // Spain, Morocco, Brazil — not "2A"
    expect(byStage.R32.points).toBe(2);
    expect(byStage.R16.points).toBe(2); // 1 correct × 2
    expect(score.championCorrect).toBeNull();
    expect(score.total).toBe(4);
  });

  it("awards champion points only when the real final is decided", () => {
    const run = predicted({
      final: ["Spain", "Brazil"],
      champion: "Spain",
    });
    const finished = real("F", "Spain", "Brazil", {
      status: "FINISHED",
      scoreA: 2,
      scoreB: 1,
    });
    const score = scoreBracket(run, [finished]);
    // Both finalists correct (2 × 16) + champion (32).
    expect(score.total).toBe(2 * 16 + CHAMPION_POINTS);
    expect(score.championCorrect).toBe(true);

    const pending = real("F", "Spain", "Brazil");
    expect(scoreBracket(run, [pending]).championCorrect).toBeNull();
  });

  it("resolves a level final by penalties", () => {
    const m = real("F", "Argentina", "France", {
      status: "FINISHED",
      scoreA: 1,
      scoreB: 1,
      pensA: 3,
      pensB: 4,
    });
    expect(realChampion([m])).toBe("France");
  });

  it("does not name a champion from a placeholder final", () => {
    const m = real("F", "W101", "W102", {
      status: "FINISHED",
      scoreA: 2,
      scoreB: 0,
    });
    expect(realChampion([m])).toBeNull();
  });
});
