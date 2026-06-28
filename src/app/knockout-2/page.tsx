import type { Metadata } from "next";
import { ActualBracket } from "@/components/knockout/ActualBracket";
import { RealArmTabs } from "@/components/knockout-real/RealArmTabs";
import { RealBracket } from "@/components/knockout-real/RealBracket";
import { RealChampionBanner } from "@/components/knockout-real/RealChampionBanner";
import { RealModelTabs } from "@/components/knockout-real/RealModelTabs";
import { RealScoreboard } from "@/components/knockout-real/RealScoreboard";
import { Retrospective } from "@/components/knockout-real/Retrospective";
import { CONDITION_META, type Condition, isCondition } from "@/lib/conditions";
import { formatRunTimestamp } from "@/lib/format";
import { getKnockoutMatches } from "@/lib/knockout/actual";
import { REAL_CONTEXT } from "@/lib/knockout-real/context";
import { getRealKnockoutRun } from "@/lib/knockout-real/runs";
import type { RealKnockoutModel } from "@/lib/knockout-real/schema";
import {
  type RealKnockoutView,
  resolveRealView,
} from "@/lib/knockout-real/view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Knockout II (ground-truth) — World Cup Predictor 2026",
};

const LABEL: Record<RealKnockoutModel, string> = {
  claude: "Claude",
  gemini: "Gemini",
  openai: "OpenAI",
};

async function ActualView() {
  const matches = await getKnockoutMatches();
  return (
    <div className="space-y-6">
      <RealScoreboard real={matches} />
      {matches.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center">
          <p className="text-sm text-muted">
            Knockout fixtures not seeded yet.
          </p>
        </div>
      ) : (
        <ActualBracket matches={matches} />
      )}
    </div>
  );
}

function PredictedView({
  model,
  arm,
}: {
  model: RealKnockoutModel;
  arm: Condition;
}) {
  const run = getRealKnockoutRun(model, arm);
  return (
    <div className="space-y-6">
      <RealArmTabs model={model} current={arm} />
      {!run ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/40 p-10 text-center">
          <p className="text-sm text-muted">
            No {CONDITION_META[arm].label.toLowerCase()}-arm Stage-2 bracket
            recorded for {LABEL[model]} yet.
          </p>
        </div>
      ) : (
        <>
          <div className="text-xs text-muted">
            {run.engine} · {formatRunTimestamp(run.generatedAt)} · built on the
            real FIFA group stage + official Round-of-32 draw
          </div>
          <RealChampionBanner run={run} />
          <RealBracket run={run} />
        </>
      )}
    </div>
  );
}

// Next 16: searchParams is a Promise (confirmed in next/dist/docs) — await it.
export default async function Knockout2Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const view: RealKnockoutView = resolveRealView(params.model);
  const rawArm = typeof params.arm === "string" ? params.arm : "enriched";
  const arm: Condition = isCondition(rawArm) ? rawArm : "enriched";

  const groupStageDone = REAL_CONTEXT.groups.length === 12;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Knockout II — ground-truth</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Stage 2 of the experiment. The group stage is over, so every model now
          starts from the <strong>real</strong> FIFA results and the{" "}
          <strong>official Round-of-32 draw</strong> — identical for all — and
          predicts only the knockout outcomes. Unlike{" "}
          <a
            href="/knockout"
            className="underline decoration-border underline-offset-2 hover:text-foreground"
          >
            Stage 1
          </a>{" "}
          (each model chained on its own predicted groups), this shared starting
          point makes the brackets directly comparable, tie by tie.
          {groupStageDone
            ? ""
            : " (Waiting on the full group stage to finalize on FIFA.)"}
        </p>
      </div>

      <Retrospective />

      <RealModelTabs active={view} />

      {view === "actual" ? (
        <ActualView />
      ) : (
        <PredictedView model={view} arm={arm} />
      )}
    </div>
  );
}
