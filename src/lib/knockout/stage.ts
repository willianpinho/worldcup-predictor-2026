// Shared knockout-stage helpers: the canonical stage codes, the mapping from
// openfootball round names to those codes, and the column order used by the UI.
// Kept provider/UI-agnostic so both the ingestion pipeline and the bracket render
// agree on what "R32".."F" mean.

import type { FixtureStage } from "../providers/index";

/** Knockout stages in bracket order (group stage is handled separately). */
export const KO_STAGES = ["R32", "R16", "QF", "SF", "TP", "F"] as const;
export type KoStage = (typeof KO_STAGES)[number];

const ROUND_TO_STAGE: Record<string, KoStage> = {
  "round of 32": "R32",
  "round of 16": "R16",
  "quarter-final": "QF",
  "quarter-finals": "QF",
  "semi-final": "SF",
  "semi-finals": "SF",
  "match for third place": "TP",
  "third place play-off": "TP",
  final: "F",
};

/** Map an openfootball `round` label to a stage code, or null if it is not a KO round. */
export function roundNameToStage(round: string | undefined): KoStage | null {
  if (!round) return null;
  return ROUND_TO_STAGE[round.trim().toLowerCase()] ?? null;
}

/** True for any non-group stage. */
export function isKnockoutStage(stage: string): stage is KoStage {
  return (KO_STAGES as readonly string[]).includes(stage);
}

/** Human-readable column title for a stage. */
export const STAGE_TITLE: Record<KoStage, string> = {
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-finals",
  SF: "Semi-finals",
  TP: "Third place",
  F: "Final",
};

// Re-export the provider's stage union for convenience at call sites.
export type { FixtureStage };
