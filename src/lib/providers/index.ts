// Fixture/result providers. openfootball is the keyless source of truth for the
// 72 group-stage fixtures; API-Football is an optional, more real-time results feed.

import {
  fetchApiFootballFixtures,
  isApiFootballConfigured,
} from "./apiFootball";
import { fetchOpenfootballFixtures } from "./openfootball";

export type FixtureStatus = "SCHEDULED" | "LIVE" | "FINISHED";

/** Match stage. GROUP for the 72 group games; the rest are the 32 knockout ties. */
export type FixtureStage = "GROUP" | "R32" | "R16" | "QF" | "SF" | "TP" | "F";

export interface FixtureInput {
  extId: string;
  stage: FixtureStage;
  matchNum: number | null; // official FIFA match number 73..104; null for group
  groupName: string; // single letter A..L (group rows) or the stage code (knockout rows)
  teamA: string;
  teamB: string;
  venue: string | null;
  city: string | null;
  country: string | null;
  kickoff: Date;
  status: FixtureStatus;
  scoreA: number | null;
  scoreB: number | null;
  pensA: number | null; // penalty-shootout score (knockout only)
  pensB: number | null;
  round: number; // matchday within the group, 1..3; 1 for knockout
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
