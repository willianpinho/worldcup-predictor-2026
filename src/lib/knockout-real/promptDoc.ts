// Server-only loader for the Stage-2 prompt text shown on /prompt. Reads the `## Prompt`
// block of docs/PROMPT-KNOCKOUT-REAL.md — the SAME source the runner uses
// (scripts/run-knockout-real.ts), so the page and the recorded runs never drift. docs/ ships
// in the runtime image (Dockerfile `COPY . .`), so the read works in production.
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The fenced ```text … ``` prompt block under "## Prompt", or "" if not found. */
export function loadStage2PromptText(): string {
  try {
    const doc = readFileSync(
      join(process.cwd(), "docs/PROMPT-KNOCKOUT-REAL.md"),
      "utf8",
    );
    const m = doc.match(/##\s+Prompt\s*\n+```text\n([\s\S]*?)\n```/);
    return m ? m[1].trim() : "";
  } catch {
    return "";
  }
}
