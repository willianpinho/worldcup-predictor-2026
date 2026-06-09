import { prisma } from "./db";
import {
  fetchFixturesForResults,
  resultsProviderName,
} from "./providers/index";
import { normalizeTeam, pairKey } from "./teams";

export interface SyncReport {
  provider: string;
  fetched: number;
  withScores: number;
  updated: number;
  unmatched: string[];
}

/**
 * Pull current scores from the active provider and update local matches.
 * Matches are aligned by team pair (group/order-independent); scores are
 * re-oriented to the stored teamA/teamB before saving.
 */
export async function syncResults(): Promise<SyncReport> {
  const fixtures = await fetchFixturesForResults();
  const scored = fixtures.filter(
    (f) =>
      (f.status === "FINISHED" || f.status === "LIVE") &&
      f.scoreA !== null &&
      f.scoreB !== null,
  );

  const rows = await prisma.match.findMany();
  const byPair = new Map(rows.map((m) => [pairKey(m.teamA, m.teamB), m]));

  let updated = 0;
  const unmatched: string[] = [];

  for (const f of scored) {
    const row = byPair.get(pairKey(f.teamA, f.teamB));
    if (!row) {
      unmatched.push(`${f.teamA} x ${f.teamB}`);
      continue;
    }
    const swap = normalizeTeam(f.teamA) === normalizeTeam(row.teamB);
    const scoreA = swap ? f.scoreB : f.scoreA;
    const scoreB = swap ? f.scoreA : f.scoreB;

    if (row.scoreA === scoreA && row.scoreB === scoreB && row.status === f.status) {
      continue;
    }
    await prisma.match.update({
      where: { id: row.id },
      data: { scoreA, scoreB, status: f.status },
    });
    updated += 1;
  }

  return {
    provider: resultsProviderName(),
    fetched: fixtures.length,
    withScores: scored.length,
    updated,
    unmatched,
  };
}

/** Manual result override from the admin screen (safety net for API gaps). */
export async function setManualResult(
  matchId: number,
  scoreA: number,
  scoreB: number,
): Promise<void> {
  await prisma.match.update({
    where: { id: matchId },
    data: { scoreA, scoreB, status: "FINISHED" },
  });
}
