import type { Metadata } from "next";
import { Bracket } from "@/components/knockout/Bracket";
import { ChampionBanner } from "@/components/knockout/ChampionBanner";
import { ModelTabs } from "@/components/knockout/ModelTabs";
import { QualificationSummary } from "@/components/knockout/QualificationSummary";
import { getKnockoutRun } from "@/lib/knockout/runs";
import { MODELS, type KnockoutModel } from "@/lib/knockout/schema";
import { formatRunTimestamp } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Knockout bracket — World Cup Predictor 2026",
};

const LABEL: Record<KnockoutModel, string> = {
  claude: "Claude",
  gemini: "Gemini",
  openai: "OpenAI",
};

function resolveModel(raw: string | string[] | undefined): KnockoutModel {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (MODELS as readonly string[]).includes(value ?? "")
    ? (value as KnockoutModel)
    : "claude";
}

// Next 16: searchParams is a Promise (confirmed in next/dist/docs page.md) — await it.
export default async function KnockoutPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const model = resolveModel((await searchParams).model);
  const run = getKnockoutRun(model);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Knockout bracket</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Each model derives its 32 qualifiers from its own group-stage
          scorelines, then predicts every tie — Round of 32 to the final.
          Bracket structure is the model&apos;s own claim; internal consistency
          is validated by the app.
        </p>
      </div>

      <ModelTabs active={model} />

      {run ? (
        <div className="space-y-6">
          <div className="text-xs text-muted">
            {run.engine} · {formatRunTimestamp(run.generatedAt)}
          </div>
          <ChampionBanner run={run} />
          <QualificationSummary qualification={run.qualification} />
          <Bracket run={run} />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center">
          <p className="text-sm text-muted">
            Knockout predictions for {LABEL[model]} haven&apos;t been generated
            yet.
          </p>
        </div>
      )}
    </div>
  );
}
