// Scoring for Stage-2 ("ground-truth-conditioned") brackets vs the real knockout. Pure, I/O-free.
//
// Because every model fills in the SAME official R32 draw, Stage 2 supports a metric Stage 1
// could not: per-tie head-to-head accuracy. We report two complementary axes:
//
//   1. Survival  — team correctly placed in each real stage (R32×1 · R16×2 · QF×4 · SF×8 ·
//                  Final×16 · Champion×32 → max 192). Same rule as Stage 1; "how far did you
//                  carry the right teams".
//   2. Tie accuracy — for each REAL knockout tie the model also predicted (same pairing):
//                  exact scoreline = 5, else correct winner = 3, else 0 (the group-stage pool
//                  rule). All 16 R32 ties are shared, so this is a clean head-to-head test.
//
// `total` sums both for a single leaderboard number; the breakdown is exposed for analytics.
import { flagCode } from "../flags";
import { normalizeTeam } from "../teams";
import { pairingKey } from "./context";
import type { RealKnockoutRun, RealKoMatch as PredKoMatch } from "./schema";

/** Minimal view of a real knockout match (subset of the actual-bracket row). */
export interface RealKoMatch {
  stage: string; // R32 | R16 | QF | SF | TP | F
  teamA: string;
  teamB: string;
  status: string;
  scoreA: number | null;
  scoreB: number | null;
  pensA: number | null;
  pensB: number | null;
}

const STAGES = [
  { stage: "R32", label: "R32", points: 1 },
  { stage: "R16", label: "R16", points: 2 },
  { stage: "QF", label: "QF", points: 4 },
  { stage: "SF", label: "SF", points: 8 },
  { stage: "F", label: "Final", points: 16 },
] as const;

export const CHAMPION_POINTS = 32;
export const MAX_SURVIVAL_POINTS = 192;
export const EXACT_SCORE_POINTS = 5;
export const CORRECT_WINNER_POINTS = 3;

/** Real team names only — placeholder codes (W73, 2A…) have no flag. */
function realTeams(matches: RealKoMatch[], stage: string): Set<string> {
  const out = new Set<string>();
  for (const m of matches) {
    if (m.stage !== stage) continue;
    for (const t of [m.teamA, m.teamB]) {
      if (flagCode(t)) out.add(normalizeTeam(t));
    }
  }
  return out;
}

/** Winner of a finished real match (penalties decide a level score), or null. */
function realWinner(m: RealKoMatch): string | null {
  if (
    m.status !== "FINISHED" ||
    m.scoreA === null ||
    m.scoreB === null ||
    !flagCode(m.teamA) ||
    !flagCode(m.teamB)
  ) {
    return null;
  }
  if (m.scoreA !== m.scoreB) return m.scoreA > m.scoreB ? m.teamA : m.teamB;
  if (m.pensA !== null && m.pensB !== null && m.pensA !== m.pensB)
    return m.pensA > m.pensB ? m.teamA : m.teamB;
  return null;
}

export function realChampion(matches: RealKoMatch[]): string | null {
  const final = matches.find((m) => m.stage === "F");
  return final ? realWinner(final) : null;
}

function predictedTeams(run: RealKnockoutRun, stage: string): Set<string> {
  const r = run.rounds;
  const matches =
    stage === "R32"
      ? r.roundOf32
      : stage === "R16"
        ? r.roundOf16
        : stage === "QF"
          ? r.quarterfinals
          : stage === "SF"
            ? r.semifinals
            : [r.final];
  const out = new Set<string>();
  for (const m of matches) {
    out.add(normalizeTeam(m.teamA));
    out.add(normalizeTeam(m.teamB));
  }
  return out;
}

export interface StageScore {
  stage: string;
  label: string;
  correct: number;
  known: number;
  points: number;
}

export interface SurvivalScore {
  perStage: StageScore[];
  championCorrect: boolean | null;
  total: number;
}

export interface TieAccuracy {
  /** Real ties (finished, real teams) the model also has in its bracket. */
  scored: number;
  winnersCorrect: number;
  exactCorrect: number;
  points: number;
}

export interface RealBracketScore {
  survival: SurvivalScore;
  ties: TieAccuracy;
  total: number;
}

/** Index every predicted match by its order-independent pairing key. */
function predictedByPairing(run: RealKnockoutRun): Map<string, PredKoMatch> {
  const r = run.rounds;
  const all: PredKoMatch[] = [
    ...r.roundOf32,
    ...r.roundOf16,
    ...r.quarterfinals,
    ...r.semifinals,
    r.thirdPlace,
    r.final,
  ];
  const out = new Map<string, PredKoMatch>();
  for (const m of all) out.set(pairingKey(m.teamA, m.teamB), m);
  return out;
}

/** Predicted scoreline oriented to the real match's A/B side, or null if teams differ. */
function orientedPredScore(
  pred: PredKoMatch,
  real: RealKoMatch,
): { a: number; b: number } | null {
  if (normalizeTeam(pred.teamA) === normalizeTeam(real.teamA))
    return { a: pred.scoreA, b: pred.scoreB };
  if (normalizeTeam(pred.teamB) === normalizeTeam(real.teamA))
    return { a: pred.scoreB, b: pred.scoreA };
  return null;
}

function scoreSurvival(
  run: RealKnockoutRun,
  real: RealKoMatch[],
): SurvivalScore {
  const perStage: StageScore[] = STAGES.map(({ stage, label, points }) => {
    const actual = realTeams(real, stage);
    const predicted = predictedTeams(run, stage);
    let correct = 0;
    for (const t of actual) if (predicted.has(t)) correct += 1;
    return {
      stage,
      label,
      correct,
      known: actual.size,
      points: correct * points,
    };
  });

  const champ = realChampion(real);
  const championCorrect = champ
    ? normalizeTeam(champ) === normalizeTeam(run.champion)
    : null;

  const total =
    perStage.reduce((sum, s) => sum + s.points, 0) +
    (championCorrect ? CHAMPION_POINTS : 0);
  return { perStage, championCorrect, total };
}

function scoreTies(run: RealKnockoutRun, real: RealKoMatch[]): TieAccuracy {
  const byPairing = predictedByPairing(run);
  let scored = 0;
  let winnersCorrect = 0;
  let exactCorrect = 0;
  let points = 0;

  for (const rm of real) {
    const winner = realWinner(rm);
    if (!winner) continue; // not finished / placeholder
    const pred = byPairing.get(pairingKey(rm.teamA, rm.teamB));
    if (!pred) continue; // model's bracket diverged here — not a shared tie
    scored += 1;

    const oriented = orientedPredScore(pred, rm);
    const exact =
      oriented !== null && oriented.a === rm.scoreA && oriented.b === rm.scoreB;
    const winnerHit = normalizeTeam(pred.winner) === normalizeTeam(winner);

    if (exact) {
      exactCorrect += 1;
      winnersCorrect += 1; // an exact score is also a correct winner
      points += EXACT_SCORE_POINTS;
    } else if (winnerHit) {
      winnersCorrect += 1;
      points += CORRECT_WINNER_POINTS;
    }
  }
  return { scored, winnersCorrect, exactCorrect, points };
}

/** Score one Stage-2 bracket against the real knockout state. */
export function scoreRealBracket(
  run: RealKnockoutRun,
  real: RealKoMatch[],
): RealBracketScore {
  const survival = scoreSurvival(run, real);
  const ties = scoreTies(run, real);
  return { survival, ties, total: survival.total + ties.points };
}
