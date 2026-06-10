import type { KnockoutRun } from "@/lib/knockout/schema";
import { KoMatchCell } from "./KoMatchCell";

interface Column {
  title: string;
  matches: KnockoutRun["rounds"]["roundOf32"];
}

function BracketColumn({ title, matches }: Column) {
  return (
    <div className="flex shrink-0 flex-col">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h3>
      {/* Even vertical distribution keeps each round aligned with the next. */}
      <div className="flex flex-1 flex-col justify-around gap-3">
        {matches.map((m) => (
          <KoMatchCell key={m.slot} m={m} />
        ))}
      </div>
    </div>
  );
}

/** Knockout bracket as scrollable round columns (R32 → R16 → QF → SF → Final). */
export function Bracket({ run }: { run: KnockoutRun }) {
  const { roundOf32, roundOf16, quarterfinals, semifinals, final } = run.rounds;
  const columns: Column[] = [
    { title: "Round of 32", matches: roundOf32 },
    { title: "Round of 16", matches: roundOf16 },
    { title: "Quarter-finals", matches: quarterfinals },
    { title: "Semi-finals", matches: semifinals },
    { title: "Final", matches: [final] },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface/40 p-4">
      <div className="flex min-w-max gap-6">
        {columns.map((c) => (
          <BracketColumn key={c.title} title={c.title} matches={c.matches} />
        ))}
      </div>
    </div>
  );
}
