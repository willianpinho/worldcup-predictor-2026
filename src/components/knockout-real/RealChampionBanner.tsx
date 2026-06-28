import { LuTrophy } from "react-icons/lu";
import { flagCode } from "@/lib/flags";
import type {
  RealKnockoutModel,
  RealKnockoutRun,
} from "@/lib/knockout-real/schema";
import { normalizeTeam } from "@/lib/teams";

const MODEL_COLOR: Record<RealKnockoutModel, string> = {
  claude: "text-claude",
  gemini: "text-gemini",
  openai: "text-openai",
};

function Flag({ team, size }: { team: string; size: string }) {
  const code = flagCode(team);
  if (!code) return null;
  return <span className={`fi fi-${code} ${size} rounded-[2px]`} aria-hidden />;
}

function thirdPlaceLine(tp: RealKnockoutRun["rounds"]["thirdPlace"]): string {
  if (
    tp.decidedBy === "penalties" &&
    tp.pensA !== undefined &&
    tp.pensB !== undefined
  )
    return `${tp.teamA} ${tp.scoreA}–${tp.scoreB} (${tp.pensA}–${tp.pensB} p) ${tp.teamB}`;
  const aet = tp.decidedBy === "extra-time" ? " a.e.t." : "";
  return `${tp.teamA} ${tp.scoreA}–${tp.scoreB}${aet} ${tp.teamB}`;
}

export function RealChampionBanner({ run }: { run: RealKnockoutRun }) {
  const color = MODEL_COLOR[run.model];
  const tp = run.rounds.thirdPlace;
  const thirdWinner =
    normalizeTeam(tp.winner) === normalizeTeam(tp.teamA) ? tp.teamA : tp.teamB;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 sm:col-span-1">
        <LuTrophy className={`size-8 shrink-0 ${color}`} aria-hidden />
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted">
            Champion
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <Flag team={run.champion} size="text-xl" />
            <span className="truncate text-lg font-bold">{run.champion}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="text-xs uppercase tracking-wide text-muted">
          Golden Boot
        </div>
        {run.goldenBoot ? (
          <div className="mt-1">
            <div className="flex items-center gap-2 font-semibold">
              <Flag team={run.goldenBoot.team} size="text-sm" />
              <span className="truncate">{run.goldenBoot.player}</span>
            </div>
            <div className="mt-0.5 text-xs text-muted">
              {run.goldenBoot.team}
              {run.goldenBoot.goals !== undefined
                ? ` · ${run.goldenBoot.goals} goals`
                : ""}
            </div>
          </div>
        ) : (
          <div className="mt-1 text-sm text-muted">—</div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="text-xs uppercase tracking-wide text-muted">
          Third place
        </div>
        <div className="mt-1 flex items-center gap-2 font-semibold">
          <Flag team={thirdWinner} size="text-sm" />
          <span className="truncate">{thirdWinner}</span>
        </div>
        <div className="mt-0.5 truncate text-xs text-muted">
          {thirdPlaceLine(tp)}
        </div>
      </div>
    </div>
  );
}
