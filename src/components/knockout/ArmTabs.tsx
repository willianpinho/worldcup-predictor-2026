import Link from "next/link";
import { CONDITION_META, CONDITIONS, type Condition } from "@/lib/conditions";
import type { KnockoutModel } from "@/lib/knockout/schema";

// Secondary pill tabs selecting which experiment arm's bracket to show for the
// active model. Web (the default) keeps the canonical URL without ?arm=.
const ACTIVE: Record<Condition, string> = {
  web: "bg-accent/15 text-accent ring-accent/40",
  baseline: "bg-claude/15 text-claude ring-claude/40",
  enriched: "bg-gemini/15 text-gemini ring-gemini/40",
};

export function ArmTabs({
  model,
  current,
}: {
  model: KnockoutModel;
  current: Condition;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="tablist"
      aria-label="Experiment arm"
    >
      {CONDITIONS.map((arm) => {
        const isActive = arm === current;
        const href =
          arm === "web"
            ? `/knockout?model=${model}`
            : `/knockout?model=${model}&arm=${arm}`;
        return (
          <Link
            key={arm}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors ${
              isActive
                ? ACTIVE[arm]
                : "bg-surface-2 text-muted ring-transparent hover:bg-surface-2/70 hover:text-foreground"
            }`}
          >
            {CONDITION_META[arm].label}
          </Link>
        );
      })}
    </div>
  );
}
