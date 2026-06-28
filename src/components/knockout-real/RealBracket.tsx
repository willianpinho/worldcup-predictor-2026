import { KoMatchCell } from "@/components/knockout/KoMatchCell";
import type { RealKnockoutRun } from "@/lib/knockout-real/schema";

type Round = RealKnockoutRun["rounds"]["roundOf32"];

function BracketColumn({ title, matches }: { title: string; matches: Round }) {
  return (
    <div className="flex shrink-0 snap-start flex-col">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h3>
      <div className="flex flex-1 flex-col justify-around gap-3">
        {matches.map((m) => (
          // RealKoMatch is structurally a KoMatch — the cell renders both identically.
          <KoMatchCell key={m.slot} m={m} />
        ))}
      </div>
    </div>
  );
}

/** A Stage-2 bracket (built on the real R32 draw) as scrollable round columns. */
export function RealBracket({ run }: { run: RealKnockoutRun }) {
  const { roundOf32, roundOf16, quarterfinals, semifinals, final } = run.rounds;
  const columns: Array<{ title: string; matches: Round }> = [
    { title: "Round of 32", matches: roundOf32 },
    { title: "Round of 16", matches: roundOf16 },
    { title: "Quarter-finals", matches: quarterfinals },
    { title: "Semi-finals", matches: semifinals },
    { title: "Final", matches: [final] },
  ];

  return (
    <div>
      <p className="mb-1.5 text-right text-[11px] text-muted sm:hidden">
        swipe to follow the bracket →
      </p>
      <div className="snap-x snap-mandatory overflow-x-auto rounded-2xl border border-border bg-surface/40 p-4 sm:snap-none">
        <div className="flex min-w-max gap-6">
          {columns.map((c) => (
            <BracketColumn key={c.title} title={c.title} matches={c.matches} />
          ))}
        </div>
      </div>
    </div>
  );
}
