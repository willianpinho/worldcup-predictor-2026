import type { Condition } from "./conditions";
import { prisma } from "./db";
import {
  matchPoints,
  summarize,
  type ModelSummary,
  type Result,
  type ScoredPrediction,
} from "./scoring";

export const MODELS = ["claude", "gemini", "openai"] as const;
export type ModelId = (typeof MODELS)[number];

function isModel(value: string): value is ModelId {
  return (MODELS as readonly string[]).includes(value);
}

function emptyByModel<T>(make: () => T): Record<ModelId, T> {
  return { claude: make(), gemini: make(), openai: make() };
}

function resultOf(m: {
  status: string;
  scoreA: number | null;
  scoreB: number | null;
}): Result | null {
  return m.status === "FINISHED" && m.scoreA !== null && m.scoreB !== null
    ? { scoreA: m.scoreA, scoreB: m.scoreB }
    : null;
}

export interface PredView {
  predA: number;
  predB: number;
  probWinA: number | null;
  probDraw: number | null;
  probWinB: number | null;
  confidence: string | null;
  reasoning: string | null;
  points: number | null; // null until the match is finished
}

export interface MatchView {
  id: number;
  groupName: string;
  round: number;
  teamA: string;
  teamB: string;
  venue: string | null;
  city: string | null;
  kickoff: Date;
  status: string;
  scoreA: number | null;
  scoreB: number | null;
  predictions: Record<ModelId, PredView | null>;
}

export async function getMatches(
  condition: Condition = "web",
): Promise<MatchView[]> {
  const rows = await prisma.match.findMany({
    orderBy: [{ kickoff: "asc" }, { id: "asc" }],
    include: { predictions: { where: { condition } } },
  });

  return rows.map((m) => {
    const result = resultOf(m);
    const predictions = emptyByModel<PredView | null>(() => null);
    for (const p of m.predictions) {
      if (!isModel(p.model)) continue;
      predictions[p.model] = {
        predA: p.predA,
        predB: p.predB,
        probWinA: p.probWinA,
        probDraw: p.probDraw,
        probWinB: p.probWinB,
        confidence: p.confidence,
        reasoning: p.reasoning,
        points: result ? matchPoints(p, result) : null,
      };
    }
    return {
      id: m.id,
      groupName: m.groupName,
      round: m.round,
      teamA: m.teamA,
      teamB: m.teamB,
      venue: m.venue,
      city: m.city,
      kickoff: m.kickoff,
      status: m.status,
      scoreA: m.scoreA,
      scoreB: m.scoreB,
      predictions,
    };
  });
}

export interface Leaderboard {
  totalMatches: number;
  playedMatches: number;
  predictedMatches: Record<ModelId, number>;
  summary: Record<ModelId, ModelSummary>;
}

export async function getLeaderboard(
  condition: Condition = "web",
): Promise<Leaderboard> {
  const rows = await prisma.match.findMany({
    include: { predictions: { where: { condition } } },
  });

  const perModel = emptyByModel<ScoredPrediction[]>(() => []);
  const predicted = emptyByModel<number>(() => 0);
  let played = 0;

  for (const m of rows) {
    const result = resultOf(m);
    if (result) played += 1;
    for (const p of m.predictions) {
      if (!isModel(p.model)) continue;
      predicted[p.model] += 1;
      perModel[p.model].push({
        predA: p.predA,
        predB: p.predB,
        probWinA: p.probWinA,
        probDraw: p.probDraw,
        probWinB: p.probWinB,
        result,
      });
    }
  }

  const summary = emptyByModel<ModelSummary>(() => summarize([]));
  for (const model of MODELS) summary[model] = summarize(perModel[model]);

  return {
    totalMatches: rows.length,
    playedMatches: played,
    predictedMatches: predicted,
    summary,
  };
}
