import { groupLetter, naturalKey } from "../teams";
import type { FixtureInput } from "./index";

const SOURCE_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

interface OpenfootballMatch {
  round?: string;
  date: string;
  time?: string;
  team1: string;
  team2: string;
  group?: string;
  ground?: string;
  score1?: number;
  score2?: number;
  score?: { ft?: [number, number] };
}

/** "13:00 UTC-6" + "2026-06-11" -> a real UTC instant. */
function parseKickoff(date: string, time?: string): Date {
  const m = time?.match(/(\d{1,2}):(\d{2})\s*UTC\s*([+-]\d{1,2})?/i);
  if (!m) return new Date(`${date}T00:00:00Z`);
  const [, hh, mm, off] = m;
  const offset = off
    ? `${off.startsWith("-") ? "-" : "+"}${String(Math.abs(Number.parseInt(off, 10))).padStart(2, "0")}:00`
    : "+00:00";
  return new Date(`${date}T${hh.padStart(2, "0")}:${mm}:00${offset}`);
}

function extractScore(m: OpenfootballMatch): { a: number | null; b: number | null } {
  if (typeof m.score1 === "number" && typeof m.score2 === "number") {
    return { a: m.score1, b: m.score2 };
  }
  if (m.score?.ft && m.score.ft.length === 2) {
    return { a: m.score.ft[0], b: m.score.ft[1] };
  }
  return { a: null, b: null };
}

export async function fetchOpenfootballFixtures(): Promise<FixtureInput[]> {
  const res = await fetch(SOURCE_URL, {
    headers: { "user-agent": "bolao-copa-2026" },
  });
  if (!res.ok) throw new Error(`openfootball HTTP ${res.status}`);

  const data = (await res.json()) as { matches: OpenfootballMatch[] };
  const groupMatches = data.matches.filter((m) => m.group && /group/i.test(m.group));

  // Bucket by group, then assign per-group matchday (1..3) chronologically.
  const byGroup = new Map<string, OpenfootballMatch[]>();
  for (const m of groupMatches) {
    const g = groupLetter(m.group as string);
    let arr = byGroup.get(g);
    if (!arr) {
      arr = [];
      byGroup.set(g, arr);
    }
    arr.push(m);
  }

  const out: FixtureInput[] = [];
  for (const [g, list] of byGroup) {
    list.sort(
      (a, b) =>
        parseKickoff(a.date, a.time).getTime() - parseKickoff(b.date, b.time).getTime(),
    );
    list.forEach((m, i) => {
      const score = extractScore(m);
      out.push({
        extId: naturalKey(m.group as string, m.team1, m.team2),
        groupName: g,
        teamA: m.team1,
        teamB: m.team2,
        venue: m.ground ?? null,
        city: m.ground ?? null,
        country: null,
        kickoff: parseKickoff(m.date, m.time),
        status: score.a !== null ? "FINISHED" : "SCHEDULED",
        scoreA: score.a,
        scoreB: score.b,
        round: Math.floor(i / 2) + 1,
      });
    });
  }
  return out;
}
