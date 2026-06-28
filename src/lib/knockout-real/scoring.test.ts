import { describe, expect, it } from "vitest";
import { REAL_CONTEXT } from "./context";
import { buildValidRealRun } from "./schema.fixture";
import {
  CHAMPION_POINTS,
  type RealKoMatch,
  realChampion,
  scoreRealBracket,
} from "./scoring";

const [t0, t1, t2] = REAL_CONTEXT.roundOf32; // real ties; fixture predicts teamA wins 1–0

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

describe("scoreRealBracket", () => {
  it("scores tie accuracy (exact / winner / miss) on the shared R32 draw", () => {
    const run = buildValidRealRun(); // teamA wins 1–0 in every tie
    const realMatches = [
      real("R32", t0.teamA, t0.teamB, {
        status: "FINISHED",
        scoreA: 1,
        scoreB: 0,
      }), // exact → 5
      real("R32", t1.teamA, t1.teamB, {
        status: "FINISHED",
        scoreA: 2,
        scoreB: 1,
      }), // correct winner, not exact → 3
      real("R32", t2.teamA, t2.teamB, {
        status: "FINISHED",
        scoreA: 1,
        scoreB: 2,
      }), // teamB won → miss → 0
    ];
    const score = scoreRealBracket(run, realMatches);

    expect(score.ties.scored).toBe(3);
    expect(score.ties.winnersCorrect).toBe(2);
    expect(score.ties.exactCorrect).toBe(1);
    expect(score.ties.points).toBe(8); // 5 + 3 + 0

    // Survival R32: all six real teams are in the shared bracket → 6 correct × 1.
    const r32 = score.survival.perStage.find((s) => s.stage === "R32");
    expect(r32?.correct).toBe(6);
    expect(r32?.points).toBe(6);
    expect(score.survival.championCorrect).toBeNull();
    expect(score.total).toBe(14); // survival 6 + ties 8
  });

  it("orients the predicted scoreline to the real match's home/away side", () => {
    const run = buildValidRealRun();
    // Real match lists the tie with sides FLIPPED vs the prediction; exact must still match.
    const flipped = real("R32", t0.teamB, t0.teamA, {
      status: "FINISHED",
      scoreA: 0, // t0.teamB
      scoreB: 1, // t0.teamA (predicted 1–0 winner)
    });
    const score = scoreRealBracket(run, [flipped]);
    expect(score.ties.exactCorrect).toBe(1);
    expect(score.ties.points).toBe(5);
  });

  it("awards champion points only when the real final is decided", () => {
    const run = buildValidRealRun();
    const champ = run.champion;
    const other = run.rounds.final.teamB;
    const decided = real("F", champ, other, {
      status: "FINISHED",
      scoreA: 1,
      scoreB: 0,
    });
    const score = scoreRealBracket(run, [decided]);
    expect(score.survival.championCorrect).toBe(true);
    expect(realChampion([decided])).toBe(champ);

    const pending = real("F", champ, other);
    expect(
      scoreRealBracket(run, [pending]).survival.championCorrect,
    ).toBeNull();
    expect(CHAMPION_POINTS).toBe(32);
  });
});
