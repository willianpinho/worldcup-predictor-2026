import { flagCode } from "@/lib/flags";
import { formatKickoff, pointsBadgeClass } from "@/lib/format";
import { MODELS, type MatchView, type ModelId, type PredView } from "@/lib/queries";

const PRED_META: Record<ModelId, { color: string; label: string }> = {
  claude: { color: "text-claude", label: "C" },
  gemini: { color: "text-gemini", label: "G" },
  openai: { color: "text-openai", label: "O" },
};

function Flag({ team }: { team: string }) {
  const code = flagCode(team);
  if (!code) return null;
  return <span className={`fi fi-${code} shrink-0 rounded-[2px]`} aria-hidden />;
}

function Team({ name, align }: { name: string; align: "left" | "right" }) {
  return (
    <span
      className={`flex min-w-0 items-center gap-1.5 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <Flag team={name} />
      <span className="truncate">{name}</span>
    </span>
  );
}

function PredCell({ model, pred }: { model: ModelId; pred: PredView | null }) {
  const meta = PRED_META[model];
  return (
    <div className="flex items-center gap-2">
      <span className={`w-4 text-center text-xs font-bold ${meta.color}`}>
        {meta.label}
      </span>
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
        <span className="text-xs text-muted">—</span>
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
          {formatKickoff(m.kickoff)} · round {m.round}
          {m.city ? ` · ${m.city}` : ""}
        </div>
        <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 font-medium">
          <Team name={m.teamA} align="left" />
          <span className="shrink-0 rounded bg-surface-2 px-2 py-0.5 font-mono text-sm">
            {finished ? `${m.scoreA} – ${m.scoreB}` : "vs"}
          </span>
          <Team name={m.teamB} align="right" />
        </div>
        {m.status === "LIVE" && (
          <span className="mt-1 inline-block rounded-full bg-rose-500/20 px-2 py-0.5 text-xs text-rose-300">
            live
          </span>
        )}
      </div>
      <div className="flex shrink-0 gap-5 sm:flex-col sm:gap-1">
        {MODELS.map((model) => (
          <PredCell key={model} model={model} pred={m.predictions[model]} />
        ))}
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
            Group <span className="text-accent">{g}</span>
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
