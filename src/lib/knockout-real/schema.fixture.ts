// Programmatic builder for a VALID Stage-2 run fixture (schema.test.ts, scoring.test.ts).
// Built FROM the real R32 draw (REAL_CONTEXT) so it satisfies the official-bracket pin:
// in every tie the listed teamA wins 1–0, and winners chain into the next round in order.
import { REAL_CONTEXT } from "./context";
import type { RealKnockoutRun, RealKoMatch } from "./schema";

/** teamA wins 1–0 in regulation. */
function tie(slot: string, teamA: string, teamB: string): RealKoMatch {
  return {
    slot,
    teamA,
    teamB,
    scoreA: 1,
    scoreB: 0,
    decidedBy: "regulation",
    winner: teamA,
  };
}

/** Pair a flat list of teams [a,b,c,d…] into ties a-vs-b, c-vs-d…; teamA (even index) wins. */
function pairRound(prefix: string, teams: string[]): RealKoMatch[] {
  const out: RealKoMatch[] = [];
  for (let i = 0; i < teams.length; i += 2) {
    out.push(tie(`${prefix}-${out.length + 1}`, teams[i], teams[i + 1]));
  }
  return out;
}

/** A fully consistent Stage-2 bracket over the REAL R32 draw; champion = R32-1's teamA. */
export function buildValidRealRun(): RealKnockoutRun {
  const roundOf32 = REAL_CONTEXT.roundOf32.map((t) =>
    tie(t.slot, t.teamA, t.teamB),
  );
  const r32Winners = roundOf32.map((m) => m.winner);

  const roundOf16 = pairRound("R16", r32Winners);
  const quarterfinals = pairRound(
    "QF",
    roundOf16.map((m) => m.winner),
  );
  const semifinals = pairRound(
    "SF",
    quarterfinals.map((m) => m.winner),
  );

  const sfLosers = semifinals.map((m) => m.teamB); // teamA won, so teamB is the loser
  const thirdPlace = tie("TP", sfLosers[0], sfLosers[1]);
  const final = tie("F", semifinals[0].winner, semifinals[1].winner);

  return {
    model: "claude",
    condition: "enriched",
    generatedAt: "2026-06-28T12:00:00Z",
    engine: "Test Engine 1.0",
    rounds: {
      roundOf32,
      roundOf16,
      quarterfinals,
      semifinals,
      thirdPlace,
      final,
    },
    champion: final.winner,
    goldenBoot: { player: "Test Striker", team: final.winner, goals: 7 },
  };
}
