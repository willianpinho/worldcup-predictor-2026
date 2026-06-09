import type { Metadata } from "next";
import { CopyButton } from "@/components/CopyButton";
import { formatRunTimestamp } from "@/lib/format";
import { PREDICTION_PROMPT } from "@/lib/prompt";
import { importableJson, MODEL_RUNS } from "@/lib/runs";

export const metadata: Metadata = {
  title: "Prompt — World Cup Predictor 2026",
};

const MODEL_LABEL: Record<string, string> = {
  claude: "Claude",
  gemini: "Gemini",
};

export default function PromptPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">The prompt</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          The exact instruction given to both Claude and Gemini. Each model returns
          JSON only, which is pasted into <span className="font-mono">/admin</span> to
          score the pool. For Gemini, change{" "}
          <span className="font-mono">&quot;model&quot;: &quot;claude&quot;</span> to{" "}
          <span className="font-mono">&quot;model&quot;: &quot;gemini&quot;</span>.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-xs text-muted">prediction prompt</span>
          <CopyButton text={PREDICTION_PROMPT} />
        </div>
        <pre className="overflow-x-auto whitespace-pre-wrap px-4 py-4 font-mono text-xs leading-relaxed text-foreground">
          {PREDICTION_PROMPT}
        </pre>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        <h2 className="mb-2 font-semibold text-foreground">Why these signals</h2>
        <p>
          The prompt asks each model to reason from squad strength, recent form,
          availability, tactics, head-to-head, venue context (altitude, heat, travel),
          host advantage, and market odds — then commit to a scoreline and calibrated
          win/draw/loss probabilities. The Brier score on the leaderboard rewards honest
          probabilities, not just correct calls.
        </p>
      </div>

      {MODEL_RUNS.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">Model runs</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              The exact JSON each model returned for the prompt above — the output that
              feeds <span className="font-mono">/admin</span> → Import. Copy a run to
              re-import it, or expand to inspect all 72 predictions.
            </p>
          </div>

          {MODEL_RUNS.map((run) => {
            const json = importableJson(run);
            return (
              <div
                key={`${run.model}-${run.generatedAt}`}
                className="overflow-hidden rounded-2xl border border-border bg-surface"
              >
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-md bg-surface-2 px-2 py-0.5 font-medium text-foreground">
                      {MODEL_LABEL[run.model] ?? run.model}
                    </span>
                    <span className="text-muted">{run.engine}</span>
                    <span className="text-muted">·</span>
                    <span className="text-muted">
                      {formatRunTimestamp(run.generatedAt)}
                    </span>
                    <span className="text-muted">·</span>
                    <span className="text-muted">
                      {run.predictions.length} matches
                    </span>
                  </div>
                  <CopyButton text={json} />
                </div>
                <details>
                  <summary className="cursor-pointer px-4 py-2 text-xs text-muted transition-colors hover:text-foreground">
                    Show JSON output
                  </summary>
                  <pre className="overflow-x-auto whitespace-pre-wrap border-t border-border px-4 py-4 font-mono text-xs leading-relaxed text-foreground">
                    {json}
                  </pre>
                </details>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
