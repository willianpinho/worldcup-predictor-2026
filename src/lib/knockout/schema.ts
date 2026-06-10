// Zod v4 schema for one model's FULL 2026 World Cup knockout-bracket prediction.
// Each AI derives its 32 qualifiers from ITS OWN group-stage scorelines, places them in
// the official Round-of-32 bracket, and predicts every tie to the champion. The schema
// validates internal consistency (winners, scores, penalties, bracket adjacency); the
// bracket STRUCTURE the model proposes is its own claim and part of the experiment.
import { z } from "zod";
import { normalizeTeam } from "../teams";

export const MODELS = ["claude", "gemini", "openai"] as const;
export type KnockoutModel = (typeof MODELS)[number];

const GROUPS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
] as const;

const ModelEnum = z.enum(MODELS);
const Team = z.string().trim().min(1);
const Score = z.number().int().min(0).max(30);

const DecidedBy = z.enum(["regulation", "extra-time", "penalties"]);

const SLOT_RE = /^(R32-(?:[1-9]|1[0-6])|R16-[1-8]|QF-[1-4]|SF-[12]|TP|F)$/;

const KoMatch = z.object({
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
});
export type KoMatch = z.infer<typeof KoMatch>;

const groupRecord = z.object(Object.fromEntries(GROUPS.map((g) => [g, Team])));

const Qualification = z.object({
  groupWinners: groupRecord,
  runnersUp: groupRecord,
  thirdPlaceAdvancing: z.array(Team).length(8),
});

const Rounds = z.object({
  roundOf32: z.array(KoMatch).length(16),
  roundOf16: z.array(KoMatch).length(8),
  quarterfinals: z.array(KoMatch).length(4),
  semifinals: z.array(KoMatch).length(2),
  thirdPlace: KoMatch,
  final: KoMatch,
});

const GoldenBoot = z.object({
  player: z.string().trim().min(1),
  team: Team,
  goals: z.number().int().min(0).max(30).optional(),
});

const Base = z.object({
  model: ModelEnum,
  generatedAt: z.iso.datetime({ offset: true }),
  engine: z.string().trim().min(1),
  notes: z.string().optional(),
  qualification: Qualification,
  rounds: Rounds,
  champion: Team,
  goldenBoot: GoldenBoot.optional(),
});

const eq = (a: string, b: string) => normalizeTeam(a) === normalizeTeam(b);
const has = (pool: Set<string>, t: string) => pool.has(normalizeTeam(t));

// Per-match: winner is one of the two teams, score/penalty rules hold, no team plays itself.
function checkMatch(
  m: KoMatch,
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
    else {
      const pensWinnerIsA = m.pensA > m.pensB;
      if (winnerIsA !== pensWinnerIsA)
        ctx.addIssue(
          `${where}: winner must match the penalty result (${m.pensA}–${m.pensB})`,
        );
    }
  } else {
    if (m.scoreA === m.scoreB)
      ctx.addIssue(
        `${where}: ${m.decidedBy} cannot end level (${m.scoreA}–${m.scoreB}); use penalties`,
      );
    else {
      const scoreWinnerIsA = m.scoreA > m.scoreB;
      if (winnerIsA !== scoreWinnerIsA)
        ctx.addIssue(
          `${where}: winner must be the higher-scoring side (${m.scoreA}–${m.scoreB})`,
        );
    }
  }
}

// The two teams of `child` must be the winners of its two `parents`, in order.
function checkAdjacency(
  child: KoMatch,
  parents: [KoMatch, KoMatch],
  ctx: z.core.$RefinementCtx,
  where: string,
): void {
  const [p0, p1] = parents;
  if (!eq(child.teamA, p0.winner))
    ctx.addIssue(
      `${where}.teamA "${child.teamA}" must be the winner of ${p0.slot} (${p0.winner})`,
    );
  if (!eq(child.teamB, p1.winner))
    ctx.addIssue(
      `${where}.teamB "${child.teamB}" must be the winner of ${p1.slot} (${p1.winner})`,
    );
}

// No two matches in a round may share a team.
function checkNoDuplicates(
  round: KoMatch[],
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

export const KnockoutRunSchema = Base.superRefine((run, ctx) => {
  const { roundOf32, roundOf16, quarterfinals, semifinals, thirdPlace, final } =
    run.rounds;

  // 1. Per-match validity + duplicates within each round.
  const allRounds: Array<[KoMatch[], string]> = [
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

  // 2. Every R32 team is one of the model's 32 qualifiers.
  const qualifiers = new Set<string>();
  for (const g of GROUPS) {
    qualifiers.add(normalizeTeam(run.qualification.groupWinners[g]));
    qualifiers.add(normalizeTeam(run.qualification.runnersUp[g]));
  }
  for (const t of run.qualification.thirdPlaceAdvancing)
    qualifiers.add(normalizeTeam(t));
  if (qualifiers.size !== 32)
    ctx.addIssue(
      `qualification: expected 32 distinct qualifiers, got ${qualifiers.size}`,
    );
  for (const m of roundOf32) {
    for (const t of [m.teamA, m.teamB]) {
      if (!has(qualifiers, t))
        ctx.addIssue(`roundOf32: ${t} is not among the 32 qualifiers`);
    }
  }

  // 3. Bracket adjacency: roundOf16[i] fed by roundOf32[2i], roundOf32[2i+1]; same upward.
  roundOf16.forEach((m, i) =>
    checkAdjacency(
      m,
      [roundOf32[2 * i], roundOf32[2 * i + 1]],
      ctx,
      `roundOf16[${i}]`,
    ),
  );
  quarterfinals.forEach((m, i) =>
    checkAdjacency(
      m,
      [roundOf16[2 * i], roundOf16[2 * i + 1]],
      ctx,
      `quarterfinals[${i}]`,
    ),
  );
  semifinals.forEach((m, i) =>
    checkAdjacency(
      m,
      [quarterfinals[2 * i], quarterfinals[2 * i + 1]],
      ctx,
      `semifinals[${i}]`,
    ),
  );
  checkAdjacency(final, [semifinals[0], semifinals[1]], ctx, "final");

  // 4. Third-place match is contested by the two semi-final losers.
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

  // 5. Champion is the final's winner.
  if (!eq(run.champion, final.winner))
    ctx.addIssue(
      `champion "${run.champion}" must be the winner of the final (${final.winner})`,
    );
});

export type KnockoutRun = z.infer<typeof KnockoutRunSchema>;

export interface KnockoutParseError {
  ok: false;
  /** Flat, human-readable lines ("path — reason"). */
  errors: string[];
}
export interface KnockoutParseOk {
  ok: true;
  run: KnockoutRun;
}

/** Validate a raw payload. On failure, returns flat "path — reason" messages. */
export function parseKnockoutRun(
  raw: unknown,
): KnockoutParseOk | KnockoutParseError {
  const result = KnockoutRunSchema.safeParse(raw);
  if (result.success) return { ok: true, run: result.data };
  const errors = result.error.issues.map((i) => {
    const path = i.path.length ? i.path.join(".") : "(root)";
    return `${path} — ${i.message}`;
  });
  return { ok: false, errors };
}
