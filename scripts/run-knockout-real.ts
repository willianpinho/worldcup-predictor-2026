// Stage-2 ("ground-truth-conditioned") knockout runner. Feeds a model the REAL final group
// stage + the official Round-of-32 draw (docs/context/real-groups-2026.json) and asks for the
// full knockout bracket in one call. Validates with parseRealKnockoutRun, retries on failure
// (feeding the error list back), and writes a Stage-2 run file.
//
// Build the ground truth first:  pnpm tsx scripts/build-real-context.ts
//
// Usage:
//   pnpm tsx scripts/run-knockout-real.ts --model claude --engine "Claude Opus 4.8" \
//     --litellm-model claude-opus-4-8 --condition enriched
//   pnpm tsx scripts/run-knockout-real.ts --model gemini --engine "Gemini 3.1 Pro Preview" \
//     --via gemini-cli --cli-model gemini-3.1-pro-preview --condition web
//
// Env (litellm transport): LITELLM_BASE_URL (default http://localhost:4000), LITELLM_API_KEY.

import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { isCondition } from "../src/lib/conditions";
import { REAL_CONTEXT } from "../src/lib/knockout-real/context";
import { renderRealContextBlock } from "../src/lib/knockout-real/promptContext";
import { parseRealKnockoutRun } from "../src/lib/knockout-real/schema";
import type { TeamContextDataset } from "../src/lib/experiment";
import { normalizeTeam } from "../src/lib/teams";
import { chatViaClaudeCli } from "./lib/claudeCli";
import { chatViaGeminiCli } from "./lib/geminiCli";
import {
  chat,
  fail,
  type GatewayConfig,
  parseFlags,
  parseJson,
  requireEnv,
} from "./lib/llm";

const MODELS = ["claude", "gemini", "openai"] as const;
const PROMPT_DOC = "docs/PROMPT-KNOCKOUT-REAL.md";
const MAX_RETRIES = 3;

/** Extract the fenced ```text … ``` prompt block under the "## Prompt" heading. */
function loadPrompt(): string {
  const doc = readFileSync(PROMPT_DOC, "utf8");
  const match = doc.match(/##\s+Prompt\s*\n+```text\n([\s\S]*?)\n```/);
  if (!match)
    fail(`Could not find the \`\`\`text prompt block in ${PROMPT_DOC}`);
  return match[1].trim();
}

/**
 * Direct OpenAI Chat Completions sender. OpenAI reasoning models (gpt-5.x) reject
 * `max_tokens` and require `max_completion_tokens`, which the shared LiteLLM `chat()`
 * helper does not send — so the direct OpenAI arm uses this minimal sender instead.
 */
async function chatOpenAiDirect(
  baseUrl: string,
  model: string,
  apiKey: string,
  maxTokens: number,
  prompt: string,
): Promise<{ content: string; totalTokens?: number; toolCalls: number }> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: maxTokens,
    }),
  });
  const text = await res.text();
  let data: {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
    error?: { message?: string };
  };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `OpenAI returned non-JSON (${res.status}): ${text.slice(0, 200)}`,
    );
  }
  if (!res.ok)
    throw new Error(
      `OpenAI error ${res.status}: ${data.error?.message ?? text.slice(0, 200)}`,
    );
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length === 0)
    throw new Error("OpenAI response had no message content");
  return { content, totalTokens: data.usage?.total_tokens, toolCalls: 0 };
}

