import { flagCode } from "@/lib/flags";
import { normalizeTeam } from "@/lib/teams";
import type { KoMatch } from "@/lib/knockout/schema";

function Flag({ team }: { team: string }) {
  const code = flagCode(team);
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
  score: number;
  isWinner: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 ${
        isWinner ? "font-semibold text-accent" : "text-muted"
      }`}
    >
      <Flag team={team} />
      <span className="min-w-0 flex-1 truncate">{team}</span>
      <span className="ml-1 font-mono tabular-nums">{score}</span>
    </div>
  );
}

/** Penalty / extra-time annotation, e.g. "a.e.t." or "1–1 (4–2 p)". */
function decisionNote(m: KoMatch): string | null {
  if (
    m.decidedBy === "penalties" &&
    m.pensA !== undefined &&
    m.pensB !== undefined
  ) {
    return `${m.scoreA}–${m.scoreB} (${m.pensA}–${m.pensB} p)`;
  }
  if (m.decidedBy === "extra-time") return "a.e.t.";
  return null;
}

export function KoMatchCell({ m }: { m: KoMatch }) {
  const winnerIsA = normalizeTeam(m.winner) === normalizeTeam(m.teamA);
  const note = decisionNote(m);
  return (
    <div className="w-44 shrink-0 rounded-lg border border-border bg-surface px-2.5 py-2 text-xs">
      <Side team={m.teamA} score={m.scoreA} isWinner={winnerIsA} />
      <Side team={m.teamB} score={m.scoreB} isWinner={!winnerIsA} />
      {note && (
        <div className="mt-1 text-right text-[10px] text-muted">{note}</div>
      )}
    </div>
  );
}
