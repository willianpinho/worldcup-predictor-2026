// Registry of recorded model runs (the exact JSON each AI returned for docs/PROMPT.md).
// Each run is the importable payload plus metadata; the /prompt page surfaces them so the
// input prompt and the model's output live side by side. Add a model's run by dropping a
// JSON file in docs/runs/ and importing it here.
import claude20260609 from "../../docs/runs/claude-2026-06-09.json";
import gemini20260609 from "../../docs/runs/gemini-2026-06-09.json";
import openai20260609 from "../../docs/runs/openai-2026-06-09.json";
import type { Condition } from "./conditions";
import type { ImportPayload } from "./importPredictions";

export interface ModelRun {
  model: ImportPayload["model"];
  /** Experiment arm the run belongs to. */
  condition: Condition;
  /** ISO-8601 instant the run was produced. */
  generatedAt: string;
  /** Human label for the model build (e.g. "Claude Opus 4.8"). */
  engine: string;
  predictions: ImportPayload["predictions"];
}

interface RawRun extends Omit<ModelRun, "condition"> {
  // Older recorded runs predate the experiment arms; absent means the web arm.
  condition?: Condition;
  notes?: string;
  prompt?: string;
}

// Newest first.
const RAW_RUNS: RawRun[] = [
  claude20260609 as RawRun,
  openai20260609 as RawRun,
  gemini20260609 as RawRun,
];

export const MODEL_RUNS: ModelRun[] = RAW_RUNS.map((r) => ({
  model: r.model,
  condition: r.condition ?? "web",
  generatedAt: r.generatedAt,
  engine: r.engine,
  predictions: r.predictions,
}));

/**
 * The clean payload to paste into /admin — exactly { model, condition, predictions }.
 * `condition` is included so the import lands in the correct arm.
 */
export function importableJson(run: ModelRun): string {
  return JSON.stringify(
    {
      model: run.model,
      condition: run.condition,
      predictions: run.predictions,
    },
    null,
    2,
  );
}
