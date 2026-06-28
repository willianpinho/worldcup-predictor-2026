// Zod schema for one model's STAGE-2 ("ground-truth-conditioned") knockout prediction.
//
// Unlike Stage 1 (src/lib/knockout/schema.ts), the qualifiers and the Round-of-32 draw are
// NOT the model's claim — they are the real FIFA outcome (src/lib/knockout-real/context.ts),
// identical for every model. The model only predicts the OUTCOMES from R32 to the final, so
// the brackets are directly comparable and scorable per-tie. This schema therefore additionally
// pins roundOf32 to the official draw; everything else (per-match validity, round progression,
// third-place = SF losers, champion = final winner) mirrors Stage 1.
import { z } from "zod";
import { CONDITIONS } from "../conditions";
import { normalizeTeam } from "../teams";
import { pairingKey, REAL_QUALIFIERS, REAL_R32_PAIRINGS } from "./context";

export const MODELS = ["claude", "gemini", "openai"] as const;
export type RealKnockoutModel = (typeof MODELS)[number];

const ModelEnum = z.enum(MODELS);
const Team = z.string().trim().min(1);
const Score = z.number().int().min(0).max(30);
const DecidedBy = z.enum(["regulation", "extra-time", "penalties"]);
const SLOT_RE = /^(R32-(?:[1-9]|1[0-6])|R16-[1-8]|QF-[1-4]|SF-[12]|TP|F)$/;

const KoMatch = z
  .object({
    slot: z
      .string()
      .regex(
        SLOT_RE,
        "slot must be R32-1..16, R16-1..8, QF-1..4, SF-1..2, TP or F",
      ),
    teamA: Team,
    teamB: Team,
    scoreA: Score,
    scoreB: Score,
    decidedBy: DecidedBy,
    pensA: z.number().int().min(0).max(30).optional(),
    pensB: z.number().int().min(0).max(30).optional(),
    winner: Team,
    reasoning: z.string().optional(),
  })
  .transform((m) => {
    // Resolve a literal "teamA"/"teamB" side keyword to the actual team name.
    if (m.winner === "teamA") return { ...m, winner: m.teamA };
    if (m.winner === "teamB") return { ...m, winner: m.teamB };
    return m;
  });
export type RealKoMatch = z.infer<typeof KoMatch>;

const GoldenBoot = z.object({
  player: z.string().trim().min(1),
  team: Team,
  goals: z.number().int().min(0).max(30).optional(),
});

const Rounds = z.object({
  roundOf32: z.array(KoMatch).length(16),
  roundOf16: z.array(KoMatch).length(8),
  quarterfinals: z.array(KoMatch).length(4),
  semifinals: z.array(KoMatch).length(2),
  thirdPlace: KoMatch,
  final: KoMatch,
});

const Base = z.object({
  model: ModelEnum,
  // Experiment arm — the access model used to produce the run (web/baseline/enriched).
  condition: z.enum(CONDITIONS).default("enriched"),
  generatedAt: z.iso.datetime({ offset: true }),
  engine: z.string().trim().min(1),
  notes: z.string().optional(),
  rounds: Rounds,
  champion: Team,
  goldenBoot: GoldenBoot.optional(),
});

const eq = (a: string, b: string) => normalizeTeam(a) === normalizeTeam(b);

/** Per-match: winner is one of the two teams; score/penalty rules hold; no self-play. */
function checkMatch(
  m: RealKoMatch,
  ctx: z.core.$RefinementCtx,
  where: string,
): void {
  if (eq(m.teamA, m.teamB))
    ctx.addIssue(`${where}: a team cannot play itself (${m.teamA})`);

  const winnerIsA = eq(m.winner, m.teamA);
  const winnerIsB = eq(m.winner, m.teamB);
  if (!winnerIsA && !winnerIsB)
    ctx.addIssue(
      `${where}: winner "${m.winner}" is not one of ${m.teamA} / ${m.teamB}`,
    );

  if (m.decidedBy === "penalties") {
    if (m.scoreA !== m.scoreB)
      ctx.addIssue(
        `${where}: penalties require a level score, got ${m.scoreA}–${m.scoreB}`,
      );
    if (m.pensA === undefined || m.pensB === undefined)
      ctx.addIssue(`${where}: penalties require pensA and pensB`);
    else if (m.pensA === m.pensB)
      ctx.addIssue(
        `${where}: penalty shootout cannot end level (${m.pensA}–${m.pensB})`,
      );
    else if (winnerIsA !== m.pensA > m.pensB)
      ctx.addIssue(
        `${where}: winner must match the penalty result (${m.pensA}–${m.pensB})`,
      );
  } else if (m.scoreA === m.scoreB) {
    ctx.addIssue(
      `${where}: ${m.decidedBy} cannot end level (${m.scoreA}–${m.scoreB}); use penalties`,
    );
  } else if (winnerIsA !== m.scoreA > m.scoreB) {
    ctx.addIssue(
      `${where}: winner must be the higher-scoring side (${m.scoreA}–${m.scoreB})`,
    );
  }
}

