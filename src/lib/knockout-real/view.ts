// The /knockout-2 tab selector: the live real bracket ("actual") plus each model's
// Stage-2 (ground-truth-conditioned) bracket. Parsed from ?model=…; default "actual".
import { MODELS, type RealKnockoutModel } from "./schema";

export type RealKnockoutView = "actual" | RealKnockoutModel;

const VIEWS: readonly string[] = ["actual", ...MODELS];

/** Resolve ?model=… to a view; anything unrecognized falls back to "actual". */
export function resolveRealView(
  raw: string | string[] | undefined,
): RealKnockoutView {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return VIEWS.includes(value ?? "") ? (value as RealKnockoutView) : "actual";
}
