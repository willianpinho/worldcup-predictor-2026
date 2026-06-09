"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — no-op.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md bg-surface-2 px-3 py-1 text-xs text-muted transition-colors hover:text-foreground"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}
