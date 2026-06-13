import { describe, expect, it } from "vitest";
import { pairKey } from "../teams";
import { mapFifaMatch, mapFifaStatus } from "./fifa";

const loc = (d: string) => [{ Locale: "en-GB", Description: d }];

describe("mapFifaStatus", () => {
  it("maps FIFA status codes to fixture statuses", () => {
    expect(mapFifaStatus(0)).toBe("FINISHED");
    expect(mapFifaStatus(3)).toBe("LIVE");
    expect(mapFifaStatus(1)).toBe("SCHEDULED"); // not started
    expect(mapFifaStatus(4)).toBe("SCHEDULED"); // postponed
  });
});

describe("mapFifaMatch", () => {
  it("maps a finished group match to a GROUP fixture", () => {
    const f = mapFifaMatch({
      MatchNumber: 1,
      MatchStatus: 0,
      StageName: loc("First Stage"),
      GroupName: loc("Group A"),
      Date: "2026-06-11T19:00:00Z",
      Home: { TeamName: loc("Mexico") },
      Away: { TeamName: loc("South Africa") },
      HomeTeamScore: 2,
      AwayTeamScore: 0,
      HomeTeamPenaltyScore: null,
      AwayTeamPenaltyScore: null,
    });
    expect(f).not.toBeNull();
    expect(f?.stage).toBe("GROUP");
    expect(f?.groupName).toBe("A");
    expect(f?.matchNum).toBeNull(); // group rows align by team pair, not number
    expect(f?.status).toBe("FINISHED");
    expect(f?.scoreA).toBe(2);
    expect(f?.scoreB).toBe(0);
  });

  it("normalizes FIFA spellings so the pair key matches the seeded name", () => {
    // FIFA says "Korea Republic"/"Czechia"; openfootball seeded "South Korea"/"Czech Republic".
    const f = mapFifaMatch({
      MatchNumber: 2,
      MatchStatus: 0,
      StageName: loc("First Stage"),
      GroupName: loc("Group A"),
      Date: "2026-06-12T02:00:00Z",
      Home: { TeamName: loc("Korea Republic") },
      Away: { TeamName: loc("Czechia") },
      HomeTeamScore: 2,
      AwayTeamScore: 1,
      HomeTeamPenaltyScore: null,
      AwayTeamPenaltyScore: null,
    });
    expect(pairKey(f?.teamA ?? "", f?.teamB ?? "")).toBe(
      pairKey("South Korea", "Czech Republic"),
    );
  });

  it("maps a knockout match by official number with penalties", () => {
    const f = mapFifaMatch({
      MatchNumber: 104,
      MatchStatus: 0,
      StageName: loc("Final"),
      GroupName: null,
      Date: "2026-07-19T19:00:00Z",
      Home: { TeamName: loc("Brazil") },
      Away: { TeamName: loc("France") },
      HomeTeamScore: 1,
      AwayTeamScore: 1,
      HomeTeamPenaltyScore: 4,
      AwayTeamPenaltyScore: 3,
    });
    expect(f?.stage).toBe("F");
    expect(f?.extId).toBe("wc-ko-104");
    expect(f?.matchNum).toBe(104);
    expect(f?.pensA).toBe(4);
    expect(f?.pensB).toBe(3);
  });

  it("falls back to bracket placeholders for undecided knockout teams", () => {
    const f = mapFifaMatch({
      MatchNumber: 97,
      MatchStatus: 1,
      StageName: loc("Quarter-final"),
      GroupName: null,
      Date: "2026-07-10T19:00:00Z",
      Home: { TeamName: undefined },
      Away: { TeamName: undefined },
      PlaceHolderA: "W89",
      PlaceHolderB: "W90",
      HomeTeamScore: null,
      AwayTeamScore: null,
      HomeTeamPenaltyScore: null,
      AwayTeamPenaltyScore: null,
    });
    expect(f?.stage).toBe("QF");
    expect(f?.teamA).toBe("W89");
    expect(f?.teamB).toBe("W90");
    expect(f?.status).toBe("SCHEDULED");
  });

  it("returns null for an unrecognized non-group stage", () => {
    const f = mapFifaMatch({
      MatchNumber: null,
      MatchStatus: 1,
      StageName: loc("Preliminary"),
      GroupName: null,
      Date: "2026-06-01T00:00:00Z",
      Home: null,
      Away: null,
      HomeTeamScore: null,
      AwayTeamScore: null,
      HomeTeamPenaltyScore: null,
      AwayTeamPenaltyScore: null,
    });
    expect(f).toBeNull();
  });
});
