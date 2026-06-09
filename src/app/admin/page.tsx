import { AdminPanel } from "@/components/admin/AdminPanel";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const rows = await prisma.match.findMany({
    orderBy: [{ kickoff: "asc" }, { id: "asc" }],
    select: { id: true, groupName: true, teamA: true, teamB: true },
  });

  const matches = rows.map((r) => ({
    id: r.id,
    label: `Grupo ${r.groupName} · ${r.teamA} x ${r.teamB}`,
  }));

  return <AdminPanel matches={matches} />;
}
