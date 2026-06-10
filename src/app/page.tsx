import Link from "next/link";
import { ConditionTabs } from "@/components/ConditionTabs";
import { ModelCard } from "@/components/ModelCard";
import { CONDITION_META, CONDITIONS, parseArm } from "@/lib/conditions";
import { pointsBadgeClass } from "@/lib/format";
import { getLeaderboard, MODELS } from "@/lib/queries";

const SCORING = [
  { p: 5, label: "Exact score" },
  { p: 3, label: "Correct result + one exact side" },
  { p: 2, label: "Correct result only (W/D/L)" },
  { p: 0, label: "Wrong result" },
];

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise and must be awaited.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { arm: rawArm } = await searchParams;
  const arm = parseArm(rawArm);
  const lb = await getLeaderboard(arm);

  const anyScored =
    lb.playedMatches > 0 && MODELS.some((m) => lb.summary[m].played > 0);
  const maxPoints = Math.max(...MODELS.map((m) => lb.summary[m].points));

  const pct = lb.totalMatches
    ? Math.round((lb.playedMatches / lb.totalMatches) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold sm:text-3xl">
          Which AI predicts the 2026 World Cup better?
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Claude, Gemini and OpenAI each predict all 72 group-stage matches. As
          the real results come in, every correct call scores points. The Brier
          score measures how well each model&apos;s probabilities are calibrated
          — lower is better.
        </p>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted">Group stage progress</span>
          <span className="font-mono">
            {lb.playedMatches}/{lb.totalMatches} matches
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      <section className="space-y-3">
        <ConditionTabs path="/" current={arm} />
        <p className="text-sm text-muted">{CONDITION_META[arm].description}</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {MODELS.map((model) => (
            <ModelCard
              key={model}
              model={model}
              summary={lb.summary[model]}
              predicted={lb.predictedMatches[model]}
              leading={
                anyScored &&
                maxPoints > 0 &&
                lb.summary[model].points === maxPoints
              }
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        <h3 className="mb-3 font-semibold text-foreground">
          How scoring works
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {SCORING.map(({ p, label }) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`inline-flex h-6 w-9 items-center justify-center rounded font-mono text-xs ${pointsBadgeClass(p)}`}
              >
                +{p}
              </span>
              {label}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Experiment design</h3>
          <Link href="/prompt" className="text-xs text-accent hover:underline">
            See the prompts →
          </Link>
        </div>
        <ul className="space-y-2">
          {CONDITIONS.map((c) => (
            <li key={c} className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-medium text-foreground">
                {CONDITION_META[c].label}
              </span>
              <span>— {CONDITION_META[c].description}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
