import type { Metadata } from "next";
import { ActualBracket } from "@/components/knockout/ActualBracket";
import { ArmTabs } from "@/components/knockout/ArmTabs";
import { Bracket } from "@/components/knockout/Bracket";
import { BracketScores } from "@/components/knockout/BracketScores";
import { ChampionBanner } from "@/components/knockout/ChampionBanner";
import { ModelTabs } from "@/components/knockout/ModelTabs";
import { QualificationSummary } from "@/components/knockout/QualificationSummary";
import { CONDITION_META, type Condition, isCondition } from "@/lib/conditions";
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
  return (
    <div className="space-y-6">
      <BracketScores real={matches} />
      <ActualBracket matches={matches} />
    </div>
  );
}

function PredictedView({
  model,
  arm,
}: {
  model: KnockoutModel;
  arm: Condition;
}) {
  const run = getKnockoutRun(model, arm);
  return (
    <div className="space-y-6">
      <ArmTabs model={model} current={arm} />
      {!run ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center">
          <p className="text-sm text-muted">
            No {CONDITION_META[arm].label.toLowerCase()}-arm knockout run
            recorded for {LABEL[model]} yet.
          </p>
        </div>
      ) : (
        <>
          <div className="text-xs text-muted">
            {run.engine} · {formatRunTimestamp(run.generatedAt)} · chained on
            the {CONDITION_META[run.condition].label.toLowerCase()} arm&apos;s
            group-stage scorelines
          </div>
          <ChampionBanner run={run} />
          <QualificationSummary qualification={run.qualification} />
          <Bracket run={run} />
        </>
      )}
    </div>
  );
}

// Next 16: searchParams is a Promise (confirmed in next/dist/docs) — await it.
export default async function KnockoutPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const view: KnockoutView = resolveView(params.model);
  const rawArm = typeof params.arm === "string" ? params.arm : "web";
  const arm: Condition = isCondition(rawArm) ? rawArm : "web";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Knockout bracket</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          {view === "actual" ? ACTUAL_SUBTITLE : PREDICTED_SUBTITLE}
        </p>
      </div>

      <ModelTabs active={view} />

      {view === "actual" ? (
        <ActualView />
      ) : (
        <PredictedView model={view} arm={arm} />
      )}
    </div>
  );
}
