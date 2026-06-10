// Gemini CLI transport for the experiment runners. Used when the Gemini API key has no
// credits: the CLI authenticates via OAuth (Google AI Ultra) and exposes per-call tool
// stats, so the "API, no tools" arms are VERIFIED per request (stats.tools.totalCalls
// must be 0) instead of merely instructed.
import { spawnSync } from "node:child_process";

export interface CliChatResult {
  content: string;
  totalTokens?: number;
  /** Tool invocations the CLI made for this prompt (0 = pure text generation). */
  toolCalls: number;
}

interface CliJsonOutput {
  response?: string;
  stats?: {
    models?: Record<string, { tokens?: { total?: number } }>;
    tools?: { totalCalls?: number };
  };
}

/** Run one headless prompt through the Gemini CLI and parse its JSON envelope. */
export function chatViaGeminiCli(
  cliModel: string,
  prompt: string,
): CliChatResult {
  const res = spawnSync(
    "gemini",
    ["-m", cliModel, "-o", "json", "--skip-trust", "-p", prompt],
    {
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 64 * 1024 * 1024,
      timeout: 15 * 60 * 1000,
    },
  );
  if (res.error)
    throw new Error(`gemini CLI failed to start: ${res.error.message}`);
  if (res.status !== 0) {
    throw new Error(
      `gemini CLI exited ${res.status}: ${(res.stderr || "").slice(-300)}`,
    );
  }

  let parsed: CliJsonOutput;
  try {
    parsed = JSON.parse(res.stdout) as CliJsonOutput;
  } catch {
    throw new Error(
      `gemini CLI returned non-JSON output: ${res.stdout.slice(0, 200)}`,
    );
  }
  if (typeof parsed.response !== "string" || parsed.response.length === 0) {
    throw new Error("gemini CLI JSON output had no response text");
  }

  const models = parsed.stats?.models ?? {};
  const totalTokens = Object.values(models).reduce(
    (sum, m) => sum + (m.tokens?.total ?? 0),
    0,
  );
  return {
    content: parsed.response,
    totalTokens: totalTokens || undefined,
    toolCalls: parsed.stats?.tools?.totalCalls ?? 0,
  };
}
