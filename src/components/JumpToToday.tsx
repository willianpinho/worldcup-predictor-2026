"use client";

import { useEffect } from "react";

/**
 * Auto-jump to the server-selected "today" section on first load.
 *
 * Why a client island instead of an inline script: the app ships a strict
 * Content-Security-Policy (see next.config.ts). An external bundled module
 * keeps `script-src` clean and matches the project's intent of limiting
 * inline scripts to the Next.js runtime + the Cloudflare beacon.
 *
 * `behavior: "auto"` (instant) is deliberate — no smooth animation means no
 * jarring scroll flash, and reduced-motion preferences are moot.
 *
 * Guard order matters: we skip when the user deep-linked (an existing hash)
 * or has already scrolled, so we never fight a deliberate position.
 *
 * `anchorId` is the DOM id of the target section (e.g. "today").
 */
export function JumpToToday({ anchorId }: { anchorId: string }) {
  useEffect(() => {
    if (window.location.hash) return;
    if (window.scrollY > 0) return;
    const el = document.getElementById(anchorId);
    if (!el) return;
    el.scrollIntoView({ behavior: "auto", block: "start" });
  }, [anchorId]);

  return null;
}
