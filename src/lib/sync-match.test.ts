import { describe, expect, it } from "vitest";
import type { FixtureInput } from "./providers/index";
import { groupUpdate, knockoutUpdate, type SyncRow } from "./sync-match";

const KICK = new Date("2026-06-28T19:00:00Z");

function groupFixture(over: Partial<FixtureInput> = {}): FixtureInput {
  return {
    extId: "wc-A-x",
    stage: "GROUP",
    matchNum: null,
    groupName: "A",
    teamA: "Mexico",
    teamB: "South Africa",
    venue: null,
    city: null,
    country: null,
    kickoff: KICK,
    status: "FINISHED",
    scoreA: 2,
    scoreB: 1,
    pensA: null,
    pensB: null,
    round: 1,
    ...over,
  };
}

function koFixture(over: Partial<FixtureInput> = {}): FixtureInput {
  return {
    extId: "wc-ko-73",
    stage: "R32",
    matchNum: 73,
    groupName: "R32",
    teamA: "2A",
    teamB: "2B",
    venue: null,
    city: "Los Angeles",
    country: null,
    kickoff: KICK,
    status: "SCHEDULED",
    scoreA: null,
    scoreB: null,
    pensA: null,
    pensB: null,
    round: 1,
    ...over,
  };
}

function row(over: Partial<SyncRow> = {}): SyncRow {
  return {
    id: 1,
    teamA: "Mexico",
    teamB: "South Africa",
    kickoff: KICK,
    status: "SCHEDULED",
    scoreA: null,
    scoreB: null,
    pensA: null,
    pensB: null,
    ...over,
  };
}

describe("groupUpdate", () => {
  it("orients scores onto the stored team order", () => {
    const f = groupFixture({ teamA: "Mexico", teamB: "South Africa" });
    const r = row({ teamA: "Mexico", teamB: "South Africa" });
    expect(groupUpdate(f, r)).toEqual({
      status: "FINISHED",
      scoreA: 2,
      scoreB: 1,
    });
  });

  it("swaps scores when provider order is reversed", () => {
    const f = groupFixture({ teamA: "South Africa", teamB: "Mexico" });
    const r = row({ teamA: "Mexico", teamB: "South Africa" });
    expect(groupUpdate(f, r)).toEqual({
      status: "FINISHED",
      scoreA: 1,
      scoreB: 2,
    });
  });

  it("returns null when nothing changed", () => {
    const f = groupFixture({ status: "FINISHED", scoreA: 2, scoreB: 1 });
    const r = row({ status: "FINISHED", scoreA: 2, scoreB: 1 });
    expect(groupUpdate(f, r)).toBeNull();
  });
});

describe("knockoutUpdate", () => {
  it("replaces placeholder codes with real team names", () => {
    const f = koFixture({
      teamA: "Mexico",
      teamB: "Norway",
      status: "SCHEDULED",
    });
    const r = row({ teamA: "2A", teamB: "2B", status: "SCHEDULED" });
    expect(knockoutUpdate(f, r)).toEqual({
      teamA: "Mexico",
      teamB: "Norway",
      kickoff: KICK,
      status: "SCHEDULED",
      scoreA: null,
      scoreB: null,
      pensA: null,
      pensB: null,
    });
  });

  it("carries scores and penalties for a finished tie", () => {
    const f = koFixture({
      teamA: "Mexico",
      teamB: "Norway",
      status: "FINISHED",
      scoreA: 1,
      scoreB: 1,
      pensA: 4,
      pensB: 2,
    });
    const r = row({ teamA: "Mexico", teamB: "Norway" });
    expect(knockoutUpdate(f, r)).toMatchObject({
      status: "FINISHED",
      scoreA: 1,
      scoreB: 1,
      pensA: 4,
      pensB: 2,
    });
  });

  it("returns null when the row already matches the fixture", () => {
    const f = koFixture({
      teamA: "Mexico",
      teamB: "Norway",
      status: "FINISHED",
      scoreA: 2,
      scoreB: 0,
    });
    const r = row({
      teamA: "Mexico",
      teamB: "Norway",
      kickoff: KICK,
      status: "FINISHED",
      scoreA: 2,
      scoreB: 0,
    });
    expect(knockoutUpdate(f, r)).toBeNull();
  });
});
