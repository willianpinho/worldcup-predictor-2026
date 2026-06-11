// The REAL tournament bracket ("Actual" tab): the 32 official knockout fixtures
// straight from the DB, ordered by match number. Teams may be placeholder codes
// ("2A", "W73") until the tournament fills them in; rendering decides how to show.

import { prisma } from "../db";
import { type KoStage, isKnockoutStage } from "./stage";

export interface ActualKoMatch {
  id: number;
  stage: KoStage;
  matchNum: number;
  teamA: string;
  teamB: string;
  city: string | null;
  kickoff: Date;
  status: string; // SCHEDULED | LIVE | FINISHED
  scoreA: number | null;
  scoreB: number | null;
  pensA: number | null;
  pensB: number | null;
}

/** All non-group fixtures ordered by official match number (73..104). */
export async function getKnockoutMatches(): Promise<ActualKoMatch[]> {
  const rows = await prisma.match.findMany({
    where: { stage: { not: "GROUP" } },
    orderBy: [{ matchNum: "asc" }, { id: "asc" }],
  });

  const out: ActualKoMatch[] = [];
  for (const m of rows) {
    if (!isKnockoutStage(m.stage) || m.matchNum === null) continue;
    out.push({
      id: m.id,
      stage: m.stage,
      matchNum: m.matchNum,
      teamA: m.teamA,
      teamB: m.teamB,
      city: m.city,
      kickoff: m.kickoff,
      status: m.status,
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      pensA: m.pensA,
      pensB: m.pensB,
    });
  }
  return out;
}
