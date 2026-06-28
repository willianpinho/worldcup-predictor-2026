// Renders the Stage-2 ground-truth context as the plain-text INPUT block fed to every model:
// the real final group tables, the 32 qualifiers, and the OFFICIAL Round-of-32 draw the model
// must fill in. Single source of truth for the runner (scripts/run-knockout-real.ts) and the
// methodology doc, so the prompt and the recorded runs always agree on the shared input.
import { REAL_CONTEXT } from "./context";

/** Compact one-line table for a group, e.g. "1.Mexico 9 (+6)  2.South Africa 4 (-1) …". */
function renderGroupTable(group: { group: string; rows: RealRows }): string {
  const cells = group.rows
    .map((r, i) => {
      const gd = r.goalDiff >= 0 ? `+${r.goalDiff}` : `${r.goalDiff}`;
      return `${i + 1}.${r.team} ${r.points} (${gd})`;
    })
    .join("   ");
  return `Group ${group.group}: ${cells}`;
}

type RealRows = (typeof REAL_CONTEXT)["groups"][number]["rows"];

/** The full real-context block: complete + finished group stage + the official R32 draw. */
export function renderRealContextBlock(): string {
  const { groups, qualifiers, roundOf32 } = REAL_CONTEXT;

  const tables = groups.map(renderGroupTable).join("\n");

  const winners = Object.entries(qualifiers.groupWinners)
    .map(([g, t]) => `${g}:${t}`)
    .join("  ");
  const runners = Object.entries(qualifiers.runnersUp)
    .map(([g, t]) => `${g}:${t}`)
    .join("  ");
  const thirds = qualifiers.bestThirds.map((t) => t.team).join(", ");

  const bracket = roundOf32
    .map((t) => `${t.slot} (match ${t.matchNum}): ${t.teamA} vs ${t.teamB}`)
    .join("\n");

  return `REAL 2026 FIFA World Cup GROUP STAGE — FINAL RESULTS (source: FIFA, complete).
These are the actual outcomes; treat them as ground truth. Do not re-predict the group stage.

FINAL GROUP TABLES (rank.team points (goal difference)):
${tables}

QUALIFIED (32):
Group winners:   ${winners}
Runners-up:      ${runners}
Best 3rd-placed: ${thirds}

OFFICIAL ROUND-OF-32 DRAW — predict every one of these 16 ties (keep both teams; this is the
fixed, real bracket — do NOT change who plays whom):
${bracket}`;
}
