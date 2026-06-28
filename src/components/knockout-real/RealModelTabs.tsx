import Link from "next/link";
import type { RealKnockoutView } from "@/lib/knockout-real/view";

const TABS: Array<{ view: RealKnockoutView; label: string; active: string }> = [
  {
    view: "actual",
    label: "Live bracket",
    active: "border-accent text-accent",
  },
  { view: "claude", label: "Claude", active: "border-claude text-claude" },
  { view: "gemini", label: "Gemini", active: "border-gemini text-gemini" },
  { view: "openai", label: "OpenAI", active: "border-openai text-openai" },
];

/** Tab links that set ?model=… on /knockout-2 — pure navigation. Default is "actual". */
export function RealModelTabs({ active }: { active: RealKnockoutView }) {
  return (
    <nav className="flex gap-1 border-b border-border">
      {TABS.map((t) => {
        const isActive = t.view === active;
        const href =
          t.view === "actual" ? "/knockout-2" : `/knockout-2?model=${t.view}`;
        return (
          <Link
            key={t.view}
            href={href}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? t.active
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