/** Enriched-only: a standardized ratings table for the 32 qualifiers (FIFA rank + Elo). */
function renderQualifierRatings(datasetPath: string): string {
  const dataset = JSON.parse(
    readFileSync(datasetPath, "utf8"),
  ) as TeamContextDataset;
  const byTeam = new Map(dataset.teams.map((t) => [normalizeTeam(t.team), t]));
  const qualifiers = [
    ...new Set(REAL_CONTEXT.roundOf32.flatMap((t) => [t.teamA, t.teamB])),
  ];
  const rows = qualifiers
    .map((name) => byTeam.get(normalizeTeam(name)))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .sort((a, b) => a.fifaRank - b.fifaRank)
    .map(
      (r) =>
        `${r.team} | ${r.confederation} | FIFA ${r.fifaRank} | Elo ${r.elo}`,
    )
    .join("\n");
  const src = dataset.sources;
  return `STANDARDIZED RATINGS (snapshot ${dataset.snapshotDate}). Same data for every model.
Sources: ${src.fifaRanking.name} (${src.fifaRanking.releaseDate}); ${src.elo.name} (retrieved ${src.elo.retrievedAt}).

${rows}`;
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));

  const model = flags.model;
  if (!model || !(MODELS as readonly string[]).includes(model))
    fail(`--model must be one of ${MODELS.join(", ")}`);
  const engine = flags.engine;
  if (!engine || engine === "true")
    fail('--engine "<human label>" is required');

  const via = flags.via || "litellm";
  if (
    via !== "litellm" &&
    via !== "gemini-cli" &&
    via !== "claude-cli" &&
    via !== "openai-direct"
  )
    fail("--via must be litellm, gemini-cli, claude-cli or openai-direct");

  const condition = flags.condition || "enriched";
  if (!isCondition(condition))
    fail("--condition must be web, baseline or enriched");

  const temperature = flags.temperature ? Number(flags.temperature) : undefined;
  if (temperature !== undefined && Number.isNaN(temperature))
    fail("--temperature must be a number");
  const maxTokens = flags["max-tokens"] ? Number(flags["max-tokens"]) : 32000;
  if (Number.isNaN(maxTokens)) fail("--max-tokens must be a number");

  const today = new Date().toISOString().slice(0, 10);
  const out =
    flags.out || `docs/runs/knockout-real-${model}-${condition}-${today}.json`;

  // INPUT = the shared real ground truth; enriched additionally gets the ratings table.
  let input = renderRealContextBlock();
  if (condition === "enriched") {
    const ctx = flags.context || "docs/context/team-context.json";
    input = `${input}\n\n${renderQualifierRatings(ctx)}`;
  }

  const promptDoc = loadPrompt().replace(
    '"model": "claude"',
    `"model": "${model}"`,
  );
  const basePrompt = `${promptDoc}\n\nINPUT — real ground truth (FIFA):\n${input}`;

  let send: (
    p: string,
  ) => Promise<{ content: string; totalTokens?: number; toolCalls?: number }>;
  if (via === "gemini-cli" || via === "claude-cli") {
    const cliModel = flags["cli-model"];
    if (!cliModel || cliModel === "true")
      fail(`--cli-model <model id> is required with --via ${via}`);
    send =
      via === "gemini-cli"
        ? async (p) => chatViaGeminiCli(cliModel, p)
        : async (p) => chatViaClaudeCli(cliModel, p);
    console.log(
      `Running Stage-2 knockout ${model} (${condition}) via ${via} (${cliModel})`,
    );
  } else if (via === "openai-direct") {
    const oaiModel = flags["litellm-model"];
    if (!oaiModel || oaiModel === "true")
      fail(
        "--litellm-model <openai model id> is required with --via openai-direct",
      );
    const baseUrl = flags["base-url"] || "https://api.openai.com";
    const apiKey = requireEnv("LITELLM_API_KEY");
    send = (p) => chatOpenAiDirect(baseUrl, oaiModel, apiKey, maxTokens, p);
    console.log(
      `Running Stage-2 knockout ${model} (${condition}) via openai-direct (${oaiModel} @ ${baseUrl})`,
    );
  } else {
    const litellmModel = flags["litellm-model"];
    if (!litellmModel || litellmModel === "true")
      fail("--litellm-model <gateway model> is required");
    const baseUrl =
      flags["base-url"] ||
      process.env.LITELLM_BASE_URL ||
      "http://localhost:4000";
    const apiKey = requireEnv("LITELLM_API_KEY");
    const cfg: GatewayConfig = {
      baseUrl,
      model: litellmModel,
      apiKey,
      temperature,
      maxTokens,
    };
    send = (p) => chat(cfg, p);
    console.log(
      `Running Stage-2 knockout ${model} (${condition}) via ${litellmModel} @ ${baseUrl}`,
    );
  }

  let prompt = basePrompt;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const { content, totalTokens, toolCalls } = await send(prompt);
    if (via !== "litellm" && (toolCalls ?? 0) > 0 && condition !== "web") {
      if (attempt === MAX_RETRIES)
        fail(
          `Transport used ${toolCalls} tool call(s) — no-tools run violated`,
        );
      console.log(
        `  attempt ${attempt}: used ${toolCalls} tool call(s), retrying`,
      );
      continue;
    }
    let parsed: unknown;
    try {
      parsed = parseJson(content);
    } catch (err) {
      const msg = (err as Error).message;
      if (attempt === MAX_RETRIES)
        fail(`Stage-2 run failed after ${MAX_RETRIES} attempts:\n- ${msg}`);
      console.log(`  attempt ${attempt}: ${msg}, retrying`);
      prompt = `${basePrompt}\n\nYour previous reply was invalid. Fix this and reply with JSON only:\n- ${msg}`;
      continue;
    }

    const result = parseRealKnockoutRun(parsed);
    if (result.ok) {
      const tokenNote = totalTokens ? ` (${totalTokens} tokens)` : "";
      console.log(`  ok on attempt ${attempt}${tokenNote}`);
      const runFile = {
        ...result.run,
        condition,
        engine,
        generatedAt: new Date().toISOString(),
      };
      writeFileSync(out, `${JSON.stringify(runFile, null, 2)}\n`);
      console.log(`Wrote Stage-2 knockout run to ${out}`);
      return;
    }
    if (attempt === MAX_RETRIES)
      fail(
        `Stage-2 run failed validation after ${MAX_RETRIES} attempts:\n- ${result.errors.join("\n- ")}`,
      );
    console.log(
      `  attempt ${attempt}: ${result.errors.length} validation issue(s), retrying`,
    );
    const top = result.errors.slice(0, 25);
    prompt = `${basePrompt}\n\nYour previous reply had these problems${
      result.errors.length > top.length ? ` (first ${top.length} shown)` : ""
    }. Fix them and reply with JSON only:\n- ${top.join("\n- ")}`;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
