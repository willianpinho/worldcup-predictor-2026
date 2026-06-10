import { describe, expect, it } from "vitest";
import {
  BASELINE_HEADER,
  ENRICHED_HEADER,
  type Fixture,
  groupPromptFor,
  renderContextBlock,
  type TeamContextDataset,
} from "./experiment";

const FIXTURES: Fixture[] = [
  { teamA: "Mexico", teamB: "South Africa" },
  { teamA: "United States", teamB: "Wales" },
  { teamA: "Mexico", teamB: "Wales" },
  { teamA: "United States", teamB: "South Africa" },
  { teamA: "Mexico", teamB: "United States" },
  { teamA: "Wales", teamB: "South Africa" },
];

const DATASET: TeamContextDataset = {
  snapshotDate: "2026-06-01",
  sources: {
    fifaRanking: {
      name: "FIFA Ranking",
      url: "https://example.test/fifa",
      releaseDate: "2026-04-03",
    },
    elo: {
      name: "Elo Ratings",
      url: "https://example.test/elo",
      retrievedAt: "2026-06-01",
    },
  },
  teams: [
    { team: "Mexico", confederation: "CONCACAF", fifaRank: 14, elo: 1822 },
    { team: "South Africa", confederation: "CAF", fifaRank: 58, elo: 1601 },
    {
      team: "United States",
      confederation: "CONCACAF",
      fifaRank: 16,
      elo: 1788,
    },
    { team: "Wales", confederation: "UEFA", fifaRank: 30, elo: 1702 },
    // An extra unrelated team must be ignored.
    { team: "Brazil", confederation: "CONMEBOL", fifaRank: 5, elo: 2010 },
  ],
};

describe("groupPromptFor", () => {
  it("lists all 6 fixtures in order and scopes to the group", () => {
    const prompt = groupPromptFor("A", FIXTURES);
    for (const f of FIXTURES) {
      expect(prompt).toContain(`${f.teamA} vs ${f.teamB}`);
    }
    expect(prompt).toContain("GROUP A");
    expect(prompt).toContain("Include all 6 listed fixtures of group A");
  });

  it("uses the baseline header and no context table when no block is given", () => {
    const prompt = groupPromptFor("A", FIXTURES);
    expect(prompt).toContain(BASELINE_HEADER);
    expect(prompt).not.toContain("STANDARDIZED CONTEXT");
    expect(prompt).not.toContain(ENRICHED_HEADER);
  });

  it("uses the enriched header and embeds the context table when a block is given", () => {
    const block = renderContextBlock("A", FIXTURES, DATASET);
    const prompt = groupPromptFor("A", FIXTURES, block);
    expect(prompt).toContain(ENRICHED_HEADER);
    expect(prompt).toContain("STANDARDIZED CONTEXT");
    expect(prompt).toContain(block);
  });
});

describe("renderContextBlock", () => {
  it("renders the 4 group teams with rank/elo and the snapshot + sources", () => {
    const block = renderContextBlock("A", FIXTURES, DATASET);
    expect(block).toContain("snapshot 2026-06-01");
    expect(block).toContain("FIFA Ranking (2026-04-03)");
    expect(block).toContain("Elo Ratings (retrieved 2026-06-01)");
    for (const t of ["Mexico", "South Africa", "United States", "Wales"]) {
      expect(block).toContain(t);
    }
    expect(block).toContain("1822");
    // Teams not in this group must not appear.
    expect(block).not.toContain("Brazil");
  });

  it("lists exactly the 4 distinct group teams (one row each)", () => {
    const block = renderContextBlock("A", FIXTURES, DATASET);
    const mexicoRows = block.split("\n").filter((l) => l.startsWith("Mexico"));
    expect(mexicoRows).toHaveLength(1);
  });

  it("throws when a fixture team is missing from the dataset", () => {
    const partial: TeamContextDataset = {
      ...DATASET,
      teams: DATASET.teams.filter((t) => t.team !== "Wales"),
    };
    expect(() => renderContextBlock("A", FIXTURES, partial)).toThrow(/Wales/);
  });
});
