import { Legend } from "@/components/standings/Legend";
import {
  type Qualification,
  StandingsTable,
} from "@/components/standings/StandingsTable";
import { ViewTabs } from "@/components/standings/ViewTabs";
import { MODELS, getMatches } from "@/lib/queries";
import type { StandingRow } from "@/lib/standings";
import { buildStandings, type StandingsView } from "@/lib/standings-view";

export const dynamic = "force-dynamic";

const MODEL_LABEL: Record<StandingsView, string> = {
  actual: "Actual",
  claude: "Claude",
  gemini: "Gemini",
  openai: "OpenAI",
};

function parseView(raw: string | string[] | undefined): StandingsView {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && (MODELS as readonly string[]).includes(value)
    ? (value as StandingsView)
    : "actual";
}

export default async function StandingsPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise and must be awaited.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { view: rawView } = await searchParams;
  const view = parseView(rawView);

  const matches = await getMatches();
  const { groups, thirds, totalResults } = buildStandings(matches, view);

  // Team names that currently hold a best-8 third-place spot, for row tinting.
  const qualifiedThirds = new Set(
    thirds.filter((t) => t.qualifies).map((t) => t.team),
  );

  const qualificationFor = (row: StandingRow, index: number): Qualification => {
    if (index < 2) return "advance";
    if (index === 2 && qualifiedThirds.has(row.team)) return "playoff";
    return "out";
  };

  const isModelView = view !== "actual";
  const hasData = totalResults > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Group standings</h1>
        <p className="mt-1 text-sm text-muted">
          {isModelView ? (
            <>
              Final group tables implied by{" "}
              <span className="font-medium text-foreground">
                {MODEL_LABEL[view]}
              </span>
              ’s predicted scorelines for all 72 matches.
            </>
          ) : (
            "Live group tables from the real results so far — top 2 of each group plus the 8 best third-placed teams reach the round of 32."
          )}
        </p>
      </div>

      <ViewTabs current={view} />

      {!hasData && isModelView ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted">
          No predictions recorded for {MODEL_LABEL[view]} yet — its implied
          standings will appear once it submits scorelines.
        </div>
      ) : (
        <>
          {!isModelView && (
            <p className="text-xs text-muted">
              Provisional until all group matches are played
              {hasData ? "" : " — no results yet, every team starts at zero"}.
            </p>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((g) => (
              <StandingsTable
                key={g.group}
                group={g.group}
                rows={g.rows}
                qualificationFor={qualificationFor}
              />
            ))}
          </div>

          <Legend />
        </>
      )}
    </div>
  );
}
