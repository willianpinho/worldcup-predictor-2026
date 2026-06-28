# Stage-2 knockout prompt — ground-truth-conditioned (JSON output)

The **second experimental stage**, run after the real group stage finished. Where Stage 1
(`docs/PROMPT-KNOCKOUT.md`) was **self-conditioned** — each model chained its bracket on _its own_
predicted group scorelines — Stage 2 is **ground-truth-conditioned**: every model starts from the
**actual** FIFA group-stage results and the **official Round-of-32 draw**, which are _exogenous and
identical for all models_. This removes the "wrong qualifiers" confound and makes the brackets
directly comparable and scorable **per tie**.

The shared ground truth (final group tables, the 32 qualifiers, the official R32 draw) is snapshotted
from the FIFA API into `docs/context/real-groups-2026.json` by `scripts/build-real-context.ts` and is
appended to the prompt as the INPUT block (rendered by `src/lib/knockout-real/promptContext.ts`).

The model predicts **only the knockout outcomes** — there is no `qualification` block to produce, because
qualification is given. The response is **JSON only** and must match this shape (validated by Zod in
`src/lib/knockout-real/schema.ts`):

```json
{
  "model": "claude",
  "generatedAt": "2026-06-28T12:00:00Z",
  "engine": "Claude Opus 4.8",
  "notes": "<optional>",
  "rounds": {
    "roundOf32": [
      {
        "slot": "R32-1",
        "teamA": "South Africa",
        "teamB": "Canada",
        "scoreA": 1,
        "scoreB": 2,
        "decidedBy": "regulation",
        "winner": "Canada",
        "reasoning": "One sentence with the main signal."
      }
    ],
    "roundOf16": [],
    "quarterfinals": [],
    "semifinals": [],
    "thirdPlace": {
      "slot": "TP",
      "teamA": "...",
      "teamB": "...",
      "scoreA": 1,
      "scoreB": 1,
      "decidedBy": "penalties",
      "pensA": 4,
      "pensB": 3,
      "winner": "..."
    },
    "final": {
      "slot": "F",
      "teamA": "...",
      "teamB": "...",
      "scoreA": 2,
      "scoreB": 0,
      "decidedBy": "regulation",
      "winner": "..."
    }
  },
  "champion": "...",
  "goldenBoot": { "player": "...", "team": "...", "goals": 6 }
}
```

- The **16 `roundOf32` ties are fixed** by the official draw in the INPUT block — keep both teams of
  each tie exactly (home/away order may vary; the app normalizes it). Only the scores/winner are yours.
- `slot` labels: `R32-1`..`R32-16`, `R16-1`..`R16-8`, `QF-1`..`QF-4`, `SF-1`/`SF-2`, `TP`, `F`.
- `scoreA`/`scoreB` are the score **after extra time** (the full result). On a draw that goes to
  penalties, set `decidedBy: "penalties"`, keep `scoreA === scoreB`, and add `pensA`/`pensB` (distinct).
- `decidedBy` ∈ {`regulation`, `extra-time`, `penalties`}. `extra-time` means the score is **no longer
  level** after 120' (e.g. 2–1); a level score with `extra-time` is invalid — use `penalties`.
- `winner` is the winning team's **name**, matching `teamA` or `teamB` of that tie.

The app validates internal consistency: the R32 ties reproduce the official draw, winners match
scores/penalties, every team in a round won a match in the previous round, the third-place match is the
two semi-final losers, and the champion is the final's winner.

---

## Prompt

```text
You are a quantitative football analyst. You will predict the COMPLETE knockout stage of the
2026 FIFA World Cup (hosted by the USA, Canada and Mexico; 48 teams; new 32-team knockout:
Round of 32 → Round of 16 → Quarter-finals → Semi-finals → Third-place match → Final).

The group stage is OVER. Appended after these instructions is the REAL ground truth: the final
group tables, the 32 qualified teams, and the OFFICIAL Round-of-32 draw. Treat all of it as fact.
Do NOT re-predict the group stage and do NOT change who plays whom in the Round of 32.

STEP 1 — Round of 32. For EACH of the 16 official ties (listed in the INPUT as R32-1 … R32-16),
keep both teams exactly as drawn and predict the result: the score after 90' or extra time, set
"decidedBy" (regulation, extra-time or penalties), and on a draw add the shootout ("pensA"/"pensB").
Give the "winner" (the team name) and a one-sentence "reasoning".

STEP 2 — Advance the bracket. Carry each tie's winner forward: Round of 16 (8 ties), Quarter-finals
(4), Semi-finals (2), the Third-place match (the two beaten semi-finalists) and the Final. The
pairing topology from R16 onward follows the bracket the R32 winners feed into.

STEP 3 — Champion and Golden Boot. Name the "champion" (= the final's winner) and a "goldenBoot"
pick (player, team, expected "goals"). Pick the player only from the 32 qualified teams.

RULE: "extra-time" means the score is NO LONGER LEVEL after 120 minutes (e.g. 2–1); if the score is
still level after extra time, you MUST use "penalties" with "pensA"/"pensB" (distinct integers). A
level score with decidedBy "extra-time" is invalid.

Weigh squad strength, form and momentum SHOWN IN THE GROUP STAGE just played (who impressed, who
struggled, goals scored/conceded), key-player form, injuries/suspensions picked up in the groups,
tactics, head-to-head, fatigue/rotation, venue context (altitude, heat, travel) and host advantage.
Be calibrated — prefer honest accuracy over false confidence. Do not invent teams: every team must
come from the qualifiers and the official draw provided.

RESPOND WITH VALID JSON ONLY, no text before or after, in exactly this shape:

{
  "model": "claude",
  "generatedAt": "<ISO-8601 instant>",
  "engine": "<your model build, e.g. Claude Opus 4.8>",
  "notes": "<optional>",
  "rounds": {
    "roundOf32": [
      { "slot": "R32-1", "teamA": "<as drawn>", "teamB": "<as drawn>", "scoreA": <int>, "scoreB": <int>, "decidedBy": "regulation|extra-time|penalties", "pensA": <int>, "pensB": <int>, "winner": "<winning team name>", "reasoning": "<one sentence>" }
    ],
    "roundOf16": [ ...8 ties (R16-1..R16-8)... ],
    "quarterfinals": [ ...4 ties (QF-1..QF-4)... ],
    "semifinals": [ ...2 ties (SF-1, SF-2)... ],
    "thirdPlace": { "slot": "TP", "...": "..." },
    "final": { "slot": "F", "...": "..." }
  },
  "champion": "<team>",
  "goldenBoot": { "player": "<name>", "team": "<team>", "goals": <int> }
}

Include all 16 + 8 + 4 + 2 + 1 + 1 = 32 knockout matches. Omit "pensA"/"pensB" unless the tie went to
penalties. Do not invent teams, players or statistics.
```

> For Gemini, change `"model": "claude"` to `"model": "gemini"`; for OpenAI, to `"openai"`.
> The real ground-truth block (final tables + official R32 draw) is appended as the INPUT by the runner.
