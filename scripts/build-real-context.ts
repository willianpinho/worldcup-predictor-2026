// Stage-2 ground-truth builder. Pulls the REAL, finished group stage straight from
// the FIFA API (the experiment's source of truth), computes the official final tables
// and the 32 qualifiers, captures the real Round-of-32 bracket (the official draw), and
// writes a versioned snapshot at docs/context/real-groups-2026.json.
//
// This snapshot is the single shared input for the Stage-2 ("ground-truth-conditioned")
// knockout experiment: the prompt renders it, the Zod schema validates predicted brackets
// against it, and the page reads it. Re-run it any time the FIFA group data changes (it
// will not, once all 72 games are final) — it is idempotent.
//
// Usage:  pnpm tsx scripts/build-real-context.ts [--out docs/context/real-groups-2026.json]

import "dotenv/config";
import { writeFileSync } from "node:fs";
import { fetchFifaFixtures } from "../src/lib/providers/fifa";
import type { FixtureInput } from "../src/lib/providers/index";
import {
  computeGroup,
  type GroupStanding,
  rankThirdPlaced,
  type StandingRow,
} from "../src/lib/standings";
import { groupLetter } from "../src/lib/teams";
import { parseFlags } from "./lib/llm";

const GROUPS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
] as const;

/** A finished R32 tie as drawn by FIFA — the fixed starting bracket for every model. */
interface R32Tie {
  slot: string; // R32-1 .. R32-16
  matchNum: number; // official 73..88
  teamA: string;
  teamB: string;
  kickoff: string; // ISO-8601
  city: string | null;
}

interface RealContext {
  snapshotAt: string;
  source: string;
  /** Final, ranked tables for each group A–L. */
  groups: GroupStanding[];
  qualifiers: {
    groupWinners: Record<string, string>;
    runnersUp: Record<string, string>;
    /** The 8 best third-placed teams that advanced, with their group. */
    bestThirds: Array<{ team: string; group: string }>;
  };
  /** The official Round-of-32 draw (16 ties), in match-number order. */
  roundOf32: R32Tie[];
}

function groupResultsFromFixtures(fixtures: FixtureInput[]) {
  // Map group letter -> { teams:Set, results:[] }, from the 72 finished group games.
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
  for (const f of fixtures) {
    if (f.stage !== "GROUP") continue;
    if (f.scoreA === null || f.scoreB === null) continue; // unfinished — should not happen post-groups
    const g = groupLetter(f.groupName);
    const entry = byGroup.get(g) ?? { teams: new Set<string>(), results: [] };
    entry.teams.add(f.teamA);
    entry.teams.add(f.teamB);
    entry.results.push({
      teamA: f.teamA,
      teamB: f.teamB,
      scoreA: f.scoreA,
      scoreB: f.scoreB,
    });
    byGroup.set(g, entry);
  }
  return byGroup;
}

function buildStandings(fixtures: FixtureInput[]): GroupStanding[] {
  const byGroup = groupResultsFromFixtures(fixtures);
  const out: GroupStanding[] = [];
  for (const g of GROUPS) {
    const entry = byGroup.get(g);
    if (!entry) throw new Error(`FIFA data missing group ${g}`);
    if (entry.results.length !== 6)
      throw new Error(
        `Group ${g}: expected 6 finished games, got ${entry.results.length}`,
      );
    const rows = computeGroup([...entry.teams], entry.results);
    if (rows.length !== 4)
      throw new Error(`Group ${g}: expected 4 teams, got ${rows.length}`);
    out.push({ group: g, rows });
  }
  return out;
}

function buildR32(fixtures: FixtureInput[]): R32Tie[] {
  const ties = fixtures
    .filter((f) => f.stage === "R32" && f.matchNum !== null)
    .sort((a, b) => (a.matchNum ?? 0) - (b.matchNum ?? 0))
    .map((f) => ({
      slot: `R32-${(f.matchNum ?? 0) - 72}`,
      matchNum: f.matchNum as number,
      teamA: f.teamA,
      teamB: f.teamB,
      kickoff: f.kickoff.toISOString(),
      city: f.city,
    }));
  if (ties.length !== 16)
    throw new Error(
      `Expected 16 Round-of-32 ties from FIFA, got ${ties.length}`,
    );
  for (const t of ties) {
    if (!t.teamA || !t.teamB || t.teamA === "?" || t.teamB === "?")
      throw new Error(
        `R32 tie ${t.slot} not yet resolved by FIFA (${t.teamA} vs ${t.teamB})`,
      );
  }
  return ties;
}

function winner(rows: StandingRow[]): string {
  return rows[0].team;
}
function runnerUp(rows: StandingRow[]): string {
  return rows[1].team;
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));
  const out = flags.out || "docs/context/real-groups-2026.json";

  console.log("Fetching FIFA fixtures (source of truth)…");
  const fixtures = await fetchFifaFixtures();

  const groups = buildStandings(fixtures);

  const groupWinners: Record<string, string> = {};
  const runnersUp: Record<string, string> = {};
  for (const g of groups) {
    groupWinners[g.group] = winner(g.rows);
    runnersUp[g.group] = runnerUp(g.rows);
  }

  const bestThirds = rankThirdPlaced(groups)
    .filter((t) => t.qualifies)
    .map((t) => ({ team: t.team, group: t.group }));
  if (bestThirds.length !== 8)
    throw new Error(
      `Expected 8 advancing third-placed teams, got ${bestThirds.length}`,
    );

  const roundOf32 = buildR32(fixtures);

  // Sanity: the 16 R32 ties must reference exactly the 32 qualifiers we derived.
  const qualifierSet = new Set<string>([
    ...Object.values(groupWinners),
    ...Object.values(runnersUp),
    ...bestThirds.map((t) => t.team),
  ]);
  const bracketTeams = new Set(roundOf32.flatMap((t) => [t.teamA, t.teamB]));
  if (qualifierSet.size !== 32)
    throw new Error(`Derived ${qualifierSet.size} qualifiers, expected 32`);
  if (bracketTeams.size !== 32)
    throw new Error(
      `R32 bracket lists ${bracketTeams.size} teams, expected 32`,
    );

  const context: RealContext = {
    snapshotAt: new Date().toISOString(),
    source:
      "FIFA Data API (api.fifa.com/api/v3, competition 17, season 285023) — official, real-time.",
    groups,
    qualifiers: { groupWinners, runnersUp, bestThirds },
    roundOf32,
  };

  writeFileSync(out, `${JSON.stringify(context, null, 2)}\n`);
  console.log(`Wrote ${out}`);
  console.log(
    `  groups: ${groups.length} · qualifiers: ${qualifierSet.size} · R32 ties: ${roundOf32.length}`,
  );
  console.log(
    `  winners: ${GROUPS.map((g) => `${g}:${groupWinners[g]}`).join("  ")}`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
