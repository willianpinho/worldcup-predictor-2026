import { flagCode } from "@/lib/flags";
import type { StandingRow } from "@/lib/standings";

// Qualification status per row index within a group, plus the best-thirds set
// resolved at the page level (team names that currently hold a best-8 third spot).
export type Qualification = "advance" | "playoff" | "out";

function Flag({ team }: { team: string }) {
  const code = flagCode(team);
  if (!code)
    return (
      <span
        className="h-3 w-4 shrink-0 rounded-[2px] bg-surface-2"
        aria-hidden
      />
    );
  return (
    <span className={`fi fi-${code} shrink-0 rounded-[2px]`} aria-hidden />
  );
}

const ROW_TINT: Record<Qualification, string> = {
  advance: "border-l-accent bg-accent/5",
  playoff: "border-l-amber-400 bg-amber-400/5",
  out: "border-l-transparent",
};

function Cell({
  children,
  strong,
}: {
  children: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <td
      className={`px-1 py-1.5 text-center font-mono text-xs tabular-nums ${
        strong ? "font-semibold text-foreground" : "text-muted"
      }`}
    >
      {children}
    </td>
  );
}

export function StandingsTable({
  group,
  rows,
  qualificationFor,
}: {
  group: string;
  rows: StandingRow[];
  qualificationFor: (row: StandingRow, index: number) => Qualification;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-3">
      <h2 className="mb-2 px-1 text-sm font-semibold">
        Group <span className="text-accent">{group}</span>
      </h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-muted">
            <th className="px-1 py-1 text-left font-medium">#</th>
            <th className="px-1 py-1 text-left font-medium">Team</th>
            <th className="px-1 py-1 text-center font-medium">P</th>
            <th className="px-1 py-1 text-center font-medium">W</th>
            <th className="px-1 py-1 text-center font-medium">D</th>
            <th className="px-1 py-1 text-center font-medium">L</th>
            <th className="px-1 py-1 text-center font-medium">GF</th>
            <th className="px-1 py-1 text-center font-medium">GA</th>
            <th className="px-1 py-1 text-center font-medium">GD</th>
            <th className="px-1 py-1 text-center font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const qual = qualificationFor(r, i);
            return (
              <tr
                key={r.team}
                className={`border-l-2 ${ROW_TINT[qual]} border-t border-border/40`}
              >
                <td className="px-1 py-1.5 text-center font-mono text-xs text-muted">
                  {i + 1}
                </td>
                <td className="px-1 py-1.5">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Flag team={r.team} />
                    <span className="truncate text-xs font-medium">
                      {r.team}
                    </span>
                  </span>
                </td>
                <Cell>{r.played}</Cell>
                <Cell>{r.won}</Cell>
                <Cell>{r.drawn}</Cell>
                <Cell>{r.lost}</Cell>
                <Cell>{r.goalsFor}</Cell>
                <Cell>{r.goalsAgainst}</Cell>
                <Cell>{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</Cell>
                <Cell strong>{r.points}</Cell>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
