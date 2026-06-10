// Registry of recorded knockout-bracket runs (the exact JSON each AI returned for
// docs/PROMPT-KNOCKOUT.md). Each run is validated through KnockoutRunSchema at module
// load so a malformed bracket fails the build, not at runtime.
//
// To add a model's run:
//   1. Drop the JSON at docs/runs/knockout-<model>-<date>.json (model = claude|gemini|openai).
//   2. Import it below and append it to RAW_RUNS (newest first).
// e.g.
//   import claudeKo from "../../../docs/runs/knockout-claude-2026-06-10.json";
//   const RAW_RUNS: unknown[] = [claudeKo];
import knockoutClaude20260610 from "../../../docs/runs/knockout-claude-2026-06-10.json";
import knockoutGemini20260610 from "../../../docs/runs/knockout-gemini-2026-06-10.json";
import knockoutOpenai20260610 from "../../../docs/runs/knockout-openai-2026-06-10.json";
import {
  type KnockoutModel,
  type KnockoutRun,
  parseKnockoutRun,
} from "./schema";

// Raw static JSON imports, newest first.
const RAW_RUNS: unknown[] = [
  knockoutClaude20260610,
  knockoutGemini20260610,
  knockoutOpenai20260610,
];

function load(raw: unknown): KnockoutRun {
  const result = parseKnockoutRun(raw);
  if (!result.ok) {
    throw new Error(
      `Invalid knockout run in docs/runs/:\n  ${result.errors.join("\n  ")}`,
    );
  }
  return result.run;
}

/** All recorded knockout runs, newest first, validated at load. */
export const KNOCKOUT_RUNS: KnockoutRun[] = RAW_RUNS.map(load);

/** The most recent knockout run for a model, or undefined if none recorded. */
export function getKnockoutRun(model: KnockoutModel): KnockoutRun | undefined {
  return KNOCKOUT_RUNS.find((r) => r.model === model);
}

/** Pretty-printed JSON for a run — what to copy back into the prompt page / re-import. */
export function importableJson(run: KnockoutRun): string {
  return JSON.stringify(run, null, 2);
}
