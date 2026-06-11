// Claude Code CLI transport for the experiment runners. Used when the Anthropic API
// has no credits: `claude -p` runs headless on the local subscription with ALL tools
// disallowed, so the call is pure text generation. The JSON envelope reports the turn
// count — a single turn means no tool/hook round-trips happened.
import { spawnSync } from "node:child_process";

export interface ClaudeCliResult {
  content: string;
  totalTokens?: number;
  /** 0 when the reply took exactly one turn (no tool/hook round-trips). */
  toolCalls: number;
}

interface ClaudeJsonEnvelope {
  result?: string;
  is_error?: boolean;
  num_turns?: number;
  usage?: { input_tokens?: number; output_tokens?: number };
  errors?: unknown[];
}

/** Run one headless prompt through the Claude Code CLI and parse its JSON envelope. */
export function chatViaClaudeCli(
  cliModel: string,
  prompt: string,
): ClaudeCliResult {
  const res = spawnSync(
    "claude",
    [
      "-p",
      prompt,
      "--model",
      cliModel,
      "--disallowedTools",
      "*",
      "--output-format",
      "json",
    ],
    {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
      timeout: 20 * 60 * 1000,
      // Personal Stop hooks would inject a second turn and replace `result`.
      env: { ...process.env, STOP_COMPLETENESS_DISABLED: "1" },
    },
  );
  if (res.error)
    throw new Error(`claude CLI failed to start: ${res.error.message}`);
  if (res.status !== 0) {
    throw new Error(
      `claude CLI exited ${res.status}: ${(res.stderr || "").slice(-300)}`,
    );
  }

  let parsed: ClaudeJsonEnvelope;
  try {
    parsed = JSON.parse(res.stdout) as ClaudeJsonEnvelope;
  } catch {
    throw new Error(
      `claude CLI returned non-JSON output: ${res.stdout.slice(0, 200)}`,
    );
  }
  if (parsed.is_error || typeof parsed.result !== "string" || !parsed.result) {
    throw new Error(
      `claude CLI errored: ${JSON.stringify(parsed.errors ?? "no result").slice(0, 200)}`,
    );
  }

  const usage = parsed.usage;
  const totalTokens =
    usage && (usage.input_tokens || usage.output_tokens)
      ? (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0)
      : undefined;
  return {
    content: parsed.result,
    totalTokens,
    toolCalls: (parsed.num_turns ?? 1) > 1 ? 1 : 0,
  };
}
