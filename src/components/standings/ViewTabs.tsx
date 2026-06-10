import Link from "next/link";
import type { StandingsView } from "@/lib/standings-view";

const TABS: Array<{ view: StandingsView; label: string; active: string }> = [
  {
    view: "actual",
    label: "Actual",
    active: "bg-accent/15 text-accent ring-accent/40",
  },
  {
    view: "claude",
    label: "Claude",
    active: "bg-claude/15 text-claude ring-claude/40",
  },
  {
    view: "gemini",
    label: "Gemini",
    active: "bg-gemini/15 text-gemini ring-gemini/40",
  },
  {
    view: "openai",
    label: "OpenAI",
    active: "bg-openai/15 text-openai ring-openai/40",
  },
];

export function ViewTabs({ current }: { current: StandingsView }) {
  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="tablist"
      aria-label="Standings view"
    >
      {TABS.map((t) => {
        const isActive = t.view === current;
        const href =
          t.view === "actual" ? "/standings" : `/standings?view=${t.view}`;
        return (
          <Link
            key={t.view}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition-colors ${
              isActive
                ? t.active
                : "bg-surface-2 text-muted ring-transparent hover:bg-surface-2/70 hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
