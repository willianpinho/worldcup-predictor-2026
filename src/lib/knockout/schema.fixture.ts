// Programmatic builder for a minimal VALID knockout-run fixture used by schema.test.ts.
// 32 synthetic teams "T01".."T32"; team Tn wins every tie it plays, so the lower-numbered
// side always advances — yielding a fully consistent bracket down to champion T01.
import type { KnockoutRun } from "./schema";

const team = (n: number) => `T${String(n).padStart(2, "0")}`;

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

interface Tie {
  slot: string;
  a: number;
  b: number;
}

// Lower number wins; arrange ties so winners chain into the next round in order.
function round(
  prefix: string,
  teams: number[],
): { ties: Tie[]; winners: number[] } {
  const ties: Tie[] = [];
  const winners: number[] = [];
  for (let i = 0; i < teams.length; i += 2) {
    const a = teams[i];
    const b = teams[i + 1];
    ties.push({ slot: `${prefix}-${ties.length + 1}`, a, b });
    winners.push(Math.min(a, b));
  }
  return { ties, winners };
}

function match(t: Tie) {
  // Lower-numbered team wins 1–0 in regulation.
  const winnerIsA = t.a < t.b;
  return {
    slot: t.slot,
    teamA: team(t.a),
    teamB: team(t.b),
    scoreA: winnerIsA ? 1 : 0,
    scoreB: winnerIsA ? 0 : 1,
    decidedBy: "regulation" as const,
    winner: team(Math.min(t.a, t.b)),
  };
}

/** A fully consistent 16/8/4/2/1/1 bracket; champion = T01, third place = SF losers. */
export function buildValidRun(): KnockoutRun {
  const r32Teams = Array.from({ length: 32 }, (_, i) => i + 1); // [1..32]
  const r32 = round("R32", r32Teams);
  const r16 = round("R16", r32.winners);
  const qf = round("QF", r16.winners);
  const sf = round("SF", qf.winners);

  // Semi-final losers (higher-numbered side of each SF) contest third place.
  const sfLosers = sf.ties.map((t) => Math.max(t.a, t.b));
  const tp = match({ slot: "TP", a: sfLosers[0], b: sfLosers[1] });
  const fin = match({ slot: "F", a: sf.winners[0], b: sf.winners[1] });

  const groupWinners = Object.fromEntries(
    GROUPS.map((g, i) => [g, team(i + 1)]),
  );
  const runnersUp = Object.fromEntries(GROUPS.map((g, i) => [g, team(i + 13)]));
  const thirdPlaceAdvancing = Array.from({ length: 8 }, (_, i) => team(25 + i));

  return {
    model: "claude",
    generatedAt: "2026-06-10T12:00:00Z",
    engine: "Test Engine 1.0",
    qualification: {
      groupWinners:
        groupWinners as KnockoutRun["qualification"]["groupWinners"],
      runnersUp: runnersUp as KnockoutRun["qualification"]["runnersUp"],
      thirdPlaceAdvancing,
    },
    rounds: {
      roundOf32: r32.ties.map(match),
      roundOf16: r16.ties.map(match),
      quarterfinals: qf.ties.map(match),
      semifinals: sf.ties.map(match),
      thirdPlace: tp,
      final: fin,
    },
    champion: team(1),
    goldenBoot: { player: "Test Striker", team: team(1), goals: 7 },
  };
}
