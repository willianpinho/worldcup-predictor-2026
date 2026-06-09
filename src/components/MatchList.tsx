import { formatKickoff, pointsBadgeClass } from "@/lib/format";
import type { MatchView, ModelId, PredView } from "@/lib/queries";

function PredCell({ model, pred }: { model: ModelId; pred: PredView | null }) {
  const color = model === "claude" ? "text-claude" : "text-gemini";
  const label = model === "claude" ? "C" : "G";
  return (
    <div className="flex items-center gap-2">
      <span className={`w-4 text-center text-xs font-bold ${color}`}>{label}</span>
      {pred ? (
        <>
          <span className="font-mono text-sm">
            {pred.predA}–{pred.predB}
          </span>
          {pred.points !== null && (
            <span
              className={`rounded px-1.5 py-0.5 text-xs font-medium ${pointsBadgeClass(pred.points)}`}
            >
              +{pred.points}
            </span>
          )}
        </>
      ) : (
        <span className="text-xs text-muted">sem palpite</span>
      )}
    </div>
  );
}

function MatchCard({ m }: { m: MatchView }) {
  const finished = m.status === "FINISHED" && m.scoreA !== null && m.scoreB !== null;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted">
          {formatKickoff(m.kickoff)} · rodada {m.round}
          {m.city ? ` · ${m.city}` : ""}
        </div>
        <div className="mt-1 flex items-center gap-2 font-medium">
          <span className="truncate">{m.teamA}</span>
          <span className="shrink-0 rounded bg-surface-2 px-2 py-0.5 font-mono text-sm">
            {finished ? `${m.scoreA} – ${m.scoreB}` : "vs"}
          </span>
          <span className="truncate">{m.teamB}</span>
          {m.status === "LIVE" && (
            <span className="shrink-0 rounded-full bg-rose-500/20 px-2 py-0.5 text-xs text-rose-300">
              ao vivo
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-5 sm:flex-col sm:gap-1">
        <PredCell model="claude" pred={m.predictions.claude} />
        <PredCell model="gemini" pred={m.predictions.gemini} />
      </div>
    </div>
  );
}

export function MatchList({ matches }: { matches: MatchView[] }) {
  const groups = [...new Set(matches.map((m) => m.groupName))].sort();
  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g}>
          <h2 className="mb-3 text-lg font-semibold">
            Grupo <span className="text-accent">{g}</span>
          </h2>
          <div className="space-y-2">
            {matches
              .filter((m) => m.groupName === g)
              .map((m) => (
                <MatchCard key={m.id} m={m} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
