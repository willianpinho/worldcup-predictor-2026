// The /knockout tab selector: the real bracket ("actual") plus each model's
// predicted bracket. Parsed from ?model=… with "actual" as the default.

import { MODELS, type KnockoutModel } from "./schema";

export type KnockoutView = "actual" | KnockoutModel;

const VIEWS: readonly string[] = ["actual", ...MODELS];

/** Resolve ?model=… to a view; anything unrecognized falls back to "actual". */
export function resolveView(raw: string | string[] | undefined): KnockoutView {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return VIEWS.includes(value ?? "") ? (value as KnockoutView) : "actual";
}
