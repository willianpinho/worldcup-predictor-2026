// Survivor scoring for predicted brackets vs the real knockout, pure and I/O-free.
// A predicted bracket earns points for every team it correctly placed in each real
// stage (classic bracket-pool rule — pairings don't matter, presence does):
//   R32 ×1 · R16 ×2 · QF ×4 · SF ×8 · Final ×16 · Champion 32  →  max 192.
// Real stages fill in over the tournament; unfilled slots simply score nothing yet.
import { flagCode } from "../flags";
import { normalizeTeam } from "../teams";
import type { KnockoutRun } from "./schema";

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
/** 32·1 + 16·2 + 8·4 + 4·8 + 2·16 + 32 */
export const MAX_BRACKET_POINTS = 192;

/** Real team names only — openfootball placeholder codes (2A, W73…) have no flag. */
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

/** Winner of the real final once FINISHED (penalties decide a level score). */
export function realChampion(matches: RealKoMatch[]): string | null {
  const final = matches.find((m) => m.stage === "F");
  if (
    !final ||
    final.status !== "FINISHED" ||
    final.scoreA === null ||
    final.scoreB === null ||
    !flagCode(final.teamA) ||
    !flagCode(final.teamB)
  ) {
    return null;
  }
  if (final.scoreA !== final.scoreB) {
    return final.scoreA > final.scoreB ? final.teamA : final.teamB;
  }
  if (
    final.pensA !== null &&
    final.pensB !== null &&
    final.pensA !== final.pensB
  ) {
    return final.pensA > final.pensB ? final.teamA : final.teamB;
  }
  return null;
}

function predictedTeams(run: KnockoutRun, stage: string): Set<string> {
  const rounds = run.rounds;
  const matches =
    stage === "R32"
      ? rounds.roundOf32
      : stage === "R16"
        ? rounds.roundOf16
        : stage === "QF"
          ? rounds.quarterfinals
          : stage === "SF"
            ? rounds.semifinals
            : [rounds.final];
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
  /** Correctly predicted teams present in the real stage. */
  correct: number;
  /** Real (non-placeholder) teams known for the stage so far. */
  known: number;
  points: number;
}

export interface BracketScore {
  perStage: StageScore[];
  championCorrect: boolean | null; // null = real champion not decided yet
  total: number;
}

/** Score one predicted bracket against the real knockout state. */
export function scoreBracket(
  run: KnockoutRun,
  real: RealKoMatch[],
): BracketScore {
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
