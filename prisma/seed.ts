import "dotenv/config";
import { prisma } from "../src/lib/db";
import { fetchFixturesForSeed } from "../src/lib/providers/index";

async function main() {
  const fixtures = await fetchFixturesForSeed();
  console.log(`Fetched ${fixtures.length} group-stage fixtures.`);

  const before = await prisma.match.count();

  for (const f of fixtures) {
    await prisma.match.upsert({
      where: { extId: f.extId },
      create: {
        extId: f.extId,
        groupName: f.groupName,
        teamA: f.teamA,
        teamB: f.teamB,
        venue: f.venue,
        city: f.city,
        country: f.country,
        kickoff: f.kickoff,
        status: f.status,
        scoreA: f.scoreA,
        scoreB: f.scoreB,
        round: f.round,
      },
      // Re-seed refreshes schedule metadata but never clobbers recorded results.
      update: {
        groupName: f.groupName,
        teamA: f.teamA,
        teamB: f.teamB,
        venue: f.venue,
        city: f.city,
        country: f.country,
        kickoff: f.kickoff,
        round: f.round,
      },
    });
  }

  const after = await prisma.match.count();
  const groups = await prisma.match.groupBy({ by: ["groupName"], _count: true });
  console.log(
    `Seed done. Matches: ${after} (created ${after - before}). Groups: ${groups
      .map((g) => `${g.groupName}=${g._count}`)
      .sort()
      .join(" ")}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
