import { prisma } from "./db";
import { nextPollSeconds } from "./poll-window";
import {
  fetchFixturesForResults,
  resultsProviderName,
} from "./providers/index";
import { groupUpdate, knockoutUpdate } from "./sync-match";
import { pairKey } from "./teams";

export interface SyncReport {
  provider: string;
  fetched: number;
  withScores: number;
  updated: number;
  unmatched: string[];
  /**
   * Seconds the caller (cron) should wait before its next sync, derived from the
   * fixtures' kickoff windows: short during/around matches, long when idle.
   */
  nextPollSeconds: number;
}

/**
 * Pull current scores from the active provider and update local matches.
 *
 * Group fixtures are aligned to GROUP rows by team pair (order-independent) and
 * scores re-oriented to the stored teamA/teamB. Knockout fixtures are aligned by
 * official match number (extId "wc-ko-<num>") — pairKey is unusable there because
 * placeholder codes aren't teams and a KO rematch of a group pairing would collide.
 * This is the mechanism that progressively fills the blank "Actual" bracket.
 */
export async function syncResults(): Promise<SyncReport> {
  const fixtures = await fetchFixturesForResults();

  const rows = await prisma.match.findMany();
  // Group matching is scoped to GROUP rows so KO rematches can't collide on pairKey.
  const byPair = new Map(
    rows
      .filter((m) => m.stage === "GROUP")
      .map((m) => [pairKey(m.teamA, m.teamB), m]),
  );
  const byMatchNum = new Map(
    rows.filter((m) => m.matchNum !== null).map((m) => [m.matchNum, m]),
  );

  let updated = 0;
  const unmatched: string[] = [];
  let withScores = 0;

  for (const f of fixtures) {
    if (f.stage === "GROUP") {
      const hasScore = f.scoreA !== null && f.scoreB !== null;
      const isResult =
        (f.status === "FINISHED" || f.status === "LIVE") && hasScore;
      if (!isResult) continue;
      withScores += 1;

      const row = byPair.get(pairKey(f.teamA, f.teamB));
      if (!row) {
        unmatched.push(`${f.teamA} x ${f.teamB}`);
        continue;
      }
      const data = groupUpdate(f, row);
      if (!data) continue;
      await prisma.match.update({ where: { id: row.id }, data });
      updated += 1;
      continue;
    }

    // Knockout: match by official number; update teams (codes → names), schedule,
    // status, scores, and penalties whenever any of them changed.
    if (f.scoreA !== null && f.scoreB !== null) withScores += 1;
    const row = f.matchNum !== null ? byMatchNum.get(f.matchNum) : undefined;
    if (!row) {
      unmatched.push(`#${f.matchNum} ${f.teamA} x ${f.teamB}`);
      continue;
    }
    const data = knockoutUpdate(f, row);
    if (!data) continue;
    await prisma.match.update({ where: { id: row.id }, data });
    updated += 1;
  }

  return {
    provider: resultsProviderName(),
    fetched: fixtures.length,
    withScores,
    updated,
    unmatched,
    // Reuse the rows we already loaded (they carry kickoff + status) so the cron
    // can self-throttle: poll every few minutes around matches, rarely otherwise.
    nextPollSeconds: nextPollSeconds(rows, new Date()),
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
