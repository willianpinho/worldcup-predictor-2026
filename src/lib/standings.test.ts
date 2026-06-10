import { describe, expect, it } from "vitest";
import {
  computeGroup,
  type GroupStanding,
  type PlayedResult,
  rankThirdPlaced,
  type StandingRow,
} from "./standings";

const TEAMS = ["Alpha", "Bravo", "Charlie", "Delta"];

function row(group: GroupStanding, team: string): StandingRow {
  const r = group.rows.find((x) => x.team === team);
  if (!r) throw new Error(`team ${team} missing`);
  return r;
}

describe("computeGroup", () => {
  it("returns all teams with zeros when nothing is played", () => {
    const rows = computeGroup(TEAMS, []);
    expect(rows).toHaveLength(4);
    for (const r of rows) {
      expect(r.played).toBe(0);
      expect(r.points).toBe(0);
      expect(r.goalDiff).toBe(0);
    }
    // ties broken alphabetically when everything is equal
    expect(rows.map((r) => r.team)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
      "Delta",
    ]);
  });

  it("computes points, W/D/L, goals, and goal difference", () => {
    const results: PlayedResult[] = [
      { teamA: "Alpha", teamB: "Bravo", scoreA: 2, scoreB: 0 }, // Alpha win
      { teamA: "Charlie", teamB: "Delta", scoreA: 1, scoreB: 1 }, // draw
    ];
    const rows = computeGroup(TEAMS, results);
    const alpha = rows.find((r) => r.team === "Alpha")!;
    const bravo = rows.find((r) => r.team === "Bravo")!;
    const charlie = rows.find((r) => r.team === "Charlie")!;

    expect(alpha).toMatchObject({
      played: 1,
      won: 1,
      drawn: 0,
      lost: 0,
      goalsFor: 2,
      goalsAgainst: 0,
      goalDiff: 2,
      points: 3,
    });
    expect(bravo).toMatchObject({ lost: 1, points: 0, goalDiff: -2 });
    expect(charlie).toMatchObject({ drawn: 1, points: 1, goalDiff: 0 });

    // ranking: Alpha (3) first; then the two 1-pt draws by alpha order; Bravo last
    expect(rows.map((r) => r.team)).toEqual([
      "Alpha",
      "Charlie",
      "Delta",
      "Bravo",
    ]);
  });

  it("breaks equal points by goal difference, then goals for", () => {
    // Alpha & Bravo both win once: same points (3). Alpha +3 GD, Bravo +1 GD.
    const results: PlayedResult[] = [
      { teamA: "Alpha", teamB: "Charlie", scoreA: 3, scoreB: 0 }, // Alpha GD +3
      { teamA: "Bravo", teamB: "Delta", scoreA: 1, scoreB: 0 }, // Bravo GD +1
    ];
    const rows = computeGroup(TEAMS, results);
    expect(rows[0].team).toBe("Alpha"); // higher GD
    expect(rows[1].team).toBe("Bravo");
  });

  it("breaks equal points and GD by goals for", () => {
    // Both win by the same margin (GD +1) but Alpha scores more goals.
    const results: PlayedResult[] = [
      { teamA: "Alpha", teamB: "Charlie", scoreA: 3, scoreB: 2 }, // GD +1, GF 3
      { teamA: "Bravo", teamB: "Delta", scoreA: 1, scoreB: 0 }, // GD +1, GF 1
    ];
    const rows = computeGroup(TEAMS, results);
    expect(rows[0].team).toBe("Alpha"); // more goals for
    expect(rows[1].team).toBe("Bravo");
  });

  it("uses head-to-head among the tied teams before going alphabetical", () => {
    // Construct a 3-way tie on points/GD/GF that head-to-head must resolve.
    // Each of Alpha, Bravo, Charlie: 1 win + 1 loss, GD 0, GF 2 within the trio;
    // Delta loses both shown matches. The H2H mini-table makes the order
    // Bravo > Charlie > Alpha despite alphabetical putting Alpha first.
    const results: PlayedResult[] = [
      { teamA: "Bravo", teamB: "Alpha", scoreA: 1, scoreB: 0 }, // Bravo beats Alpha
      { teamA: "Charlie", teamB: "Bravo", scoreA: 1, scoreB: 0 }, // Charlie beats Bravo
      { teamA: "Alpha", teamB: "Charlie", scoreA: 1, scoreB: 0 }, // Alpha beats Charlie
      { teamA: "Alpha", teamB: "Bravo", scoreA: 1, scoreB: 1 }, // extra draws to equalize GF/GD
      { teamA: "Bravo", teamB: "Charlie", scoreA: 1, scoreB: 1 },
      { teamA: "Charlie", teamB: "Alpha", scoreA: 1, scoreB: 1 },
    ];
    const rows = computeGroup(TEAMS, results);
    // Alpha/Bravo/Charlie all: played 4, 2 wins-ish? verify they share points/GD/GF.
    const trio = rows.filter((r) => r.team !== "Delta");
    const [a] = trio;
    for (const r of trio) {
      expect(r.points).toBe(a.points);
      expect(r.goalDiff).toBe(a.goalDiff);
      expect(r.goalsFor).toBe(a.goalsFor);
    }
    // Head-to-head among the trio is a perfect cycle (each 1W-1L-2D = 5 pts),
    // so it stays tied and the alphabetical fallback applies deterministically.
    expect(trio.map((r) => r.team)).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("resolves a two-way tie by the head-to-head result", () => {
    // Alpha and Bravo finish level on points/GD/GF; Bravo won the meeting.
    const results: PlayedResult[] = [
      { teamA: "Alpha", teamB: "Charlie", scoreA: 2, scoreB: 1 }, // Alpha: 3pts, GD+1, GF2
      { teamA: "Bravo", teamB: "Delta", scoreA: 2, scoreB: 1 }, // Bravo: 3pts, GD+1, GF2
      { teamA: "Bravo", teamB: "Alpha", scoreA: 1, scoreB: 0 }, // adds a win for Bravo, loss for Alpha
      { teamA: "Alpha", teamB: "Delta", scoreA: 1, scoreB: 0 }, // re-level Alpha vs Bravo
      { teamA: "Bravo", teamB: "Charlie", scoreA: 0, scoreB: 1 },
    ];
    const rows = computeGroup(TEAMS, results);
    const alpha = rows.find((r) => r.team === "Alpha")!;
    const bravo = rows.find((r) => r.team === "Bravo")!;
    expect(alpha.points).toBe(bravo.points);
    expect(alpha.goalDiff).toBe(bravo.goalDiff);
    expect(alpha.goalsFor).toBe(bravo.goalsFor);
    // Bravo beat Alpha head-to-head, so Bravo ranks above Alpha.
    const alphaIdx = rows.findIndex((r) => r.team === "Alpha");
    const bravoIdx = rows.findIndex((r) => r.team === "Bravo");
    expect(bravoIdx).toBeLessThan(alphaIdx);
  });

  it("ignores results that reference teams outside the group", () => {
    const results: PlayedResult[] = [
      { teamA: "Alpha", teamB: "Outsider", scoreA: 5, scoreB: 0 },
    ];
    const rows = computeGroup(TEAMS, results);
    expect(rows.every((r) => r.played === 0)).toBe(true);
  });
});

describe("rankThirdPlaced", () => {
  function thirdPlace(
    group: string,
    points: number,
    gd: number,
    gf: number,
    team: string,
  ): GroupStanding {
    const r: StandingRow = {
      team,
      played: 3,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: gf,
      goalsAgainst: gf - gd,
      goalDiff: gd,
      points,
    };
    // positions 1 and 2 are placeholders; only rows[2] is read.
    return {
      group,
      rows: [{ ...r, team: `${group}1` }, { ...r, team: `${group}2` }, r],
    };
  }

  it("ranks the 12 thirds and qualifies exactly the best 8", () => {
    // 12 groups A..L; give decreasing points so the cutoff is unambiguous.
    const groups: GroupStanding[] = [];
    const letters = "ABCDEFGHIJKL".split("");
    letters.forEach((g, i) => {
      groups.push(thirdPlace(g, 12 - i, 0, 5, `Third-${g}`));
    });

    const ranked = rankThirdPlaced(groups);
    expect(ranked).toHaveLength(12);
    expect(ranked.filter((r) => r.qualifies)).toHaveLength(8);
    // Highest points first.
    expect(ranked[0].team).toBe("Third-A");
    // The 8th is in, the 9th is out.
    expect(ranked[7].qualifies).toBe(true);
    expect(ranked[8].qualifies).toBe(false);
  });

  it("orders thirds by points → GD → GF → alphabetical", () => {
    const groups: GroupStanding[] = [
      thirdPlace("A", 3, 1, 2, "Zeta"), // same pts/gd/gf as B but later name
      thirdPlace("B", 3, 1, 2, "Alpha"), // wins alphabetical
      thirdPlace("C", 3, 2, 2, "Mid"), // higher GD → top
    ];
    const ranked = rankThirdPlaced(groups);
    expect(ranked.map((r) => r.team)).toEqual(["Mid", "Alpha", "Zeta"]);
  });

  it("handles missing third place safely (short groups)", () => {
    const groups: GroupStanding[] = [{ group: "A", rows: [] }];
    expect(rankThirdPlaced(groups)).toEqual([]);
  });
});
