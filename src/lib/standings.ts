// Pure group-standings logic. No I/O — fully unit-testable.
//
// FIFA 2026 group stage: 12 groups (A–L) of 4 teams, single round-robin.
// Top 2 of each group + the 8 best third-placed teams advance (32 → knockouts).
//
// Tiebreaker simplification (documented per the FIFA regulations we model):
//   1. points  2. goal difference  3. goals for
//   4. head-to-head points among the exact set of still-tied teams (mini-table)
//   5. alphabetical (stand-in for the real fair-play points and drawing of lots,
//      which we cannot reproduce from scorelines alone).
// We intentionally omit fair-play conduct points and the drawing of lots; those
// need data the model never sees, so alphabetical order keeps results stable.

export interface PlayedResult {
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
}

export interface StandingRow {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

const WIN_POINTS = 3;
const DRAW_POINTS = 1;

function blankRow(team: string): StandingRow {
  return {
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
  };
}

/** Apply one team's side of a result to its row (mutates in place). */
function applySide(row: StandingRow, scored: number, conceded: number): void {
  row.played += 1;
  row.goalsFor += scored;
  row.goalsAgainst += conceded;
  if (scored > conceded) {
    row.won += 1;
    row.points += WIN_POINTS;
  } else if (scored < conceded) {
    row.lost += 1;
  } else {
    row.drawn += 1;
    row.points += DRAW_POINTS;
  }
  row.goalDiff = row.goalsFor - row.goalsAgainst;
}

/**
 * Build raw (unsorted) rows for a group from its 4 team names and the results
 * played so far. Results referencing teams outside `teams` are ignored, so a
 * partially-played group simply shows zeros for the rest.
 */
function buildRows(
  teams: string[],
  results: PlayedResult[],
): Map<string, StandingRow> {
  const rows = new Map<string, StandingRow>();
  for (const t of teams) rows.set(t, blankRow(t));

  for (const r of results) {
    const a = rows.get(r.teamA);
    const b = rows.get(r.teamB);
    if (!a || !b) continue; // result not part of this group
    applySide(a, r.scoreA, r.scoreB);
    applySide(b, r.scoreB, r.scoreA);
  }
  return rows;
}

/** Head-to-head points for a single team across the matches among `tiedSet`. */
function headToHeadPoints(
  team: string,
  tiedSet: Set<string>,
  results: PlayedResult[],
): number {
  let pts = 0;
  for (const r of results) {
    if (!tiedSet.has(r.teamA) || !tiedSet.has(r.teamB)) continue;
    const isA = r.teamA === team;
    const isB = r.teamB === team;
    if (!isA && !isB) continue;
    const mine = isA ? r.scoreA : r.scoreB;
    const theirs = isA ? r.scoreB : r.scoreA;
    if (mine > theirs) pts += WIN_POINTS;
    else if (mine === theirs) pts += DRAW_POINTS;
  }
  return pts;
}

/**
 * Comparator over the group-wide metrics: points → GD → GF. Returns 0 when those
 * are equal (caller then applies the head-to-head + alphabetical tiebreaks).
 */
function compareOverall(a: StandingRow, b: StandingRow): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
  return 0;
}

/**
 * Sort the rows of one group by the documented tiebreakers. Head-to-head is
 * recomputed as a mini-table over the exact set of teams that remain tied after
 * points/GD/GF, matching the FIFA rule that H2H only considers the tied teams.
 */
function sortGroup(
  rows: StandingRow[],
  results: PlayedResult[],
): StandingRow[] {
  const sorted = [...rows].sort(compareOverall);

  // Resolve each run of rows that are still equal on points/GD/GF.
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && compareOverall(sorted[i], sorted[j]) === 0)
      j += 1;

    if (j - i > 1) {
      const tied = sorted.slice(i, j);
      const tiedSet = new Set(tied.map((r) => r.team));
      const h2h = new Map(
        tied.map((r) => [r.team, headToHeadPoints(r.team, tiedSet, results)]),
      );
      tied.sort((a, b) => {
        const diff = (h2h.get(b.team) ?? 0) - (h2h.get(a.team) ?? 0);
        if (diff !== 0) return diff;
        return a.team.localeCompare(b.team); // final, deterministic fallback
      });
      sorted.splice(i, tied.length, ...tied);
    }
    i = j;
  }
  return sorted;
}

/** Final, ranked standings table for one group. */
export function computeGroup(
  teams: string[],
  results: PlayedResult[],
): StandingRow[] {
  const rows = [...buildRows(teams, results).values()];
  return sortGroup(rows, results);
}

export interface GroupStanding {
  group: string; // 'A'..'L'
  rows: StandingRow[]; // sorted, position = index + 1
}

export interface ThirdPlaceRow extends StandingRow {
  group: string;
}

export interface RankedThird extends ThirdPlaceRow {
  qualifies: boolean;
}

const BEST_THIRDS_ADVANCING = 8;

/**
 * Rank the third-placed teams (one per group) by points → GD → GF → alphabetical.
 * `qualifies` is true for the top 8, who advance under the 2026 format.
 */
export function rankThirdPlaced(groups: GroupStanding[]): RankedThird[] {
  const thirds: ThirdPlaceRow[] = [];
  for (const g of groups) {
    const third = g.rows[2];
    if (third) thirds.push({ ...third, group: g.group });
  }

  thirds.sort((a, b) => {
    const overall = compareOverall(a, b);
    if (overall !== 0) return overall;
    return a.team.localeCompare(b.team);
  });

  return thirds.map((row, idx) => ({
    ...row,
    qualifies: idx < BEST_THIRDS_ADVANCING,
  }));
}
