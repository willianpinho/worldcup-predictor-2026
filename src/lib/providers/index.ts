// Fixture/result providers. openfootball is the keyless source of truth for SEEDING
// the 104 fixtures (it carries groups + grounds). For RESULTS the FIFA API is the
// primary feed — it is the real-time origin (no key) those mirrors copy from, so
// finished scores appear within minutes instead of the openfootball lag of hours.
// API-Football remains an optional secondary feed when a key is present.

import {
  fetchApiFootballFixtures,
  isApiFootballConfigured,
} from "./apiFootball";
import { fetchFifaFixtures, isFifaConfigured } from "./fifa";
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

/** Which provider results-sync will prefer, given current env. */
export function resultsProviderName():
  | "fifa"
  | "api-football"
  | "openfootball" {
  if (isFifaConfigured()) return "fifa";
  return isApiFootballConfigured() ? "api-football" : "openfootball";
}

/** Fixtures for seeding the schedule (always openfootball: has groups + grounds, no key). */
export function fetchFixturesForSeed(): Promise<FixtureInput[]> {
  return fetchOpenfootballFixtures();
}

/**
 * Fixtures (with any known scores) for results sync. Priority: FIFA (free,
 * real-time, authoritative) → API-Football (if a key is set) → openfootball
 * (keyless last resort). Each tier falls through to the next on failure so a
 * single source outage never blocks results.
 */
export async function fetchFixturesForResults(): Promise<FixtureInput[]> {
  if (isFifaConfigured()) {
    try {
      return await fetchFifaFixtures();
    } catch (err) {
      console.warn(
        "[providers] FIFA failed, trying next source:",
        (err as Error).message,
      );
    }
  }
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
