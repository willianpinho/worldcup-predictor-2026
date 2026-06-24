import { flagCode } from "@/lib/flags";
import {
  formatDayHeader,
  formatKickoff,
  pointsBadgeClass,
  utcDayKey,
} from "@/lib/format";
import {
  MODELS,
  type MatchView,
  type ModelId,
  type PredView,
} from "@/lib/queries";

const PRED_META: Record<
  ModelId,
  { name: string; color: string; label: string }
> = {
  claude: { name: "Claude", color: "text-claude", label: "C" },
  gemini: { name: "Gemini", color: "text-gemini", label: "G" },
  openai: { name: "OpenAI", color: "text-openai", label: "O" },
};

function Flag({ team }: { team: string }) {
  const code = flagCode(team);
  if (!code) return null;
  return (
    <span className={`fi fi-${code} shrink-0 rounded-[2px]`} aria-hidden />
  );
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
  const finished =
    m.status === "FINISHED" && m.scoreA !== null && m.scoreB !== null;
  const reasonings = MODELS.map((model) => ({
    model,
    pred: m.predictions[model],
  })).filter((x): x is { model: ModelId; pred: PredView } =>
    Boolean(x.pred?.reasoning),
  );

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted">
            {formatKickoff(m.kickoff)} · Group {m.groupName} · round {m.round}
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
        <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1.5 sm:flex-col sm:gap-1">
          {MODELS.map((model) => (
            <PredCell key={model} model={model} pred={m.predictions[model]} />
          ))}
        </div>
      </div>

      {reasonings.length > 0 && (
        <details className="group mt-3 border-t border-border/60 pt-2">
          <summary className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted hover:text-foreground">
            <span className="transition-transform group-open:rotate-90">▸</span>
            Reasoning
          </summary>
          <ul className="mt-2 space-y-2 text-xs leading-relaxed text-muted">
            {reasonings.map(({ model, pred }) => (
              <li key={model} className="flex gap-2">
                <span
                  className={`shrink-0 font-bold ${PRED_META[model].color}`}
                >
                  {PRED_META[model].label}
                </span>
                <span>
                  <span className="font-mono text-foreground">
                    {pred.predA}–{pred.predB}
                  </span>
                  {pred.confidence ? (
                    <span className="ml-1 text-muted">({pred.confidence})</span>
                  ) : null}
                  {" — "}
                  {pred.reasoning}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

interface MatchDay {
  key: string;
  date: Date;
  matches: MatchView[];
}

/** Group matches into calendar days (UTC), each day ordered by kickoff. */
function groupByDay(matches: MatchView[]): MatchDay[] {
  const sorted = [...matches].sort(
    (a, b) => a.kickoff.getTime() - b.kickoff.getTime(),
  );
  const days = new Map<string, MatchDay>();
  for (const m of sorted) {
    const key = utcDayKey(m.kickoff);
    const day = days.get(key);
    if (day) {
      day.matches.push(m);
    } else {
      days.set(key, { key, date: m.kickoff, matches: [m] });
    }
  }
  return [...days.values()];
}

export function MatchList({ matches }: { matches: MatchView[] }) {
  const days = groupByDay(matches);
  return (
    <div className="space-y-8">
      {days.map((day) => (
        <section key={day.key}>
          <h2 className="mb-3 border-l-2 border-accent pl-2.5 text-lg font-semibold">
            {formatDayHeader(day.date)}
          </h2>
          <div className="space-y-2">
            {day.matches.map((m) => (
              <MatchCard key={m.id} m={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
