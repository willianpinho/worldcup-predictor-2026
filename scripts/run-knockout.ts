// Knockout-bracket API runner. Feeds a model its OWN group-stage predictions and asks for
// the full knockout bracket in one call, validates it with parseKnockoutRun, retries on
// failure (feeding the error list back), and writes a knockout run file.
//
// Usage:
//   pnpm tsx scripts/run-knockout.ts --model claude --engine "Claude Opus 4.8" \
//     --litellm-model claude-opus-4-8 --input docs/runs/claude-2026-06-09.json
//   pnpm tsx scripts/run-knockout.ts --model gemini --engine "Gemini 3.1 Pro Preview" \
//     --via gemini-cli --cli-model gemini-3.1-pro-preview --input docs/runs/gemini-web-2026-06-10.json
//
// Env (litellm transport): LITELLM_BASE_URL (default http://localhost:4000), LITELLM_API_KEY.

import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { parseKnockoutRun } from "../src/lib/knockout/schema";
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
const KNOCKOUT_PROMPT_DOC = "docs/PROMPT-KNOCKOUT.md";
const MAX_RETRIES = 3;

/** Extract the fenced ```text … ``` prompt block under the "## Prompt" heading. */
function loadKnockoutPrompt(): string {
  const doc = readFileSync(KNOCKOUT_PROMPT_DOC, "utf8");
  const match = doc.match(/##\s+Prompt\s*\n+```text\n([\s\S]*?)\n```/);
  if (!match)
    fail(
      `Could not find the \`\`\`text prompt block in ${KNOCKOUT_PROMPT_DOC}`,
    );
  return match[1].trim();
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
  const via = flags.via || "litellm";
  if (via !== "litellm" && via !== "gemini-cli")
    fail("--via must be litellm or gemini-cli");

  const input = flags.input;
  if (!input || input === "true")
    fail("--input <group-stage run json> is required");

  // Provider default unless explicitly set — some models reject the parameter outright.
  const temperature = flags.temperature ? Number(flags.temperature) : undefined;
  if (temperature !== undefined && Number.isNaN(temperature))
    fail("--temperature must be a number");
  const maxTokens = flags["max-tokens"] ? Number(flags["max-tokens"]) : 32000;
  if (Number.isNaN(maxTokens)) fail("--max-tokens must be a number");

  const today = new Date().toISOString().slice(0, 10);
  const out = flags.out || `docs/runs/knockout-${model}-${today}.json`;

  // The model's own 72 group-stage predictions become the INPUT block.
  const groupRun = JSON.parse(readFileSync(input, "utf8")) as {
    predictions: unknown[];
  };
  if (
    !Array.isArray(groupRun.predictions) ||
    groupRun.predictions.length !== 72
  ) {
    fail(`Input ${input} must contain 72 group-stage predictions`);
  }

  const promptDoc = loadKnockoutPrompt().replace(
    '"model": "claude"',
    `"model": "${model}"`,
  );
  const inputJson = JSON.stringify(groupRun.predictions, null, 2);
  const basePrompt = `${promptDoc}\n\nINPUT — your own 72 group-stage predictions:\n${inputJson}`;

  let send: (
    p: string,
  ) => Promise<{ content: string; totalTokens?: number; toolCalls?: number }>;
  if (via === "gemini-cli") {
    const cliModel = flags["cli-model"];
    if (!cliModel || cliModel === "true")
      fail("--cli-model <gemini model id> is required with --via gemini-cli");
    send = async (p) => chatViaGeminiCli(cliModel, p);
    console.log(`Running knockout ${model} via gemini CLI (${cliModel})`);
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
      `Running knockout ${model} via ${litellmModel} @ ${baseUrl} (temp ${temperature ?? "provider default"}, max_tokens ${maxTokens})`,
    );
  }

  let prompt = basePrompt;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const { content, totalTokens, toolCalls } = await send(prompt);
    if (via === "gemini-cli" && (toolCalls ?? 0) > 0) {
      if (attempt === MAX_RETRIES)
        fail(
          `Transport used ${toolCalls} tool call(s) on every attempt — no-tools run violated`,
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
      const errors = [(err as Error).message];
      if (attempt === MAX_RETRIES) {
        fail(
          `Knockout run failed after ${MAX_RETRIES} attempts:\n- ${errors.join("\n- ")}`,
        );
      }
      console.log(`  attempt ${attempt}: ${errors[0]}, retrying`);
      prompt = `${basePrompt}\n\nYour previous reply was invalid. Fix this and reply with JSON only:\n- ${errors.join("\n- ")}`;
      continue;
    }

    const result = parseKnockoutRun(parsed);
    if (result.ok) {
      const tokenNote = totalTokens ? ` (${totalTokens} tokens)` : "";
      console.log(`  ok on attempt ${attempt}${tokenNote}`);
      const runFile = {
        ...result.run,
        engine,
        generatedAt: new Date().toISOString(),
      };
      writeFileSync(out, `${JSON.stringify(runFile, null, 2)}\n`);
      console.log(`Wrote knockout run to ${out}`);
      return;
    }
    if (attempt === MAX_RETRIES) {
      fail(
        `Knockout run failed validation after ${MAX_RETRIES} attempts:\n- ${result.errors.join("\n- ")}`,
      );
    }
    console.log(
      `  attempt ${attempt}: ${result.errors.length} validation issue(s), retrying`,
    );
    prompt = `${basePrompt}\n\nYour previous reply had these problems. Fix them and reply with JSON only:\n- ${result.errors.join("\n- ")}`;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
