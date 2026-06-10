// Prompt blocks for the API experiment arms (baseline + enriched). Single source of
// truth — the methodology page (docs/PROMPT-ENRICHED.md) and the runner scripts both use
// these exact strings. The web arm uses prompt.ts/PREDICTION_PROMPT instead; here the
// fixtures are PROVIDED in the message (the API has no web access), so the test is about
// outcomes, not the model's recall of the official draw.

import { CORE_ANALYSIS } from "./prompt";
import { normalizeTeam } from "./teams";

/** A single group fixture: home team (teamA) vs away team (teamB), in listed order. */
export interface Fixture {
  teamA: string;
  teamB: string;
}

/** One team's standardized data row in the versioned snapshot dataset. */
export interface TeamContext {
  team: string;
  confederation: string;
  fifaRank: number;
  elo: number;
}

/** A named, dated source referenced by the snapshot. */
export interface ContextSource {
  name: string;
  url: string;
}

/** The full standardized context dataset (docs/context/team-context.json). */
export interface TeamContextDataset {
  snapshotDate: string;
  sources: {
    fifaRanking: ContextSource & { releaseDate: string };
    elo: ContextSource & { retrievedAt: string };
  };
  teams: TeamContext[];
}

/** Prepended to baseline API runs: no tools, internal knowledge only, fixtures provided. */
export const BASELINE_HEADER = `You are answering through an API with NO web access and NO tools. Use ONLY your own
internal football knowledge — do not browse, search, or claim to look anything up. The
exact fixtures you must predict are listed below, so this is a test of your judgement on
the OUTCOMES, not of your memory of the official draw. Do not add, drop or reorder any
fixture.`;

/** Prepended to web-arm runs executed per group (chat/CLI with live web access). */
export const WEB_HEADER = `You have live web access. Confirm squads, recent form, injuries/suspensions and market
odds as needed before answering. The exact fixtures you must predict are listed below.
Do not add, drop or reorder any fixture.`;

/** Prepended to enriched API runs: baseline rules PLUS the standardized-data instruction. */
export const ENRICHED_HEADER = `You are answering through an API with NO web access and NO tools. Use ONLY your own
internal football knowledge — do not browse, search, or claim to look anything up. The
exact fixtures you must predict are listed below, so this is a test of your judgement on
the OUTCOMES, not of your memory of the official draw. Do not add, drop or reorder any
fixture.

A standardized context block follows. For rankings/ratings use ONLY the data provided
(identical for every model in this experiment); you may combine it with your internal
football knowledge for tactics/players.`;

/** Render the 6 fixtures of a group as a numbered "Home vs Away" list. */
function renderFixtures(fixtures: Fixture[]): string {
  return fixtures
    .map((f, i) => `${i + 1}. ${f.teamA} vs ${f.teamB}`)
    .join("\n");
}

/**
 * Build the per-group API prompt for one group. Reuses the shared analytical core from
 * prompt.ts but scopes the task to ONE group's 6 listed fixtures (in order), demanding the
 * same JSON shape with EXACTLY those 6 predictions. Pass `contextBlock` for the enriched
 * arm — its presence switches the header from baseline to enriched and injects the block.
 * Pass `web` for the web arm (live web access allowed; contextBlock is ignored).
 */
export function groupPromptFor(
  group: string,
  fixtures: Fixture[],
  contextBlock?: string,
  web = false,
): string {
  const header = web
    ? WEB_HEADER
    : contextBlock
      ? ENRICHED_HEADER
      : BASELINE_HEADER;
  const context = contextBlock ? `\n\n${contextBlock}\n` : "";

  return `You are a quantitative football analyst predicting matches of the 2026 FIFA World Cup
(hosted by the USA, Canada and Mexico; 48 teams; 12 groups A–L).

${header}
${context}
Predict EXACTLY the following ${fixtures.length} group-stage fixtures of GROUP ${group}
(teamA is listed first/home, teamB second/away — keep this order):

${renderFixtures(fixtures)}

${CORE_ANALYSIS}

RESPOND WITH VALID JSON ONLY, no text before or after, in exactly this shape:

{
  "model": "claude",
  "predictions": [
    {
      "group": "${group}",
      "teamA": "<home team>",
      "teamB": "<away team>",
      "scoreA": <int>,
      "scoreB": <int>,
      "probWinA": <0-100>,
      "probDraw": <0-100>,
      "probWinB": <0-100>,
      "confidence": "high|medium|low",
      "reasoning": "<one sentence with the main signal>"
    }
  ]
}

Include all ${fixtures.length} listed fixtures of group ${group} and no others. Do not
invent teams, matches or statistics.`;
}

/** Right-pad a cell to a fixed width for a monospace-friendly plain-text table. */
function pad(value: string, width: number): string {
  return value.length >= width
    ? value
    : value + " ".repeat(width - value.length);
}

/**
 * Render the enriched-arm context block for one group: a compact 4-team table (name,
 * confederation, FIFA rank, Elo) drawn from the standardized snapshot, plus the snapshot
 * date and a source line. Teams are matched to the dataset via normalizeTeam, so naming
 * variants align. Throws if a team in the fixtures is missing from the dataset — the
 * enriched arm must give every model the SAME data, so a gap is a hard error.
 */
export function renderContextBlock(
  group: string,
  fixtures: Fixture[],
  dataset: TeamContextDataset,
): string {
  const byTeam = new Map(dataset.teams.map((t) => [normalizeTeam(t.team), t]));

  // Unique teams of this group, in first-appearance order across the fixtures.
  const seen = new Set<string>();
  const teams: string[] = [];
  for (const f of fixtures) {
    for (const name of [f.teamA, f.teamB]) {
      const key = normalizeTeam(name);
      if (!seen.has(key)) {
        seen.add(key);
        teams.push(name);
      }
    }
  }

  const rows = teams.map((name) => {
    const row = byTeam.get(normalizeTeam(name));
    if (!row) {
      throw new Error(
        `renderContextBlock: "${name}" (group ${group}) is missing from the context dataset`,
      );
    }
    return row;
  });

  const nameW = Math.max(4, ...rows.map((r) => r.team.length));
  const confW = Math.max(5, ...rows.map((r) => r.confederation.length));
  const header = `${pad("Team", nameW)} | ${pad("Conf", confW)} | FIFA | Elo`;
  const body = rows
    .map(
      (r) =>
        `${pad(r.team, nameW)} | ${pad(r.confederation, confW)} | ${pad(
          String(r.fifaRank),
          4,
        )} | ${r.elo}`,
    )
    .join("\n");

  const src = dataset.sources;
  return `STANDARDIZED CONTEXT (snapshot ${dataset.snapshotDate}). Same data for every model.
Sources: ${src.fifaRanking.name} (${src.fifaRanking.releaseDate}); ${src.elo.name} (retrieved ${src.elo.retrievedAt}).

${header}
${body}`;
}
