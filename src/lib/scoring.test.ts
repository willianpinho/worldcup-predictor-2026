import { describe, expect, it } from "vitest";
import {
  brierForMatch,
  matchPoints,
  outcome,
  summarize,
  type ScoredPrediction,
} from "./scoring";

describe("outcome", () => {
  it("classifies win/draw/loss from team A perspective", () => {
    expect(outcome(2, 1)).toBe("A");
    expect(outcome(1, 1)).toBe("D");
    expect(outcome(0, 3)).toBe("B");
  });
});

describe("matchPoints", () => {
  it("awards 5 for exact score", () => {
    expect(matchPoints({ predA: 2, predB: 1 }, { scoreA: 2, scoreB: 1 })).toBe(5);
    expect(matchPoints({ predA: 0, predB: 0 }, { scoreA: 0, scoreB: 0 })).toBe(5);
  });

  it("awards 3 for correct outcome + one exact side", () => {
    // outcome A win correct; team A goals (2) correct, B wrong
    expect(matchPoints({ predA: 2, predB: 0 }, { scoreA: 2, scoreB: 1 })).toBe(3);
    // draw outcome correct, one side equal in goal count handled below
    expect(matchPoints({ predA: 1, predB: 3 }, { scoreA: 0, scoreB: 3 })).toBe(3);
  });

  it("awards 2 for correct outcome only", () => {
    expect(matchPoints({ predA: 3, predB: 0 }, { scoreA: 2, scoreB: 1 })).toBe(2);
    // both draws but different scoreline, no side matches
    expect(matchPoints({ predA: 1, predB: 1 }, { scoreA: 2, scoreB: 2 })).toBe(2);
  });

  it("awards 0 for wrong outcome", () => {
    expect(matchPoints({ predA: 2, predB: 1 }, { scoreA: 0, scoreB: 1 })).toBe(0);
    expect(matchPoints({ predA: 1, predB: 1 }, { scoreA: 2, scoreB: 1 })).toBe(0);
  });

  it("does not give the partial bonus when outcome is wrong even if one side matches", () => {
    // predicted A win 2x0, real B win 2x3: scoreA matches (2) but outcome wrong -> 0
    expect(matchPoints({ predA: 2, predB: 0 }, { scoreA: 2, scoreB: 3 })).toBe(0);
  });
});

describe("brierForMatch", () => {
  it("returns null when probabilities are missing", () => {
    expect(brierForMatch({ predA: 1, predB: 0 }, { scoreA: 1, scoreB: 0 })).toBeNull();
  });

  it("is 0 for a perfectly confident correct prediction", () => {
    const b = brierForMatch(
      { predA: 2, predB: 0, probWinA: 100, probDraw: 0, probWinB: 0 },
      { scoreA: 2, scoreB: 0 },
    );
    expect(b).toBeCloseTo(0, 6);
  });

  it("is 2 for a perfectly confident wrong prediction", () => {
    const b = brierForMatch(
      { predA: 2, predB: 0, probWinA: 100, probDraw: 0, probWinB: 0 },
      { scoreA: 0, scoreB: 2 },
    );
    expect(b).toBeCloseTo(2, 6);
  });

  it("normalizes probabilities that do not sum to 100", () => {
    const b = brierForMatch(
      { predA: 1, predB: 1, probWinA: 25, probDraw: 25, probWinB: 25 },
      { scoreA: 1, scoreB: 1 },
    );
    // even distribution 1/3 each, draw real -> (1/3)^2*2 + (2/3)^2 = 0.6667
    expect(b).toBeCloseTo(2 / 3, 4);
  });
});

describe("summarize", () => {
  it("aggregates points, accuracy, and Brier; ignores unfinished matches", () => {
    const preds: ScoredPrediction[] = [
      { predA: 2, predB: 1, result: { scoreA: 2, scoreB: 1 } }, // exact -> 5
      { predA: 1, predB: 0, result: { scoreA: 3, scoreB: 0 } }, // A win + B side exact -> 3
      { predA: 0, predB: 0, result: null }, // not played -> ignored
      {
        predA: 1,
        predB: 1,
        probWinA: 20,
        probDraw: 60,
        probWinB: 20,
        result: { scoreA: 0, scoreB: 0 },
      }, // draw correct, no side exact -> 2, has Brier
    ];
    const s = summarize(preds);
    expect(s.played).toBe(3);
    expect(s.points).toBe(5 + 2 + 3);
    expect(s.exact).toBe(1);
    expect(s.outcomeHits).toBe(3);
    expect(s.accuracyPct).toBeCloseTo((10 / 15) * 100, 4);
    expect(s.outcomeAccuracyPct).toBeCloseTo(100, 4);
    expect(s.avgBrier).not.toBeNull();
  });

  it("returns zeros for an empty / all-unplayed set", () => {
    const s = summarize([{ predA: 1, predB: 0, result: null }]);
    expect(s.played).toBe(0);
    expect(s.points).toBe(0);
    expect(s.accuracyPct).toBe(0);
    expect(s.avgBrier).toBeNull();
  });
});
