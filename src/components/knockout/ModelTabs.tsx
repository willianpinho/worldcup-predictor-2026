import Link from "next/link";
import type { KnockoutView } from "@/lib/knockout/view";

const TABS: Array<{ view: KnockoutView; label: string; active: string }> = [
  { view: "actual", label: "Actual", active: "border-accent text-accent" },
  { view: "claude", label: "Claude", active: "border-claude text-claude" },
  { view: "gemini", label: "Gemini", active: "border-gemini text-gemini" },
  { view: "openai", label: "OpenAI", active: "border-openai text-openai" },
];

/** Tab links that set ?model=… — pure navigation, no client JS. Default is "actual". */
export function ModelTabs({ active }: { active: KnockoutView }) {
  return (
    <nav className="flex gap-1 border-b border-border">
      {TABS.map((t) => {
        const isActive = t.view === active;
        const href =
          t.view === "actual" ? "/knockout" : `/knockout?model=${t.view}`;
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
