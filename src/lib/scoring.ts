// Pure scoring logic for the bolão. No I/O — fully unit-testable.

export type Outcome = "A" | "D" | "B";

export interface Pred {
  predA: number;
  predB: number;
  probWinA?: number | null; // 0..100
  probDraw?: number | null;
  probWinB?: number | null;
}

export interface Result {
  scoreA: number;
  scoreB: number;
}

/** Match outcome from the perspective of team A. */
export function outcome(a: number, b: number): Outcome {
  if (a > b) return "A";
  if (a < b) return "B";
  return "D";
}

/**
 * Bolão points for one prediction vs the real result:
 *  - 5: exact score
 *  - 3: correct outcome + exactly one side's goals correct
 *  - 2: correct outcome only
 *  - 0: wrong outcome
 */
export function matchPoints(pred: Pred, actual: Result): number {
  const exact = pred.predA === actual.scoreA && pred.predB === actual.scoreB;
  if (exact) return 5;

  const sameOutcome =
    outcome(pred.predA, pred.predB) === outcome(actual.scoreA, actual.scoreB);
  if (!sameOutcome) return 0;

  const partial =
    (pred.predA === actual.scoreA ? 1 : 0) +
    (pred.predB === actual.scoreB ? 1 : 0);
  return partial === 1 ? 3 : 2;
}

const MAX_POINTS = 5;

/** Best-case points for a played match (used for accuracy % denominator). */
export function maxPointsPerMatch(): number {
  return MAX_POINTS;
}

/**
 * Multiclass Brier score for one match (lower = better calibration), range [0, 2].
 * Returns null when probabilities are missing. Probs are 0..100 and need not sum to 100.
 */
export function brierForMatch(pred: Pred, actual: Result): number | null {
  const { probWinA, probDraw, probWinB } = pred;
  if (probWinA == null || probDraw == null || probWinB == null) return null;

  const total = probWinA + probDraw + probWinB;
  if (total <= 0) return null;

  // Normalize to a proper distribution, then square error against the one-hot outcome.
  const p = { A: probWinA / total, D: probDraw / total, B: probWinB / total };
  const real = outcome(actual.scoreA, actual.scoreB);

  return (["A", "D", "B"] as const).reduce((sum, k) => {
    const indicator = k === real ? 1 : 0;
    return sum + (p[k] - indicator) ** 2;
  }, 0);
}

export interface ScoredPrediction extends Pred {
  result: Result | null; // null = match not finished
}

export interface ModelSummary {
  played: number; // matches with a result AND a prediction
  points: number;
  exact: number;
  outcomeHits: number; // outcome correct (points >= 2)
  accuracyPct: number; // points / (played * 5)
  outcomeAccuracyPct: number; // outcomeHits / played
  avgBrier: number | null; // mean Brier over matches with probabilities
}

/** Aggregate one model's predictions into leaderboard numbers. */
export function summarize(preds: ScoredPrediction[]): ModelSummary {
  let played = 0;
  let points = 0;
  let exact = 0;
  let outcomeHits = 0;
  let brierSum = 0;
  let brierN = 0;

  for (const pr of preds) {
    if (!pr.result) continue;
    played += 1;
    const pts = matchPoints(pr, pr.result);
    points += pts;
    if (pts === 5) exact += 1;
    if (pts >= 2) outcomeHits += 1;

    const b = brierForMatch(pr, pr.result);
    if (b != null) {
      brierSum += b;
      brierN += 1;
    }
  }

  return {
    played,
    points,
    exact,
    outcomeHits,
    accuracyPct: played ? (points / (played * MAX_POINTS)) * 100 : 0,
    outcomeAccuracyPct: played ? (outcomeHits / played) * 100 : 0,
    avgBrier: brierN ? brierSum / brierN : null,
  };
}
