import { CONDITION_META } from "@/lib/conditions";
import {
  type GroupRun,
  scoreRetrospective,
} from "@/lib/knockout-real/retrospective";
import type { RealKnockoutModel } from "@/lib/knockout-real/schema";
import { MODEL_RUNS } from "@/lib/runs";

const MODEL_META: Record<RealKnockoutModel, { name: string; color: string }> = {
  claude: { name: "Claude", color: "text-claude" },
  gemini: { name: "Gemini", color: "text-gemini" },
  openai: { name: "OpenAI", color: "text-openai" },
};

/**
 * Group-stage retrospective: each Stage-1 group run scored against the REAL finished group
 * stage — group winners called (/12) and real qualifiers it had advancing (/32). This is the
 * "what actually happened in the groups" analysis that also seeds the Stage-2 predictions.
 */
export function Retrospective() {
  const rows = MODEL_RUNS.map((run) =>
    scoreRetrospective(run as GroupRun),
  ).sort(
    (a, b) =>
      b.groupWinnersCorrect - a.groupWinnersCorrect ||
      b.qualifiersCorrect - a.qualifiersCorrect,
  );
  if (rows.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <h2 className="text-sm font-semibold">Group-stage retrospective</h2>
      <p className="mt-1 text-xs text-muted">
        How each model&apos;s group-stage predictions (Stage 1) held up against
        the real finished group stage — group winners called and real qualifiers
        it had advancing. The real outcomes (FIFA) are the same starting point
        every Stage-2 bracket below is built on.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[26rem] border-collapse text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-muted">
              <th className="px-1 py-1 text-left font-medium">Run</th>
              <th className="px-1 py-1 text-center font-medium">
                Group winners
              </th>
              <th className="px-1 py-1 text-center font-medium">Qualifiers</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={`${r.model}-${r.condition}`}
                className="border-t border-border/40"
              >
                <td className="px-1 py-1.5">
                  <span
                    className={`font-semibold ${MODEL_META[r.model].color}`}
                  >
                    {MODEL_META[r.model].name}
                  </span>{" "}
                  <span className="text-muted">
                    · {CONDITION_META[r.condition].label.toLowerCase()}
                  </span>
                </td>
                <td className="px-1 py-1.5 text-center font-mono tabular-nums text-foreground">
                  {r.groupWinnersCorrect}
                  <span className="text-muted">/{r.groupsKnown}</span>
                </td>
                <td className="px-1 py-1.5 text-center font-mono tabular-nums text-foreground">
                  {r.qualifiersCorrect}
                  <span className="text-muted">/32</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
