import { CONDITION_META } from "@/lib/conditions";
import type { ActualKoMatch } from "@/lib/knockout/actual";
import { REAL_KNOCKOUT_RUNS } from "@/lib/knockout-real/runs";
import type { RealKnockoutModel } from "@/lib/knockout-real/schema";
import {
  CHAMPION_POINTS,
  EXACT_SCORE_POINTS,
  scoreRealBracket,
} from "@/lib/knockout-real/scoring";

const MODEL_META: Record<RealKnockoutModel, { name: string; color: string }> = {
  claude: { name: "Claude", color: "text-claude" },
  gemini: { name: "Gemini", color: "text-gemini" },
  openai: { name: "OpenAI", color: "text-openai" },
};

/**
 * Stage-2 head-to-head scoreboard. Because every model fills the SAME official R32 draw, ties
 * are directly comparable: exact score = {EXACT_SCORE_POINTS}, correct winner = 3. Survival is
 * the Stage-1-style points (R32×1…Champion×{CHAMPION_POINTS}). `total` sums both.
 */
export function RealScoreboard({ real }: { real: ActualKoMatch[] }) {
  if (REAL_KNOCKOUT_RUNS.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-surface/40 p-6 text-center">
        <p className="text-sm text-muted">
          Stage-2 brackets not recorded yet. Generate them with{" "}
          <span className="font-mono text-xs">
            scripts/run-knockout-real.ts
          </span>{" "}
          and they appear here, scored per tie against the real bracket.
        </p>
      </section>
    );
  }

  const rows = REAL_KNOCKOUT_RUNS.map((run) => ({
    run,
    score: scoreRealBracket(run, real),
  })).sort((a, b) => b.score.total - a.score.total);

  const anyFinished = rows.some((r) => r.score.ties.scored > 0);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold">Stage-2 scoreboard</h2>
      <p className="mt-1 text-xs text-muted">
        Every bracket fills the same official Round-of-32 draw, so ties are
        compared head-to-head: exact score {EXACT_SCORE_POINTS}, correct winner
        3. Survival adds the Stage-1-style stage points (Champion{" "}
        {CHAMPION_POINTS}).
        {!anyFinished && " Scoring starts once the Round of 32 kicks off."}
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[30rem] border-collapse text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-muted">
              <th className="px-1 py-1 text-left font-medium">Bracket</th>
              <th className="px-1 py-1 text-center font-medium">Ties scored</th>
              <th className="px-1 py-1 text-center font-medium">Winners</th>
              <th className="px-1 py-1 text-center font-medium">Exact</th>
              <th className="px-1 py-1 text-center font-medium">Tie pts</th>
              <th className="px-1 py-1 text-center font-medium">Survival</th>
              <th className="px-1 py-1 text-center font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ run, score }) => (
              <tr
                key={`${run.model}-${run.condition}`}
                className="border-t border-border/40"
              >
                <td className="px-1 py-1.5">
                  <span
                    className={`font-semibold ${MODEL_META[run.model].color}`}
                  >
                    {MODEL_META[run.model].name}
                  </span>{" "}
                  <span className="text-muted">
                    · {CONDITION_META[run.condition].label.toLowerCase()}
                  </span>
                </td>
                <td className="px-1 py-1.5 text-center font-mono tabular-nums text-muted">
                  {score.ties.scored || "—"}
                </td>
                <td className="px-1 py-1.5 text-center font-mono tabular-nums text-muted">
                  {score.ties.scored ? score.ties.winnersCorrect : "—"}
                </td>
                <td className="px-1 py-1.5 text-center font-mono tabular-nums text-muted">
                  {score.ties.scored ? score.ties.exactCorrect : "—"}
                </td>
                <td className="px-1 py-1.5 text-center font-mono tabular-nums text-muted">
                  {score.ties.scored ? score.ties.points : "—"}
                </td>
                <td className="px-1 py-1.5 text-center font-mono tabular-nums text-muted">
                  {anyFinished ? score.survival.total : "—"}
                </td>
                <td className="px-1 py-1.5 text-center font-mono font-semibold tabular-nums text-foreground">
                  {score.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
