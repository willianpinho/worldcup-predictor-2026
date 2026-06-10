// Group-stage API runner. Predicts all 72 group-stage fixtures one group at a time via a
// LiteLLM OpenAI-compatible gateway, validates each group's 6 predictions against the
// import schema + the official fixture pairs, retries on failure, and writes a run file
// compatible with src/lib/runs.ts + ImportSchema.
//
// Usage:
//   pnpm tsx scripts/run-model.ts --model claude --engine "Claude Opus 4.8" \
//     --litellm-model claude-opus-4-8 --condition baseline
//   pnpm tsx scripts/run-model.ts --model gemini --engine "Gemini 3 Pro" \
//     --litellm-model gemini-3-pro --condition enriched --context docs/context/team-context.json
//
// Env: LITELLM_BASE_URL (default http://localhost:4000), LITELLM_API_KEY (required).

import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import {
  type Fixture,
  groupPromptFor,
  renderContextBlock,
  type TeamContextDataset,
} from "../src/lib/experiment";
import { isCondition } from "../src/lib/conditions";
import { PredictionItem } from "../src/lib/importPredictions";
import { pairKey } from "../src/lib/teams";
import {
  chat,
  fail,
  type GatewayConfig,
  parseFlags,
  parseJson,
  requireEnv,
} from "./lib/llm";

const MODELS = ["claude", "gemini", "openai"] as const;
const GROUPS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
] as const;
const FIXTURES_SOURCE = "docs/runs/claude-2026-06-09.json";
const MAX_RETRIES = 3;

const GroupResponse = z.object({ predictions: z.array(PredictionItem) });

interface GroupFixtures {
  group: string;
  fixtures: Fixture[];
  /** Expected pair keys for the 6 fixtures of this group. */
  pairKeys: Set<string>;
}

/** Load the 72 official fixtures from the recorded run and split them by group. */
function loadFixtures(): GroupFixtures[] {
  const raw = JSON.parse(readFileSync(FIXTURES_SOURCE, "utf8")) as {
    predictions: Array<{ group?: string; teamA: string; teamB: string }>;
  };
  const byGroup = new Map<string, Fixture[]>();
  for (const p of raw.predictions) {
    const g = (p.group ?? "").toUpperCase();
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)?.push({ teamA: p.teamA, teamB: p.teamB });
  }
  return GROUPS.map((group) => {
    const fixtures = byGroup.get(group) ?? [];
    if (fixtures.length !== 6) {
      fail(
        `Fixtures source ${FIXTURES_SOURCE}: group ${group} has ${fixtures.length} fixtures, expected 6`,
      );
    }
    return {
      group,
      fixtures,
      pairKeys: new Set(fixtures.map((f) => pairKey(f.teamA, f.teamB))),
    };
  });
}

/** Validate one group's parsed predictions; return errors (empty = ok). */
function validateGroup(parsed: unknown, gf: GroupFixtures): string[] {
  const result = GroupResponse.safeParse(parsed);
  if (!result.success) {
    return result.error.issues.map(
      (i) => `${i.path.join(".") || "(root)"} — ${i.message}`,
    );
  }
  const preds = result.data.predictions;
  const errors: string[] = [];
  if (preds.length !== 6) {
    errors.push(
      `expected exactly 6 predictions for group ${gf.group}, got ${preds.length}`,
    );
  }
  const seen = new Set<string>();
  for (const p of preds) {
    const key = pairKey(p.teamA, p.teamB);
    if (!gf.pairKeys.has(key)) {
      errors.push(
        `unexpected fixture "${p.teamA} vs ${p.teamB}" (not a group-${gf.group} pair)`,
      );
    }
    if (seen.has(key))
      errors.push(`duplicate fixture "${p.teamA} vs ${p.teamB}"`);
    seen.add(key);
  }
  for (const key of gf.pairKeys) {
    if (!seen.has(key)) errors.push(`missing a fixture (pair ${key})`);
  }
  return errors;
}

