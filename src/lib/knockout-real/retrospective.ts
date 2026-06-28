// Group-stage retrospective: how each Stage-1 (group-stage) model run actually held up
// against the REAL finished group stage (REAL_CONTEXT, from FIFA). Pure, I/O-free.
//
// For every recorded group run we recompute the model's predicted final tables from its own
// 72 scorelines (same tiebreakers as the real ones, via src/lib/standings), derive its
// implied 32 qualifiers, and compare to reality:
//   - groupWinnersCorrect / 12  — did it call each group's winner?
//   - qualifiersCorrect   / 32  — how many real qualifiers it had advancing (top-2 + best-8 thirds)
// This is the "analysis of what actually happened in the groups" that also motivates Stage 2.
import type { Condition } from "../conditions";
import type { ImportPayload } from "../importPredictions";
import {
  computeGroup,
  type GroupStanding,
  rankThirdPlaced,
} from "../standings";
import { groupLetter, normalizeTeam } from "../teams";
import { REAL_CONTEXT } from "./context";

export interface GroupRun {
  model: ImportPayload["model"];
  condition: Condition;
  engine: string;
  generatedAt: string;
  predictions: ImportPayload["predictions"];
}

export interface RetrospectiveRow {
  model: ImportPayload["model"];
  condition: Condition;
  engine: string;
  groupWinnersCorrect: number; // / 12
  groupsKnown: number; // 12 once the real stage is final
  qualifiersCorrect: number; // / 32
}

/** Predicted final tables for a run, grouped by the prediction's own `group` label. */
function predictedStandings(run: GroupRun): GroupStanding[] {
  const byGroup = new Map<
    string,
    {
      teams: Set<string>;
      results: Array<{
        teamA: string;
        teamB: string;
        scoreA: number;
        scoreB: number;
      }>;
    }
  >();
  for (const p of run.predictions) {
    if (!p.group) continue;
    const g = groupLetter(p.group);
    const entry = byGroup.get(g) ?? { teams: new Set<string>(), results: [] };
    entry.teams.add(p.teamA);
    entry.teams.add(p.teamB);
    entry.results.push({
      teamA: p.teamA,
      teamB: p.teamB,
      scoreA: p.scoreA,
      scoreB: p.scoreB,
    });
    byGroup.set(g, entry);
  }

  const out: GroupStanding[] = [];
  for (const [group, entry] of [...byGroup.entries()].sort()) {
    if (entry.teams.size !== 4 || entry.results.length !== 6) continue; // incomplete group
    out.push({ group, rows: computeGroup([...entry.teams], entry.results) });
  }
  return out;
}

/** The model's implied 32 qualifiers (12 winners + 12 runners-up + 8 best thirds), normalized. */
function predictedQualifiers(groups: GroupStanding[]): Set<string> {
  const out = new Set<string>();
  for (const g of groups) {
    if (g.rows[0]) out.add(normalizeTeam(g.rows[0].team));
    if (g.rows[1]) out.add(normalizeTeam(g.rows[1].team));
  }
  for (const t of rankThirdPlaced(groups)) {
    if (t.qualifies) out.add(normalizeTeam(t.team));
  }
  return out;
}

const REAL_WINNERS = new Map(
  Object.entries(REAL_CONTEXT.qualifiers.groupWinners).map(([g, t]) => [
    g,
    normalizeTeam(t),
  ]),
);

const REAL_QUALIFIER_SET = new Set<string>(
  [
    ...Object.values(REAL_CONTEXT.qualifiers.groupWinners),
    ...Object.values(REAL_CONTEXT.qualifiers.runnersUp),
    ...REAL_CONTEXT.qualifiers.bestThirds.map((t) => t.team),
  ].map(normalizeTeam),
);

/** Score one group run against the real group stage. */
export function scoreRetrospective(run: GroupRun): RetrospectiveRow {
  const groups = predictedStandings(run);

  let groupWinnersCorrect = 0;
  for (const g of groups) {
    const predWinner = g.rows[0] ? normalizeTeam(g.rows[0].team) : null;
    if (predWinner && REAL_WINNERS.get(g.group) === predWinner)
      groupWinnersCorrect += 1;
  }

  const predicted = predictedQualifiers(groups);
  let qualifiersCorrect = 0;
  for (const t of predicted)
    if (REAL_QUALIFIER_SET.has(t)) qualifiersCorrect += 1;

  return {
    model: run.model,
    condition: run.condition,
    engine: run.engine,
    groupWinnersCorrect,
    groupsKnown: groups.length,
    qualifiersCorrect,
  };
}
