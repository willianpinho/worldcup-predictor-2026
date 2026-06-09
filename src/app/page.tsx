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
          Qual IA prevê melhor a Copa 2026?
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Claude e Gemini palpitam os 72 jogos da fase de grupos. Conforme os
          resultados reais chegam, cada acerto vira ponto. O Brier score mede a
          calibração das probabilidades — menor é melhor.
        </p>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted">Progresso da fase de grupos</span>
          <span className="font-mono">
            {lb.playedMatches}/{lb.totalMatches} jogos
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
        <h3 className="mb-2 font-semibold text-foreground">Como pontua</h3>
        <ul className="grid gap-1 sm:grid-cols-2">
          <li>🎯 Placar exato — 5 pts</li>
          <li>✅ Resultado certo + 1 placar parcial — 3 pts</li>
          <li>➖ Só o resultado (V/E/D) — 2 pts</li>
          <li>❌ Errou o resultado — 0 pts</li>
        </ul>
      </section>
    </div>
  );
}
