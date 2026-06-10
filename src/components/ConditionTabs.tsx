import Link from "next/link";
import { CONDITION_META, CONDITIONS, type Condition } from "@/lib/conditions";

// Pill tabs for the experiment arms, mirroring standings/ViewTabs. Link-based (no client
// JS): each tab points back to the SAME page path with ?arm=<condition>. The default arm
// (web) omits the param to keep canonical URLs clean.
const ARM_ACTIVE: Record<Condition, string> = {
  web: "bg-accent/15 text-accent ring-accent/40",
  baseline: "bg-claude/15 text-claude ring-claude/40",
  enriched: "bg-gemini/15 text-gemini ring-gemini/40",
};

export function ConditionTabs({
  path,
  current,
}: {
  /** Page path the tabs live on, e.g. "/" or "/matches". */
  path: string;
  current: Condition;
}) {
  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="tablist"
      aria-label="Experiment arm"
    >
      {CONDITIONS.map((arm) => {
        const isActive = arm === current;
        const href = arm === "web" ? path : `${path}?arm=${arm}`;
        return (
          <Link
            key={arm}
            href={href}
            role="tab"
            aria-selected={isActive}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 transition-colors ${
              isActive
                ? ARM_ACTIVE[arm]
                : "bg-surface-2 text-muted ring-transparent hover:bg-surface-2/70 hover:text-foreground"
            }`}
          >
            {CONDITION_META[arm].short}
          </Link>
        );
      })}
    </div>
  );
}
