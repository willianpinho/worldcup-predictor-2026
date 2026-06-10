import { flagCode } from "@/lib/flags";
import type { KnockoutRun } from "@/lib/knockout/schema";

const GROUPS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
] as const;

function TeamChip({ team }: { team: string }) {
  const code = flagCode(team);
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
      {code && (
        <span
          className={`fi fi-${code} size-3 shrink-0 rounded-[2px]`}
          aria-hidden
        />
      )}
      <span className="truncate">{team}</span>
    </span>
  );
}

export function QualificationSummary({
  qualification,
}: {
  qualification: KnockoutRun["qualification"];
}) {
  const { groupWinners, runnersUp, thirdPlaceAdvancing } = qualification;
  return (
    <details className="group rounded-2xl border border-border bg-surface">
      <summary className="flex cursor-pointer select-none items-center gap-1.5 px-4 py-3 text-sm font-medium text-foreground">
        <span className="text-muted transition-transform group-open:rotate-90">
          ▸
        </span>
        Qualification — 12 winners, 12 runners-up, 8 best thirds
      </summary>
      <div className="grid gap-4 border-t border-border px-4 py-4 text-xs sm:grid-cols-2">
        <div>
          <div className="mb-2 font-semibold uppercase tracking-wide text-muted">
            By group
          </div>
          <ul className="space-y-1">
            {GROUPS.map((g) => (
              <li
                key={g}
                className="grid grid-cols-[1.5rem_1fr_1fr] items-center gap-2"
              >
                <span className="font-mono text-accent">{g}</span>
                <TeamChip team={groupWinners[g]} />
                <span className="flex min-w-0 text-muted">
                  <TeamChip team={runnersUp[g]} />
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mb-2 font-semibold uppercase tracking-wide text-muted">
            Best third-placed
          </div>
          <ul className="grid grid-cols-2 gap-1">
            {thirdPlaceAdvancing.map((t) => (
              <li key={t}>
                <TeamChip team={t} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
