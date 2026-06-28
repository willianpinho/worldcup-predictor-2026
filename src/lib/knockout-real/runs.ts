// Registry of recorded STAGE-2 knockout runs — each model's predicted outcomes over the
// REAL official R32 draw (docs/PROMPT-KNOCKOUT-REAL.md). Validated through
// RealKnockoutRunSchema at module load, so a malformed bracket fails the build, not runtime.
//
// To add a model's run:
//   1. Generate it: pnpm tsx scripts/run-knockout-real.ts --model <m> --condition <arm> …
//      (writes docs/runs/knockout-real-<model>[-arm]-<date>.json)
//   2. Import it below and append to RAW_RUNS (newest first within each arm).
// e.g.
//   import claudeEnriched from "../../../docs/runs/knockout-real-claude-enriched-2026-06-28.json";
//   const RAW_RUNS: unknown[] = [claudeEnriched];
import claudeBaseline from "../../../docs/runs/knockout-real-claude-baseline-2026-06-28.json";
import claudeEnriched from "../../../docs/runs/knockout-real-claude-enriched-2026-06-28.json";
import geminiBaseline from "../../../docs/runs/knockout-real-gemini-baseline-2026-06-28.json";
import geminiEnriched from "../../../docs/runs/knockout-real-gemini-enriched-2026-06-28.json";
import openaiBaseline from "../../../docs/runs/knockout-real-openai-baseline-2026-06-28.json";
import openaiEnriched from "../../../docs/runs/knockout-real-openai-enriched-2026-06-28.json";
import type { Condition } from "../conditions";
import {
  parseRealKnockoutRun,
  type RealKnockoutModel,
  type RealKnockoutRun,
} from "./schema";

// Raw static JSON imports — one bracket per (model, arm). All six API arms recorded; the
// `web` (with-tools) arm needs a web-enabled transport and is added later.
const RAW_RUNS: unknown[] = [
  claudeBaseline,
  claudeEnriched,
  geminiBaseline,
  geminiEnriched,
  openaiBaseline,
  openaiEnriched,
];

function load(raw: unknown): RealKnockoutRun {
  const result = parseRealKnockoutRun(raw);
  if (!result.ok) {
    throw new Error(
      `Invalid Stage-2 knockout run in docs/runs/:\n  ${result.errors.join("\n  ")}`,
    );
  }
  return result.run;
}

/** All recorded Stage-2 runs, validated at load. */
export const REAL_KNOCKOUT_RUNS: RealKnockoutRun[] = RAW_RUNS.map(load);

/** The recorded Stage-2 run for a (model, arm), or undefined if none recorded. */
export function getRealKnockoutRun(
  model: RealKnockoutModel,
  condition: Condition = "enriched",
): RealKnockoutRun | undefined {
  return REAL_KNOCKOUT_RUNS.find(
    (r) => r.model === model && r.condition === condition,
  );
}

/** Pretty-printed JSON for a run — what to copy back into the prompt page / re-import. */
export function importableJson(run: RealKnockoutRun): string {
  return JSON.stringify(run, null, 2);
}
