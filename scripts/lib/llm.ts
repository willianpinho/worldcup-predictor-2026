// Shared helpers for the experiment runner scripts (run-model.ts, run-knockout.ts).
// Talks to a LiteLLM OpenAI-compatible gateway via global fetch (no SDK, no new deps).
// No secrets are ever logged: the API key is read from env and only sent in the header.

export interface GatewayConfig {
  /** Base URL of the LiteLLM gateway, e.g. http://localhost:4000. */
  baseUrl: string;
  /** Gateway model name to route to (LiteLLM model id). */
  model: string;
  /** Bearer key (from LITELLM_API_KEY). */
  apiKey: string;
  temperature: number;
  maxTokens?: number;
}

export interface ChatResult {
  content: string;
  /** Total tokens reported by the gateway, if any. */
  totalTokens?: number;
}

/** A minimal view of the OpenAI-compatible chat completion response we rely on. */
interface ChatCompletion {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { total_tokens?: number };
  error?: { message?: string };
}

/** POST a single user message to /v1/chat/completions and return the text + token usage. */
export async function chat(
  cfg: GatewayConfig,
  prompt: string,
): Promise<ChatResult> {
  const body: Record<string, unknown> = {
    model: cfg.model,
    temperature: cfg.temperature,
    messages: [{ role: "user", content: prompt }],
  };
  if (cfg.maxTokens !== undefined) body.max_tokens = cfg.maxTokens;

  const res = await fetch(
    `${cfg.baseUrl.replace(/\/$/, "")}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify(body),
    },
  );

  const text = await res.text();
  let data: ChatCompletion;
  try {
    data = JSON.parse(text) as ChatCompletion;
  } catch {
    throw new Error(
      `Gateway returned non-JSON (${res.status}): ${text.slice(0, 200)}`,
    );
  }
  if (!res.ok) {
    throw new Error(
      `Gateway error ${res.status}: ${data.error?.message ?? text.slice(0, 200)}`,
    );
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new Error("Gateway response had no message content");
  }
  return { content, totalTokens: data.usage?.total_tokens };
}

/** Strip a leading/trailing markdown code fence (```json … ```), if present. */
export function stripFences(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);
  return (fenced ? fenced[1] : trimmed).trim();
}

/** Strip fences then JSON.parse, throwing a readable error on failure. */
export function parseJson(raw: string): unknown {
  const cleaned = stripFences(raw);
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `Could not parse model output as JSON: ${(err as Error).message}`,
    );
  }
}

/** Read a required env var or exit with a clear, non-leaking message. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

/** Tiny flag parser: `--key value` and `--flag` (boolean). Returns a string map. */
export function parseFlags(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      out[key] = "true";
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

/** Exit with a usage message and non-zero status. */
export function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
