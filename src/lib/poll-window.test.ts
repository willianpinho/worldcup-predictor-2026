import { describe, expect, it } from "vitest";
import {
  DEFAULT_POLL_WINDOW,
  inActiveWindow,
  nextPollSeconds,
  type PollMatch,
} from "./poll-window";

const KICK = new Date("2026-06-11T19:00:00Z");
const min = (n: number) => n * 60_000;

function at(offsetMin: number): Date {
  return new Date(KICK.getTime() + min(offsetMin));
}

const scheduled: PollMatch = { kickoff: KICK, status: "SCHEDULED" };

describe("inActiveWindow", () => {
  it("is active for a LIVE match regardless of clock", () => {
    const live: PollMatch = { kickoff: KICK, status: "LIVE" };
    expect(inActiveWindow([live], at(10_000))).toBe(true);
  });

  it("is active just before kickoff (within preKickoffMin)", () => {
    expect(inActiveWindow([scheduled], at(-10))).toBe(true); // 10 min before
  });

  it("is NOT active well before kickoff (outside preKickoffMin)", () => {
    expect(inActiveWindow([scheduled], at(-30))).toBe(false); // 30 min before
  });

  it("is active during the post-kickoff window (match in play)", () => {
    expect(inActiveWindow([scheduled], at(90))).toBe(true); // 1.5 h in
  });

  it("is NOT active after the post-kickoff window closes", () => {
    expect(inActiveWindow([scheduled], at(160))).toBe(false); // 2h40m after
  });

  it("ignores FINISHED matches (no more polling needed)", () => {
    const finished: PollMatch = { kickoff: KICK, status: "FINISHED" };
    expect(inActiveWindow([finished], at(60))).toBe(false);
  });

  it("is active if ANY match in the set is in window", () => {
    const later: PollMatch = { kickoff: at(600), status: "SCHEDULED" };
    expect(inActiveWindow([later, scheduled], at(30))).toBe(true);
  });

  it("is idle when the schedule is empty", () => {
    expect(inActiveWindow([], at(0))).toBe(false);
  });
});

describe("nextPollSeconds", () => {
  it("returns the active cadence inside a window", () => {
    expect(nextPollSeconds([scheduled], at(0))).toBe(
      DEFAULT_POLL_WINDOW.activeSeconds,
    );
  });

  it("returns the idle cadence outside any window", () => {
    expect(nextPollSeconds([scheduled], at(300))).toBe(
      DEFAULT_POLL_WINDOW.idleSeconds,
    );
  });
});
