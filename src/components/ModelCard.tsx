import type { ModelSummary } from "@/lib/scoring";
import type { ModelId } from "@/lib/queries";

const META: Record<ModelId, { name: string; color: string; ring: string }> = {
  claude: { name: "Claude", color: "text-claude", ring: "ring-claude/40" },
  gemini: { name: "Gemini", color: "text-gemini", ring: "ring-gemini/40" },
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
        <h2 className={`text-xl font-semibold ${meta.color}`}>{meta.name}</h2>
        {leading && (
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
            na frente
          </span>
        )}
      </div>

      <div className="mb-4">
        <div className="font-mono text-4xl font-bold">{summary.points}</div>
        <div className="text-xs text-muted">pontos · {predicted} palpites enviados</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Placares exatos" value={String(summary.exact)} />
        <Stat label="Resultados certos" value={String(summary.outcomeHits)} />
        <Stat label="Aproveitamento" value={`${summary.accuracyPct.toFixed(1)}%`} />
        <Stat
          label="Acerto de resultado"
          value={`${summary.outcomeAccuracyPct.toFixed(1)}%`}
        />
        <Stat
          label="Brier (calibração ↓)"
          value={summary.avgBrier === null ? "—" : summary.avgBrier.toFixed(3)}
        />
        <Stat label="Jogos pontuados" value={String(summary.played)} />
      </div>
    </div>
  );
}