/** Every team of the child round must be a winner of the parent round. */
function checkRoundFeeds(
  children: RealKoMatch[],
  parents: RealKoMatch[],
  ctx: z.core.$RefinementCtx,
  where: string,
): void {
  const winners = new Set(parents.map((p) => normalizeTeam(p.winner)));
  children.forEach((m, i) => {
    for (const t of [m.teamA, m.teamB]) {
      if (!winners.has(normalizeTeam(t)))
        ctx.addIssue(
          `${where}[${i}]: "${t}" did not win a match in the previous round`,
        );
    }
  });
}

/** No two matches in a round may share a team. */
function checkNoDuplicates(
  round: RealKoMatch[],
  ctx: z.core.$RefinementCtx,
  where: string,
): void {
  const seen = new Set<string>();
  for (const m of round) {
    for (const t of [m.teamA, m.teamB]) {
      const key = normalizeTeam(t);
      if (seen.has(key))
        ctx.addIssue(`${where}: ${t} appears more than once in the round`);
      seen.add(key);
    }
  }
}

/** roundOf32 must reproduce the official draw exactly (order-independent pairing match). */
function checkRealR32(round: RealKoMatch[], ctx: z.core.$RefinementCtx): void {
  const seen = new Set<string>();
  for (const m of round) {
    for (const t of [m.teamA, m.teamB]) {
      if (!REAL_QUALIFIERS.has(normalizeTeam(t)))
        ctx.addIssue(`roundOf32: "${t}" is not one of the 32 real qualifiers`);
    }
    const key = pairingKey(m.teamA, m.teamB);
    if (!REAL_R32_PAIRINGS.has(key))
      ctx.addIssue(
        `roundOf32: "${m.teamA} vs ${m.teamB}" is not a real R32 tie — use the official draw`,
      );
    seen.add(key);
  }
  for (const real of REAL_R32_PAIRINGS) {
    if (!seen.has(real))
      ctx.addIssue(
        `roundOf32: missing the real tie ${real.replace("|", " vs ")}`,
      );
  }
}

export const RealKnockoutRunSchema = Base.superRefine((run, ctx) => {
  const { roundOf32, roundOf16, quarterfinals, semifinals, thirdPlace, final } =
    run.rounds;

  const allRounds: Array<[RealKoMatch[], string]> = [
    [roundOf32, "roundOf32"],
    [roundOf16, "roundOf16"],
    [quarterfinals, "quarterfinals"],
    [semifinals, "semifinals"],
    [[thirdPlace], "thirdPlace"],
    [[final], "final"],
  ];
  for (const [round, name] of allRounds) {
    round.forEach((m, i) => checkMatch(m, ctx, `${name}[${i}]`));
    if (round.length > 1) checkNoDuplicates(round, ctx, name);
  }

  // R32 is pinned to the official draw (this is what makes Stage 2 a shared bracket).
  checkRealR32(roundOf32, ctx);

  // Round progression: each round is a perfect matching of the previous round's winners.
  checkRoundFeeds(roundOf16, roundOf32, ctx, "roundOf16");
  checkRoundFeeds(quarterfinals, roundOf16, ctx, "quarterfinals");
  checkRoundFeeds(semifinals, quarterfinals, ctx, "semifinals");
  checkRoundFeeds([final], semifinals, ctx, "final");

  // Third-place match is contested by the two semi-final losers.
  const sfLosers = semifinals.map((sf) =>
    eq(sf.winner, sf.teamA) ? sf.teamB : sf.teamA,
  );
  const tpTeams = new Set([
    normalizeTeam(thirdPlace.teamA),
    normalizeTeam(thirdPlace.teamB),
  ]);
  for (const loser of sfLosers) {
    if (!tpTeams.has(normalizeTeam(loser)))
      ctx.addIssue(
        `thirdPlace: ${loser} (a semi-final loser) must contest the third-place match`,
      );
  }

  // Champion is the final's winner.
  if (!eq(run.champion, final.winner))
    ctx.addIssue(
      `champion "${run.champion}" must be the winner of the final (${final.winner})`,
    );
});

export type RealKnockoutRun = z.infer<typeof RealKnockoutRunSchema>;

export interface RealKnockoutParseError {
  ok: false;
  errors: string[];
}
export interface RealKnockoutParseOk {
  ok: true;
  run: RealKnockoutRun;
}

/** Validate a raw payload. On failure, returns flat "path — reason" messages. */
export function parseRealKnockoutRun(
  raw: unknown,
): RealKnockoutParseOk | RealKnockoutParseError {
  const result = RealKnockoutRunSchema.safeParse(raw);
  if (result.success) return { ok: true, run: result.data };
  const errors = result.error.issues.map((i) => {
    const path = i.path.length ? i.path.join(".") : "(root)";
    return `${path} — ${i.message}`;
  });
  return { ok: false, errors };
}
