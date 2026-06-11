import { LuTrophy } from "react-icons/lu";
import { flagCode } from "@/lib/flags";
import type { ActualKoMatch } from "@/lib/knockout/actual";
import { isPlaceholder } from "@/lib/knockout/placeholder";
import type { KoStage } from "@/lib/knockout/stage";
import { ActualKoCell } from "./ActualKoCell";

// R32 → R16 → QF → SF → Final columns, mirroring the predicted Bracket layout.
const COLUMNS: Array<{ stage: KoStage; title: string }> = [
  { stage: "R32", title: "Round of 32" },
  { stage: "R16", title: "Round of 16" },
  { stage: "QF", title: "Quarter-finals" },
  { stage: "SF", title: "Semi-finals" },
  { stage: "F", title: "Final" },
];

function Column({
  title,
  matches,
}: {
  title: string;
  matches: ActualKoMatch[];
}) {
  return (
    <div className="flex shrink-0 snap-start flex-col">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </h3>
      <div className="flex flex-1 flex-col justify-around gap-3">
        {matches.map((m) => (
          <ActualKoCell key={m.matchNum} m={m} />
        ))}
      </div>
    </div>
  );
}

/** Champion: real winner with trophy once the final is FINISHED, otherwise a muted note. */
function ChampionArea({ final }: { final: ActualKoMatch | undefined }) {
  const decided =
    final?.status === "FINISHED" &&
    final.scoreA !== null &&
    final.scoreB !== null;
  if (!final || !decided) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-4 text-sm text-muted">
        Champion decided 19 July 2026.
      </div>
    );
  }
  const aWon =
    final.pensA !== null && final.pensB !== null
      ? final.pensA > final.pensB
      : (final.scoreA ?? 0) > (final.scoreB ?? 0);
  const champion = aWon ? final.teamA : final.teamB;
  const code = isPlaceholder(champion) ? null : flagCode(champion);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
      <LuTrophy className="size-8 shrink-0 text-accent" aria-hidden />
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-muted">
          Champion
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          {code && (
            <span
              className={`fi fi-${code} text-xl rounded-[2px]`}
              aria-hidden
            />
          )}
          <span className="truncate text-lg font-bold">{champion}</span>
        </div>
      </div>
    </div>
  );
}

/** Third-place play-off, shown near the final like the predicted view's banner. */
function ThirdPlace({ tp }: { tp: ActualKoMatch | undefined }) {
  if (!tp) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
        Third place
      </h3>
      <ActualKoCell m={tp} />
    </div>
  );
}

/** The real bracket as scrollable round columns, plus third place + champion area. */
export function ActualBracket({ matches }: { matches: ActualKoMatch[] }) {
  const byStage = new Map<KoStage, ActualKoMatch[]>();
  for (const m of matches) {
    const arr = byStage.get(m.stage) ?? [];
    arr.push(m);
    byStage.set(m.stage, arr);
  }
  const final = byStage.get("F")?.[0];
  const thirdPlace = byStage.get("TP")?.[0];

  return (
    <div className="space-y-4">
      <p className="mb-1.5 text-right text-[11px] text-muted sm:hidden">
        swipe to follow the bracket →
      </p>
      <div className="snap-x snap-mandatory overflow-x-auto rounded-2xl border border-border bg-surface/40 p-4 sm:snap-none">
        <div className="flex min-w-max gap-6">
          {COLUMNS.map((c) => (
            <Column
              key={c.stage}
              title={c.title}
              matches={byStage.get(c.stage) ?? []}
            />
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ChampionArea final={final} />
        <ThirdPlace tp={thirdPlace} />
      </div>
    </div>
  );
}
