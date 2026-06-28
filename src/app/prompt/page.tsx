import type { Metadata } from "next";
import { CopyButton } from "@/components/CopyButton";
import { CONDITION_META } from "@/lib/conditions";
import { formatRunTimestamp } from "@/lib/format";
import { PREDICTION_PROMPT } from "@/lib/prompt";
import { importableJson, MODEL_RUNS } from "@/lib/runs";

export const metadata: Metadata = {
  title: "Prompt — World Cup Predictor 2026",
};

const MODEL_LABEL: Record<string, string> = {
  claude: "Claude",
  gemini: "Gemini",
  openai: "OpenAI",
};

const PROMPT_DOCS = [
  { file: "docs/PROMPT.md", label: "Group stage (web arm)" },
  { file: "docs/PROMPT-ENRICHED.md", label: "API arms (baseline + enriched)" },
  {
    file: "docs/PROMPT-KNOCKOUT.md",
    label: "Knockout bracket (Stage 1, self-conditioned)",
  },
  {
    file: "docs/PROMPT-KNOCKOUT-REAL.md",
    label: "Knockout II (Stage 2, ground-truth-conditioned)",
  },
];

export default function PromptPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">The prompt</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          The exact instruction given to Claude, Gemini and OpenAI. Each model
          returns JSON only, which is pasted into{" "}
          <span className="font-mono">/admin</span> to score the pool. Set{" "}
          <span className="font-mono">&quot;model&quot;</span> to{" "}
          <span className="font-mono">&quot;claude&quot;</span>,{" "}
          <span className="font-mono">&quot;gemini&quot;</span> or{" "}
          <span className="font-mono">&quot;openai&quot;</span> per AI.
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
        <h2 className="mb-2 font-semibold text-foreground">
          Full methodology, in the open
        </h2>
        <p>
          Every prompt variant, the standardized context dataset, the runner
          scripts and every raw model run are versioned in the public
          repository:
        </p>
        <ul className="mt-2 space-y-1">
          {PROMPT_DOCS.map((d) => (
            <li key={d.file}>
              <a
                href={`https://github.com/willianpinho/worldcup-predictor-2026/blob/master/${d.file}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-foreground underline decoration-border underline-offset-2 hover:text-accent"
              >
                {d.file}
              </a>{" "}
              — {d.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        <h2 className="mb-2 font-semibold text-foreground">
          Why these signals
        </h2>
        <p>
          The prompt asks each model to reason from squad strength, recent form,
          availability, tactics, head-to-head, venue context (altitude, heat,
          travel), host advantage, and market odds — then commit to a scoreline
          and calibrated win/draw/loss probabilities. The Brier score on the
          leaderboard rewards honest probabilities, not just correct calls.
        </p>
      </div>

      {MODEL_RUNS.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold">Model runs</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              The exact JSON each model returned for the prompt above — the
              output that feeds <span className="font-mono">/admin</span> →
              Import. Copy a run to re-import it, or expand to inspect all 72
              predictions.
            </p>
          </div>

          {MODEL_RUNS.map((run) => {
            const json = importableJson(run);
            return (
              <div
                key={`${run.model}-${run.condition}-${run.generatedAt}`}
                className="overflow-hidden rounded-2xl border border-border bg-surface"
              >
                <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-2">
                  {/* Wraps + truncates: engine labels are long and must not push the
                      card past narrow viewports. */}
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <span className="rounded-md bg-surface-2 px-2 py-0.5 font-medium text-foreground">
                      {MODEL_LABEL[run.model] ?? run.model}
                    </span>
                    <span className="rounded-md bg-accent/15 px-2 py-0.5 font-medium text-accent">
                      {CONDITION_META[run.condition].label}
                    </span>
                    <span className="max-w-full truncate text-muted">
                      {run.engine}
                    </span>
                    <span className="text-muted">
                      {formatRunTimestamp(run.generatedAt)} ·{" "}
                      {run.predictions.length} matches
                    </span>
                  </div>
                  <span className="shrink-0">
                    <CopyButton text={json} />
                  </span>
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
