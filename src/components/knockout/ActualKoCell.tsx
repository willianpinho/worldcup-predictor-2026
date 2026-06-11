import { flagCode } from "@/lib/flags";
import { cityLabel, formatShortDate } from "@/lib/format";
import type { ActualKoMatch } from "@/lib/knockout/actual";
import { isPlaceholder, prettyPlaceholder } from "@/lib/knockout/placeholder";

function Flag({ team }: { team: string }) {
  // Placeholders ("2A", "W73") are not nations — no flag for them.
  const code = isPlaceholder(team) ? null : flagCode(team);
  if (!code)
    return (
      <span
        className="size-3 shrink-0 rounded-[2px] bg-surface-2"
        aria-hidden
      />
    );
  return (
    <span
      className={`fi fi-${code} size-3 shrink-0 rounded-[2px]`}
      aria-hidden
    />
  );
}

function Side({
  team,
  score,
  isWinner,
}: {
  team: string;
  score: number | null;
  isWinner: boolean;
}) {
  const label = prettyPlaceholder(team);
  const placeholder = isPlaceholder(team);
  return (
    <div
      className={`flex items-center gap-1.5 ${
        isWinner
          ? "font-semibold text-accent"
          : placeholder
            ? "italic text-muted/70"
            : "text-muted"
      }`}
    >
      <Flag team={team} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {score !== null && (
        <span className="ml-1 font-mono tabular-nums">{score}</span>
      )}
    </div>
  );
}

/** Penalty annotation, e.g. "(4–2 p)", shown only when a shootout was recorded. */
function pensNote(m: ActualKoMatch): string | null {
  if (m.pensA === null || m.pensB === null) return null;
  return `(${m.pensA}–${m.pensB} p)`;
}

/** One real knockout fixture: teams (or placeholders), date + city, live/final score. */
export function ActualKoCell({ m }: { m: ActualKoMatch }) {
  const finished = m.status === "FINISHED";
  const aWon =
    finished && m.scoreA !== null && m.scoreB !== null
      ? m.pensA !== null && m.pensB !== null
        ? m.pensA > m.pensB
        : m.scoreA > m.scoreB
      : false;
  const bWon = finished && !aWon && m.scoreA !== null && m.scoreB !== null;
  const note = pensNote(m);
  const city = cityLabel(m.city);

  return (
    <div className="w-44 shrink-0 rounded-lg border border-border bg-surface px-2.5 py-2 text-xs">
      <Side team={m.teamA} score={m.scoreA} isWinner={aWon} />
      <Side team={m.teamB} score={m.scoreB} isWinner={bWon} />
      <div className="mt-1 flex items-center justify-between gap-1 text-[10px] text-muted">
        <span className="truncate">
          {formatShortDate(m.kickoff)}
          {city ? ` · ${city}` : ""}
        </span>
        {note && <span className="shrink-0">{note}</span>}
      </div>
    </div>
  );
}