/** Run one group with retries; returns its 6 validated predictions. */
async function runGroup(
  cfg: GatewayConfig,
  model: string,
  gf: GroupFixtures,
  contextBlock: string | undefined,
): Promise<z.infer<typeof PredictionItem>[]> {
  const basePrompt = groupPromptFor(
    gf.group,
    gf.fixtures,
    contextBlock,
  ).replace('"model": "claude"', `"model": "${model}"`);
  let prompt = basePrompt;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const { content, totalTokens } = await chat(cfg, prompt);
    let parsed: unknown;
    try {
      parsed = parseJson(content);
    } catch (err) {
      const errors = [(err as Error).message];
      if (attempt === MAX_RETRIES) {
        fail(
          `Group ${gf.group} failed after ${MAX_RETRIES} attempts:\n- ${errors.join("\n- ")}`,
        );
      }
      prompt = `${basePrompt}\n\nYour previous reply was invalid. Fix these and reply with JSON only:\n- ${errors.join("\n- ")}`;
      continue;
    }

    const errors = validateGroup(parsed, gf);
    if (errors.length === 0) {
      const tokenNote = totalTokens ? ` (${totalTokens} tokens)` : "";
      console.log(`  group ${gf.group}: ok on attempt ${attempt}${tokenNote}`);
      return (parsed as z.infer<typeof GroupResponse>).predictions;
    }
    if (attempt === MAX_RETRIES) {
      fail(
        `Group ${gf.group} failed validation after ${MAX_RETRIES} attempts:\n- ${errors.join("\n- ")}`,
      );
    }
    console.log(
      `  group ${gf.group}: attempt ${attempt} invalid (${errors.length} issue(s)), retrying`,
    );
    prompt = `${basePrompt}\n\nYour previous reply had these problems. Fix them and reply with JSON only:\n- ${errors.join("\n- ")}`;
  }
  // Unreachable: every failing branch above calls fail().
  return [];
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));

  const model = flags.model;
  if (!model || !(MODELS as readonly string[]).includes(model)) {
    fail(`--model must be one of ${MODELS.join(", ")}`);
  }
  const engine = flags.engine;
  if (!engine || engine === "true")
    fail('--engine "<human label>" is required');
  const litellmModel = flags["litellm-model"];
  if (!litellmModel || litellmModel === "true")
    fail("--litellm-model <gateway model> is required");

  const condition = flags.condition;
  if (!condition || !isCondition(condition) || condition === "web") {
    fail("--condition must be baseline or enriched");
  }

  let dataset: TeamContextDataset | undefined;
  if (condition === "enriched") {
    const contextPath = flags.context;
    if (!contextPath || contextPath === "true") {
      fail("--context <path> is required for the enriched arm");
    }
    dataset = JSON.parse(
      readFileSync(contextPath, "utf8"),
    ) as TeamContextDataset;
  }

  const baseUrl =
    flags["base-url"] ||
    process.env.LITELLM_BASE_URL ||
    "http://localhost:4000";
  const apiKey = requireEnv("LITELLM_API_KEY");
  const temperature = flags.temperature ? Number(flags.temperature) : 0.2;
  if (Number.isNaN(temperature)) fail("--temperature must be a number");

  const today = new Date().toISOString().slice(0, 10);
  const out = flags.out || `docs/runs/${model}-${condition}-${today}.json`;

  const cfg: GatewayConfig = {
    baseUrl,
    model: litellmModel,
    apiKey,
    temperature,
  };
  const groups = loadFixtures();

  console.log(
    `Running ${model} / ${condition} via ${litellmModel} @ ${baseUrl} (temp ${temperature})`,
  );

  const predictions: z.infer<typeof PredictionItem>[] = [];
  // The exact per-group template used (group "A"), for the run file's `prompt` field.
  const promptTemplate = groupPromptFor(
    "A",
    groups[0].fixtures,
    dataset ? renderContextBlock("A", groups[0].fixtures, dataset) : undefined,
  );

  for (const gf of groups) {
    const contextBlock = dataset
      ? renderContextBlock(gf.group, gf.fixtures, dataset)
      : undefined;
    const groupPreds = await runGroup(cfg, model, gf, contextBlock);
    predictions.push(...groupPreds);
  }

  if (predictions.length !== 72) {
    fail(`Expected 72 predictions in total, got ${predictions.length}`);
  }

  const runFile = {
    model,
    condition,
    generatedAt: new Date().toISOString(),
    engine,
    notes: `API ${condition} arm via LiteLLM (${litellmModel}, temp ${temperature}). Fixtures provided per group; no tools.`,
    prompt: promptTemplate,
    predictions,
  };
  writeFileSync(out, `${JSON.stringify(runFile, null, 2)}\n`);
  console.log(`Wrote ${predictions.length} predictions to ${out}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
