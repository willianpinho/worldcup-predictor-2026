// In-app accessor for the Stage-2 ground truth: the real finished group stage and the
// official Round-of-32 draw, snapshotted from the FIFA API by scripts/build-real-context.ts.
// This is the SHARED, exogenous starting point for the "ground-truth-conditioned" knockout
// experiment — identical for every model — so it is imported here once and reused by the
// schema (validation), the prompt builder, the scoring, and the page.
import realContext from "../../../docs/context/real-groups-2026.json";
import type { GroupStanding } from "../standings";
import { normalizeTeam } from "../teams";

export interface R32Tie {
  slot: string; // R32-1 .. R32-16
  matchNum: number; // official 73..88
  teamA: string;
  teamB: string;
  kickoff: string; // ISO-8601
  city: string | null;
}

export interface RealContext {
  snapshotAt: string;
  source: string;
  groups: GroupStanding[];
  qualifiers: {
    groupWinners: Record<string, string>;
    runnersUp: Record<string, string>;
    bestThirds: Array<{ team: string; group: string }>;
  };
  roundOf32: R32Tie[];
}

export const REAL_CONTEXT: RealContext = realContext as RealContext;

/** Order-independent key for a knockout tie's two teams (normalized, sorted). */
export function pairingKey(teamA: string, teamB: string): string {
  return [normalizeTeam(teamA), normalizeTeam(teamB)].sort().join("|");
}

/** The 32 real qualifiers (normalized names). */
export const REAL_QUALIFIERS: ReadonlySet<string> = new Set(
  REAL_CONTEXT.roundOf32.flatMap((t) => [
    normalizeTeam(t.teamA),
    normalizeTeam(t.teamB),
  ]),
);

/** The 16 real R32 pairings (normalized pairing keys) — the fixed bracket every model fills. */
export const REAL_R32_PAIRINGS: ReadonlySet<string> = new Set(
  REAL_CONTEXT.roundOf32.map((t) => pairingKey(t.teamA, t.teamB)),
);
