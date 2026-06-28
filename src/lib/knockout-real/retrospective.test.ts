import { describe, expect, it } from "vitest";
import type { GroupRun } from "./retrospective";
import { scoreRetrospective } from "./retrospective";

// Real Group A (per the committed FIFA snapshot): Mexico won the group.
const GROUP_A = ["Mexico", "South Africa", "Korea Republic", "Czechia"];

/** Round-robin where `winner` beats everyone 1–0 and the others draw 0–0. */
function groupRun(winner: string, teams: string[]): GroupRun {
  const predictions: GroupRun["predictions"] = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const a = teams[i];
      const b = teams[j];
      const aWins = a === winner;
      const bWins = b === winner;
      predictions.push({
        group: "A",
        teamA: a,
        teamB: b,
        scoreA: aWins ? 1 : 0,
        scoreB: bWins ? 1 : 0,
      });
    }
  }
  return {
    model: "claude",
    condition: "web",
    engine: "Test",
    generatedAt: "2026-06-09T00:00:00Z",
    predictions,
  };
}

describe("scoreRetrospective", () => {
  it("credits a correctly called group winner against the real result", () => {
    const row = scoreRetrospective(groupRun("Mexico", GROUP_A));
    expect(row.groupsKnown).toBe(1);
    expect(row.groupWinnersCorrect).toBe(1); // Mexico is the real Group A winner
    expect(row.qualifiersCorrect).toBeGreaterThanOrEqual(1);
  });

  it("does not credit a wrong group winner", () => {
    const row = scoreRetrospective(groupRun("Czechia", GROUP_A));
    expect(row.groupWinnersCorrect).toBe(0); // Czechia did not win Group A
  });
});
