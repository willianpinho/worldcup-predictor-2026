import { flagCode } from "@/lib/flags";
import type { StandingRow } from "@/lib/standings";

// Qualification status per row index within a group, plus the best-thirds set
// resolved at the page level (team names that currently hold a best-8 third spot).
export type Qualification = "advance" | "playoff" | "out";

// Flag-only team identity: the country name lives in the native tooltip (hover /
// long-press) and in an sr-only span for screen readers — full names broke the
// compact 10-column table on narrow screens.
function TeamFlag({ team }: { team: string }) {
  const code = flagCode(team);
  return (
    <span title={team} className="inline-flex items-center">
      {code ? (
        <span
          className={`fi fi-${code} shrink-0 rounded-[2px] text-base`}
          aria-hidden
        />
      ) : (
        <span
          className="inline-flex h-4 w-[1.4rem] shrink-0 items-center justify-center rounded-[2px] bg-surface-2 text-[8px] font-semibold uppercase text-muted"
          aria-hidden
        >
          {team.slice(0, 3)}
        </span>
      )}
      <span className="sr-only">{team}</span>
    </span>
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
      className={`px-0.5 py-1.5 text-center font-mono text-xs tabular-nums sm:px-1 ${
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
            <th className="px-0.5 py-1 text-left font-medium sm:px-1">#</th>
            <th className="px-0.5 py-1 text-left font-medium sm:px-1">Team</th>
            <th className="px-0.5 py-1 text-center font-medium sm:px-1">P</th>
            <th className="px-0.5 py-1 text-center font-medium sm:px-1">W</th>
            <th className="px-0.5 py-1 text-center font-medium sm:px-1">D</th>
            <th className="px-0.5 py-1 text-center font-medium sm:px-1">L</th>
            <th className="px-0.5 py-1 text-center font-medium sm:px-1">GF</th>
            <th className="px-0.5 py-1 text-center font-medium sm:px-1">GA</th>
            <th className="px-0.5 py-1 text-center font-medium sm:px-1">GD</th>
            <th className="px-0.5 py-1 text-center font-medium sm:px-1">Pts</th>
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
                <td className="px-0.5 py-1.5 text-center font-mono text-xs text-muted sm:px-1">
                  {i + 1}
                </td>
                <td className="px-0.5 py-1.5 sm:px-1">
                  <TeamFlag team={r.team} />
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
