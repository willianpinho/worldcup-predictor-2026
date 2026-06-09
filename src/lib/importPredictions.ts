import { z } from "zod";
import { prisma } from "./db";
import { normalizeTeam, pairKey } from "./teams";

const PredictionItem = z.object({
  group: z.string().optional(),
  teamA: z.string().min(1),
  teamB: z.string().min(1),
  scoreA: z.number().int().min(0).max(30),
  scoreB: z.number().int().min(0).max(30),
  probWinA: z.number().min(0).max(100).optional(),
  probDraw: z.number().min(0).max(100).optional(),
  probWinB: z.number().min(0).max(100).optional(),
  confidence: z.string().optional(),
  reasoning: z.string().optional(),
});

export const ImportSchema = z.object({
  model: z.enum(["claude", "gemini", "openai"]),
  predictions: z.array(PredictionItem).min(1),
});

export type ImportPayload = z.infer<typeof ImportSchema>;

export interface ImportReport {
  model: string;
  total: number;
  imported: number;
  unmatched: string[];
}

/**
 * Validate and persist one model's predictions. Each item is matched to a fixture
 * by team pair (order/group-independent); scores and win-probabilities are
 * re-oriented to the stored teamA/teamB. Existing predictions are overwritten.
 */
export async function importPredictions(raw: unknown): Promise<ImportReport> {
  const payload = ImportSchema.parse(raw);

  const rows = await prisma.match.findMany();
  const byPair = new Map(rows.map((m) => [pairKey(m.teamA, m.teamB), m]));

  const unmatched: string[] = [];
  let imported = 0;

  for (const p of payload.predictions) {
    const row = byPair.get(pairKey(p.teamA, p.teamB));
    if (!row) {
      unmatched.push(`${p.teamA} x ${p.teamB}`);
      continue;
    }

    const swap = normalizeTeam(p.teamA) === normalizeTeam(row.teamB);
    const predA = swap ? p.scoreB : p.scoreA;
    const predB = swap ? p.scoreA : p.scoreB;
    const probWinA = swap ? p.probWinB : p.probWinA;
    const probWinB = swap ? p.probWinA : p.probWinB;

    const data = {
      predA,
      predB,
      probWinA: probWinA ?? null,
      probDraw: p.probDraw ?? null,
      probWinB: probWinB ?? null,
      confidence: p.confidence ?? null,
      reasoning: p.reasoning ?? null,
    };

    await prisma.prediction.upsert({
      where: { matchId_model: { matchId: row.id, model: payload.model } },
      create: { matchId: row.id, model: payload.model, ...data },
      update: data,
    });
    imported += 1;
  }

  return { model: payload.model, total: payload.predictions.length, imported, unmatched };
}
