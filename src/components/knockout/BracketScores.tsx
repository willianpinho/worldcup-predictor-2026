import { CONDITION_META } from "@/lib/conditions";
import type { ActualKoMatch } from "@/lib/knockout/actual";
import { KNOCKOUT_RUNS } from "@/lib/knockout/runs";
import type { KnockoutModel } from "@/lib/knockout/schema";
import {
  CHAMPION_POINTS,
  MAX_BRACKET_POINTS,
  scoreBracket,
} from "@/lib/knockout/scoring";

const MODEL_META: Record<KnockoutModel, { name: string; color: string }> = {
  claude: { name: "Claude", color: "text-claude" },
  gemini: { name: "Gemini", color: "text-gemini" },
  openai: { name: "OpenAI", color: "text-openai" },
};

/**
 * Bracket-pool scoring of every recorded predicted bracket against the real
 * knockout: 1/2/4/8/16 points per correctly placed team per stage + 32 for the
 * champion (max 192). Shows zeros until the real round of 32 is set.
 */
export function BracketScores({ real }: { real: ActualKoMatch[] }) {
  if (KNOCKOUT_RUNS.length === 0) return null;

  const rows = KNOCKOUT_RUNS.map((run) => ({
    run,
    score: scoreBracket(run, real),
  })).sort((a, b) => b.score.total - a.score.total);

  const anythingKnown = rows.some((r) =>
    r.score.perStage.some((s) => s.known > 0),
  );

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold">Bracket scoring</h2>
      <p className="mt-1 text-xs text-muted">
        Each predicted bracket earns points per team correctly placed in the
        real stage: R32 ×1 · R16 ×2 · QF ×4 · SF ×8 · Final ×16 · Champion{" "}
        {CHAMPION_POINTS} — max {MAX_BRACKET_POINTS}.
        {!anythingKnown &&
          " Scoring starts once the real round of 32 is set (28 June)."}
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-muted">
              <th className="px-1 py-1 text-left font-medium">Bracket</th>
              {rows[0].score.perStage.map((s) => (
                <th key={s.stage} className="px-1 py-1 text-center font-medium">
                  {s.label}
                </th>
              ))}
              <th className="px-1 py-1 text-center font-medium">Champ</th>
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
                {score.perStage.map((s) => (
                  <td
                    key={s.stage}
                    className="px-1 py-1.5 text-center font-mono tabular-nums text-muted"
                  >
                    {s.known > 0 ? s.points : "—"}
                  </td>
                ))}
                <td className="px-1 py-1.5 text-center font-mono tabular-nums text-muted">
                  {score.championCorrect === null
                    ? "—"
                    : score.championCorrect
                      ? CHAMPION_POINTS
                      : 0}
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
