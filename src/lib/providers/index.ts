// Fixture/result providers. openfootball is the keyless source of truth for the
// 72 group-stage fixtures; API-Football is an optional, more real-time results feed.

import { fetchApiFootballFixtures, isApiFootballConfigured } from "./apiFootball";
import { fetchOpenfootballFixtures } from "./openfootball";

export type FixtureStatus = "SCHEDULED" | "LIVE" | "FINISHED";

export interface FixtureInput {
  extId: string;
  groupName: string; // single letter A..L
  teamA: string;
  teamB: string;
  venue: string | null;
  city: string | null;
  country: string | null;
  kickoff: Date;
  status: FixtureStatus;
  scoreA: number | null;
  scoreB: number | null;
  round: number; // matchday within the group, 1..3
}

/** Which provider results-sync will use, given current env. */
export function resultsProviderName(): "api-football" | "openfootball" {
  return isApiFootballConfigured() ? "api-football" : "openfootball";
}

/** Fixtures for seeding the schedule (always openfootball: has groups + grounds, no key). */
export function fetchFixturesForSeed(): Promise<FixtureInput[]> {
  return fetchOpenfootballFixtures();
}

/** Fixtures (with any known scores) for results sync. Prefers API-Football when configured. */
export async function fetchFixturesForResults(): Promise<FixtureInput[]> {
  if (isApiFootballConfigured()) {
    try {
      return await fetchApiFootballFixtures();
    } catch (err) {
      console.warn(
        "[providers] API-Football failed, falling back to openfootball:",
        (err as Error).message,
      );
    }
  }
  return fetchOpenfootballFixtures();
}
