import type { IconType } from "react-icons";
import { SiAnthropic, SiGooglegemini, SiOpenai } from "react-icons/si";
import type { ModelId } from "@/lib/queries";
import type { ModelSummary } from "@/lib/scoring";

const META: Record<
  ModelId,
  { name: string; color: string; ring: string; Icon: IconType }
> = {
  claude: { name: "Claude", color: "text-claude", ring: "ring-claude/40", Icon: SiAnthropic },
  gemini: { name: "Gemini", color: "text-gemini", ring: "ring-gemini/40", Icon: SiGooglegemini },
  openai: { name: "OpenAI", color: "text-openai", ring: "ring-openai/40", Icon: SiOpenai },
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}

export function ModelCard({
  model,
  summary,
  predicted,
  leading,
}: {
  model: ModelId;
  summary: ModelSummary;
  predicted: number;
  leading: boolean;
}) {
  const meta = META[model];
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-5 ring-1 ${
        leading ? meta.ring : "ring-transparent"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <meta.Icon className={`text-xl ${meta.color}`} aria-hidden />
          <h2 className={`text-xl font-semibold ${meta.color}`}>{meta.name}</h2>
        </div>
        {leading && (
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
            leading
          </span>
        )}
      </div>

      <div className="mb-4">
        <div className="font-mono text-4xl font-bold">{summary.points}</div>
        <div className="text-xs text-muted">
          points · {predicted} predictions submitted
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Exact scores" value={String(summary.exact)} />
        <Stat label="Correct results" value={String(summary.outcomeHits)} />
        <Stat label="Points accuracy" value={`${summary.accuracyPct.toFixed(1)}%`} />
        <Stat
          label="Result accuracy"
          value={`${summary.outcomeAccuracyPct.toFixed(1)}%`}
        />
        <Stat
          label="Brier (calibration ↓)"
          value={summary.avgBrier === null ? "—" : summary.avgBrier.toFixed(3)}
        />
        <Stat label="Scored matches" value={String(summary.played)} />
      </div>
    </div>
  );
}
