// Pure sync-matching logic, extracted from sync.ts so it can be unit-tested
// without a database or the network. Two regimes:
//
//   • Group fixtures  — aligned to a stored GROUP row by team pair; scores are
//     re-oriented to the row's teamA/teamB (provider order is arbitrary).
//   • Knockout fixtures — aligned by official match number (extId "wc-ko-<num>").
//     openfootball is canonical: we adopt its team order verbatim, which is how
//     placeholder codes ("2A", "W73") get replaced by real names over time.

import type { FixtureInput } from "./providers/index";
import { normalizeTeam } from "./teams";

/** Minimal shape of a stored row the matcher needs (subset of Prisma's Match). */
export interface SyncRow {
  id: number;
  teamA: string;
  teamB: string;
  kickoff: Date;
  status: string;
  scoreA: number | null;
  scoreB: number | null;
  pensA: number | null;
  pensB: number | null;
}

/** Fields a knockout update may write. Group updates use a subset (teams unchanged). */
export interface SyncUpdate {
  teamA?: string;
  teamB?: string;
  kickoff?: Date;
  status: string;
  scoreA: number | null;
  scoreB: number | null;
  pensA?: number | null;
  pensB?: number | null;
}

/** Re-orient a group fixture's scores onto the stored row, or null if unchanged. */
export function groupUpdate(f: FixtureInput, row: SyncRow): SyncUpdate | null {
  const swap = normalizeTeam(f.teamA) === normalizeTeam(row.teamB);
  const scoreA = swap ? f.scoreB : f.scoreA;
  const scoreB = swap ? f.scoreA : f.scoreB;

  if (
    row.scoreA === scoreA &&
    row.scoreB === scoreB &&
    row.status === f.status
  ) {
    return null;
  }
  return { status: f.status, scoreA, scoreB };
}

const sameTime = (a: Date, b: Date) => a.getTime() === b.getTime();

/**
 * Knockout fixture → update payload, or null if nothing changed. Adopts the
 * provider's team names directly (placeholder code → real name as they fill in)
 * and carries kickoff, status, scores, and penalties.
 */
export function knockoutUpdate(
  f: FixtureInput,
  row: SyncRow,
): SyncUpdate | null {
  const unchanged =
    row.teamA === f.teamA &&
    row.teamB === f.teamB &&
    sameTime(row.kickoff, f.kickoff) &&
    row.status === f.status &&
    row.scoreA === f.scoreA &&
    row.scoreB === f.scoreB &&
    row.pensA === f.pensA &&
    row.pensB === f.pensB;
  if (unchanged) return null;

  return {
    teamA: f.teamA,
    teamB: f.teamB,
    kickoff: f.kickoff,
    status: f.status,
    scoreA: f.scoreA,
    scoreB: f.scoreB,
    pensA: f.pensA,
    pensB: f.pensB,
  };
}
