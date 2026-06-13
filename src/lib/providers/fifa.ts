// FIFA's own data API — the same backend that powers FIFA.com and the official
// app, so it is the freshest possible source (live, minute-by-minute) and needs
// NO API key. Undocumented but stable. Unlike openfootball (volunteer-edited JSON
// that lags hours/days) this is the origin those mirrors copy from, so finished
// scores appear within minutes of full-time. Competition/season are env-overridable.

import { roundNameToStage } from "../knockout/stage";
import { groupLetter, naturalKey } from "../teams";
import type { FixtureInput, FixtureStage, FixtureStatus } from "./index";

const BASE = "https://api.fifa.com/api/v3";
const WC_COMPETITION = "17"; // FIFA World Cup
const WC_SEASON_2026 = "285023"; // FIFA World Cup 2026

/** Active unless explicitly disabled — FIFA needs no key, so it is the default. */
export function isFifaConfigured(): boolean {
  return process.env.FIFA_SYNC_DISABLED !== "1";
}

/** FIFA localizes text fields as `[{ Locale, Description }]`. */
type Localized = { Description: string }[];

interface FifaMatch {
  MatchNumber: number | null;
  MatchStatus: number;
  StageName: Localized | null;
  GroupName: Localized | null;
  Date: string;
  Home: { TeamName?: Localized } | null;
  Away: { TeamName?: Localized } | null;
  PlaceHolderA?: string | null;
  PlaceHolderB?: string | null;
  HomeTeamScore: number | null;
  AwayTeamScore: number | null;
  HomeTeamPenaltyScore: number | null;
  AwayTeamPenaltyScore: number | null;
  Stadium?: { Name?: Localized; CityName?: Localized } | null;
}

function desc(value: Localized | null | undefined): string | null {
  return value?.[0]?.Description ?? null;
}

/**
 * FIFA MatchStatus: 0 = played/finished, 3 = live/in-play. Everything else
 * (1 = not started, 4 = postponed, …) is treated as scheduled.
 */
export function mapFifaStatus(status: number): FixtureStatus {
  if (status === 0) return "FINISHED";
  if (status === 3) return "LIVE";
  return "SCHEDULED";
}

/** Team name when known, else the bracket placeholder ("W89", "RU101"). */
function teamLabel(
  team: { TeamName?: Localized } | null,
  placeholder: string | null | undefined,
): string {
  return desc(team?.TeamName) ?? placeholder ?? "?";
}

/** Map one FIFA match to a FixtureInput, or null if it is not a recognized fixture. */
export function mapFifaMatch(m: FifaMatch): FixtureInput | null {
  const teamA = teamLabel(m.Home, m.PlaceHolderA);
  const teamB = teamLabel(m.Away, m.PlaceHolderB);
  const kickoff = new Date(m.Date);
  const status = mapFifaStatus(m.MatchStatus);
  const venue = desc(m.Stadium?.Name);
  const city = desc(m.Stadium?.CityName);

  const groupName = desc(m.GroupName); // "Group A".."Group L", null for knockout
  if (groupName) {
    const g = groupLetter(groupName);
    return {
      extId: naturalKey(groupName, teamA, teamB),
      stage: "GROUP",
      matchNum: null,
      groupName: g,
      teamA,
      teamB,
      venue,
      city,
      country: null,
      kickoff,
      status,
      scoreA: m.HomeTeamScore,
      scoreB: m.AwayTeamScore,
      pensA: null,
      pensB: null,
      round: 1,
    };
  }

  // Knockout: aligned downstream by official match number (extId "wc-ko-<num>").
  const stage = fifaStageToCode(desc(m.StageName));
  if (!stage || m.MatchNumber == null) return null;
  return {
    extId: `wc-ko-${m.MatchNumber}`,
    stage,
    matchNum: m.MatchNumber,
    groupName: stage,
    teamA,
    teamB,
    venue,
    city,
    country: null,
    kickoff,
    status,
    scoreA: m.HomeTeamScore,
    scoreB: m.AwayTeamScore,
    pensA: m.HomeTeamPenaltyScore,
    pensB: m.AwayTeamPenaltyScore,
    round: 1,
  };
}

/** FIFA `StageName` → the app's stage code. "First Stage" is handled as GROUP upstream. */
function fifaStageToCode(stageName: string | null): FixtureStage | null {
  return stageName ? roundNameToStage(stageName) : null;
}

export async function fetchFifaFixtures(): Promise<FixtureInput[]> {
  const competition = process.env.FIFA_COMPETITION_ID ?? WC_COMPETITION;
  const season = process.env.FIFA_SEASON_ID ?? WC_SEASON_2026;

  const res = await fetch(
    `${BASE}/calendar/matches?idCompetition=${competition}&idSeason=${season}&count=500&language=en`,
    { headers: { "user-agent": "worldcup-predictor-2026" } },
  );
  if (!res.ok) throw new Error(`FIFA HTTP ${res.status}`);

  const json = (await res.json()) as { Results?: FifaMatch[] };
  if (!Array.isArray(json.Results)) {
    throw new Error("FIFA payload error: missing Results array");
  }

  const out: FixtureInput[] = [];
  for (const m of json.Results) {
    const fixture = mapFifaMatch(m);
    if (fixture) out.push(fixture);
  }
  return out;
}
