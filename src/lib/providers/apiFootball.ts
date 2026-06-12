import { naturalKey } from "../teams";
import type { FixtureInput, FixtureStatus } from "./index";

const BASE = "https://v3.football.api-sports.io";

export function isApiFootballConfigured(): boolean {
  return Boolean(process.env.FOOTBALL_API_KEY);
}

interface ApiFootballFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string };
    venue?: { name?: string | null; city?: string | null };
  };
  league: { round: string; country?: string };
  teams: { home: { name: string }; away: { name: string } };
  goals: { home: number | null; away: number | null };
}

function mapStatus(short: string): FixtureStatus {
  if (["FT", "AET", "PEN"].includes(short)) return "FINISHED";
  if (
    ["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT", "SUSP"].includes(short)
  ) {
    return "LIVE";
  }
  return "SCHEDULED";
}

/** API-Football WC rounds look like "Group A - 1" or "Group Stage - 1". */
function parseGroupLetter(round: string): string {
  const m = round.match(/group\s*([a-l])\b/i);
  return m ? m[1].toUpperCase() : "?";
}

/**
 * API-Football signals success with `errors: []` and any failure (bad/absent
 * key, wrong host, exhausted plan) with a NON-EMPTY value — an object keyed by
 * field (`{"token": "..."}`) or a non-empty array. Anything non-empty is a fail.
 */
export function hasApiErrors(errors: unknown): boolean {
  if (errors == null) return false;
  if (Array.isArray(errors)) return errors.length > 0;
  if (typeof errors === "object") return Object.keys(errors).length > 0;
  // A bare string/other truthy value is treated as an error.
  return Boolean(errors);
}

export async function fetchApiFootballFixtures(): Promise<FixtureInput[]> {
  const league = process.env.FOOTBALL_LEAGUE_ID ?? "1";
  const season = process.env.FOOTBALL_SEASON ?? "2026";

  const res = await fetch(
    `${BASE}/fixtures?league=${league}&season=${season}`,
    {
      headers: { "x-apisports-key": process.env.FOOTBALL_API_KEY ?? "" },
    },
  );
  if (!res.ok) throw new Error(`API-Football HTTP ${res.status}`);

  const json = (await res.json()) as {
    response: ApiFootballFixture[];
    errors?: unknown;
  };
  if (!Array.isArray(json.response)) {
    throw new Error(
      `API-Football payload error: ${JSON.stringify(json.errors)}`,
    );
  }
  // A success returns `errors: []`. An auth/quota/plan failure returns a
  // populated object (e.g. {"token":"Missing application key"}) alongside an
  // EMPTY `response` array — which previously slipped through as "0 fixtures"
  // and silently suppressed the openfootball fallback. Treat any non-empty
  // `errors` as a hard failure so the caller can fall back.
  if (hasApiErrors(json.errors)) {
    throw new Error(`API-Football error: ${JSON.stringify(json.errors)}`);
  }

  // Group-stage only. Knockout results come from openfootball (or a manual
  // override); a placeholder-bracket feed is not worth the extra mapping here.
  const groupFixtures = json.response.filter((f) =>
    /group/i.test(f.league.round),
  );

  return groupFixtures.map((f) => {
    const g = parseGroupLetter(f.league.round);
    const md = f.league.round.match(/-\s*(\d)/);
    return {
      extId: naturalKey(g, f.teams.home.name, f.teams.away.name),
      stage: "GROUP",
      matchNum: null,
      groupName: g,
      teamA: f.teams.home.name,
      teamB: f.teams.away.name,
      venue: f.fixture.venue?.name ?? null,
      city: f.fixture.venue?.city ?? null,
      country: f.league.country ?? null,
      kickoff: new Date(f.fixture.date),
      status: mapStatus(f.fixture.status.short),
      scoreA: f.goals.home,
      scoreB: f.goals.away,
      pensA: null,
      pensB: null,
      round: md ? Number.parseInt(md[1], 10) : 1,
    } satisfies FixtureInput;
  });
}
