// Bridges MatchView[] (from queries) into the pure standings lib. Pure functions,
// no I/O — the page fetches matches, these turn them into per-view group tables.

import type { MatchView, ModelId } from "./queries";
import {
  computeGroup,
  type GroupStanding,
  type PlayedResult,
  rankThirdPlaced,
  type RankedThird,
} from "./standings";

export type StandingsView = "actual" | ModelId;

/** Unique team names per group, in stable (alphabetical) order. */
function groupTeams(matches: MatchView[]): Map<string, string[]> {
  const byGroup = new Map<string, Set<string>>();
  for (const m of matches) {
    const set = byGroup.get(m.groupName) ?? new Set<string>();
    set.add(m.teamA);
    set.add(m.teamB);
    byGroup.set(m.groupName, set);
  }
  const out = new Map<string, string[]>();
  for (const [g, set] of byGroup) out.set(g, [...set].sort());
  return out;
}

/**
 * Results that count for a given view:
 *  - "actual": FINISHED matches with both real scores recorded.
 *  - a model:  that model's predicted scoreline for every match it predicted.
 */
function resultsFor(matches: MatchView[], view: StandingsView): PlayedResult[] {
  const out: PlayedResult[] = [];
  for (const m of matches) {
    if (view === "actual") {
      if (m.status === "FINISHED" && m.scoreA !== null && m.scoreB !== null) {
        out.push({
          teamA: m.teamA,
          teamB: m.teamB,
          scoreA: m.scoreA,
          scoreB: m.scoreB,
        });
      }
      continue;
    }
    const pred = m.predictions[view];
    if (pred) {
      out.push({
        teamA: m.teamA,
        teamB: m.teamB,
        scoreA: pred.predA,
        scoreB: pred.predB,
      });
    }
  }
  return out;
}

export interface StandingsData {
  groups: GroupStanding[]; // sorted by group letter
  thirds: RankedThird[];
  totalResults: number; // played (actual) or predicted (model) matches feeding the tables
}

/** Build the full set of group tables + third-place ranking for one view. */
export function buildStandings(
  matches: MatchView[],
  view: StandingsView,
): StandingsData {
  const teamsByGroup = groupTeams(matches);
  const results = resultsFor(matches, view);

  const groups: GroupStanding[] = [...teamsByGroup.keys()]
    .sort()
    .map((group) => ({
      group,
      rows: computeGroup(teamsByGroup.get(group) ?? [], results),
    }));

  return {
    groups,
    thirds: rankThirdPlaced(groups),
    totalResults: results.length,
  };
}
