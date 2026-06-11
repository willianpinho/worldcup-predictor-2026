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
import knockoutClaudeBaseline from "../../../docs/runs/knockout-claude-baseline-2026-06-11.json";
import knockoutClaudeEnriched from "../../../docs/runs/knockout-claude-enriched-2026-06-11.json";
import knockoutGemini20260610 from "../../../docs/runs/knockout-gemini-2026-06-10.json";
import knockoutGeminiBaseline from "../../../docs/runs/knockout-gemini-baseline-2026-06-11.json";
import knockoutGeminiEnriched from "../../../docs/runs/knockout-gemini-enriched-2026-06-11.json";
import knockoutOpenai20260610 from "../../../docs/runs/knockout-openai-2026-06-10.json";
import knockoutOpenaiBaseline from "../../../docs/runs/knockout-openai-baseline-2026-06-11.json";
import knockoutOpenaiEnriched from "../../../docs/runs/knockout-openai-enriched-2026-06-11.json";
import type { Condition } from "../conditions";
import {
  type KnockoutModel,
  type KnockoutRun,
  parseKnockoutRun,
} from "./schema";

// Raw static JSON imports — one bracket per (model, arm), newest first within each.
const RAW_RUNS: unknown[] = [
  knockoutClaude20260610,
  knockoutGemini20260610,
  knockoutOpenai20260610,
  knockoutClaudeBaseline,
  knockoutGeminiBaseline,
  knockoutOpenaiBaseline,
  knockoutClaudeEnriched,
  knockoutGeminiEnriched,
  knockoutOpenaiEnriched,
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

/** The most recent knockout run for a (model, arm), or undefined if none recorded. */
export function getKnockoutRun(
  model: KnockoutModel,
  condition: Condition = "web",
): KnockoutRun | undefined {
  return KNOCKOUT_RUNS.find(
    (r) => r.model === model && r.condition === condition,
  );
}

/** Pretty-printed JSON for a run — what to copy back into the prompt page / re-import. */
export function importableJson(run: KnockoutRun): string {
  return JSON.stringify(run, null, 2);
}
