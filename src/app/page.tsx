import { ModelCard } from "@/components/ModelCard";
import { getLeaderboard } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const lb = await getLeaderboard();
  const { claude, gemini } = lb.summary;

  const bothScored = claude.played > 0 || gemini.played > 0;
  const claudeLeads = bothScored && claude.points > gemini.points;
  const geminiLeads = bothScored && gemini.points > claude.points;

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
          Claude and Gemini predict all 72 group-stage matches. As the real results
          come in, every correct call scores points. The Brier score measures how well
          each model&apos;s probabilities are calibrated — lower is better.
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
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <ModelCard
          model="claude"
          summary={claude}
          predicted={lb.predictedMatches.claude}
          leading={claudeLeads}
        />
        <ModelCard
          model="gemini"
          summary={gemini}
          predicted={lb.predictedMatches.gemini}
          leading={geminiLeads}
        />
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        <h3 className="mb-2 font-semibold text-foreground">How scoring works</h3>
        <ul className="grid gap-1 sm:grid-cols-2">
          <li>🎯 Exact score — 5 pts</li>
          <li>✅ Correct result + one exact side — 3 pts</li>
          <li>➖ Correct result only (W/D/L) — 2 pts</li>
          <li>❌ Wrong result — 0 pts</li>
        </ul>
      </section>
    </div>
  );
}
