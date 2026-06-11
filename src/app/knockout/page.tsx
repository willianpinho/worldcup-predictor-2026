import type { Metadata } from "next";
import { ActualBracket } from "@/components/knockout/ActualBracket";
import { Bracket } from "@/components/knockout/Bracket";
import { ChampionBanner } from "@/components/knockout/ChampionBanner";
import { ModelTabs } from "@/components/knockout/ModelTabs";
import { QualificationSummary } from "@/components/knockout/QualificationSummary";
import { formatRunTimestamp } from "@/lib/format";
import { getKnockoutMatches } from "@/lib/knockout/actual";
import { getKnockoutRun } from "@/lib/knockout/runs";
import type { KnockoutModel } from "@/lib/knockout/schema";
import { type KnockoutView, resolveView } from "@/lib/knockout/view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Knockout bracket — World Cup Predictor 2026",
};

const LABEL: Record<KnockoutModel, string> = {
  claude: "Claude",
  gemini: "Gemini",
  openai: "OpenAI",
};

const ACTUAL_SUBTITLE =
  "Official bracket — fills in as the tournament progresses. Results sync automatically.";
const PREDICTED_SUBTITLE =
  "Each model derives its 32 qualifiers from its own group-stage scorelines, then predicts every tie — Round of 32 to the final. Bracket structure is the model's own claim; internal consistency is validated by the app.";

async function ActualView() {
  const matches = await getKnockoutMatches();
  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center">
        <p className="text-sm text-muted">Knockout fixtures not seeded yet.</p>
      </div>
    );
  }
  return <ActualBracket matches={matches} />;
}

function PredictedView({ model }: { model: KnockoutModel }) {
  const run = getKnockoutRun(model);
  if (!run) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center">
        <p className="text-sm text-muted">
          Knockout predictions for {LABEL[model]} haven&apos;t been generated
          yet.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="text-xs text-muted">
        {run.engine} · {formatRunTimestamp(run.generatedAt)}
      </div>
      <ChampionBanner run={run} />
      <QualificationSummary qualification={run.qualification} />
      <Bracket run={run} />
    </div>
  );
}

// Next 16: searchParams is a Promise (confirmed in next/dist/docs) — await it.
export default async function KnockoutPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const view: KnockoutView = resolveView((await searchParams).model);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Knockout bracket</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          {view === "actual" ? ACTUAL_SUBTITLE : PREDICTED_SUBTITLE}
        </p>
      </div>

      <ModelTabs active={view} />

      {view === "actual" ? <ActualView /> : <PredictedView model={view} />}
    </div>
  );
}
