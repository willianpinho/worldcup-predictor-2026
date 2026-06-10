// Experiment arms ("conditions"). Each prediction belongs to exactly one arm, so the
// same (match, model) can hold three independent predictions — one per arm. This is the
// single source of truth for the arm list, the type guard, and per-arm UI metadata.

export const CONDITIONS = ["web", "baseline", "enriched"] as const;

export type Condition = (typeof CONDITIONS)[number];

export function isCondition(value: string): value is Condition {
  return (CONDITIONS as readonly string[]).includes(value);
}

/** Resolve the `?arm=` search param to a valid condition, defaulting to "web". */
export function parseArm(raw: string | string[] | undefined): Condition {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && isCondition(value) ? value : "web";
}

export interface ConditionMeta {
  /** Full label for headings. */
  label: string;
  /** Compact label for pills/badges. */
  short: string;
  /** One line describing what the arm tests. */
  description: string;
}

export const CONDITION_META: Record<Condition, ConditionMeta> = {
  web: {
    label: "Web",
    short: "Web",
    description: "Chat + live web access — free sourcing.",
  },
  baseline: {
    label: "Baseline",
    short: "Baseline",
    description: "API, no tools — internal model knowledge only.",
  },
  enriched: {
    label: "Enriched",
    short: "Enriched",
    description:
      "API, no tools + standardized context block (same data for every model).",
  },
};
