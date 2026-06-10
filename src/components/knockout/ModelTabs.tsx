import Link from "next/link";
import { MODELS, type KnockoutModel } from "@/lib/knockout/schema";

const LABEL: Record<KnockoutModel, string> = {
  claude: "Claude",
  gemini: "Gemini",
  openai: "OpenAI",
};
const ACTIVE: Record<KnockoutModel, string> = {
  claude: "border-claude text-claude",
  gemini: "border-gemini text-gemini",
  openai: "border-openai text-openai",
};

/** Tab links that set ?model=… — pure navigation, no client JS. */
export function ModelTabs({ active }: { active: KnockoutModel }) {
  return (
    <nav className="flex gap-1 border-b border-border">
      {MODELS.map((m) => {
        const isActive = m === active;
        return (
          <Link
            key={m}
            href={`/knockout?model=${m}`}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? ACTIVE[m]
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {LABEL[m]}
          </Link>
        );
      })}
    </nav>
  );
}
