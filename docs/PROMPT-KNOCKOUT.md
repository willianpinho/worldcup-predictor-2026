# Knockout-bracket prompt (JSON output)

Second stage of the experiment. After the group-stage run (`docs/PROMPT.md`), each model
predicts the **full knockout bracket** of the 2026 FIFA World Cup — Round of 32 through the
final — starting from **its own** group-stage scorelines.

Paste the prompt below into **Claude**, **Gemini / Antigravity** and **OpenAI**, then append
that model's own 72 group-stage predictions (the JSON it returned for `docs/PROMPT.md`) as the
input block. Set `"model"` to `"claude"`, `"gemini"` or `"openai"`. The response is **JSON only**.

The JSON must match this shape (validated by Zod):

```json
{
  "model": "claude",
  "generatedAt": "2026-06-10T12:00:00Z",
  "engine": "Claude Opus 4.8",
  "qualification": {
    "groupWinners": { "A": "Mexico", "B": "...", "L": "..." },
    "runnersUp": { "A": "...", "L": "..." },
    "thirdPlaceAdvancing": ["...", "...8 teams..."]
  },
  "rounds": {
    "roundOf32": [
      {
        "slot": "R32-1",
        "teamA": "Mexico",
        "teamB": "...",
        "scoreA": 2,
        "scoreB": 1,
        "decidedBy": "regulation",
        "winner": "Mexico",
        "reasoning": "Home advantage in front of a hostile crowd."
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

- `slot` labels: `R32-1`..`R32-16`, `R16-1`..`R16-8`, `QF-1`..`QF-4`, `SF-1`/`SF-2`, `TP`, `F`.
- `scoreA`/`scoreB` are the score **after extra time** (the full result). When the tie is drawn
  and goes to penalties, set `decidedBy: "penalties"`, keep `scoreA === scoreB`, and add
  `pensA`/`pensB` (distinct integers).
- `decidedBy` ∈ {`regulation`, `extra-time`, `penalties`}. `winner` must be `teamA` or `teamB`.
- Team names may be in any language/order — the app normalizes them.

The app validates internal consistency: winners match scores/penalties, each round feeds the
next (bracket adjacency), the third-place match is the two semi-final losers, and the champion
is the final's winner. The **bracket structure itself** (who meets whom) is the model's own
claim — reproducing the official 2026 format is part of the experiment.

---

## Prompt

```text
You are a quantitative football analyst. You will predict the COMPLETE knockout stage of
the 2026 FIFA World Cup (hosted by the USA, Canada and Mexico; 48 teams; 12 groups A–L;
new 32-team knockout format: Round of 32 → Round of 16 → Quarter-finals → Semi-finals →
Third-place match → Final).

INPUT: Appended after these instructions is a JSON array of YOUR OWN 72 group-stage match
predictions (the scorelines you produced earlier). Treat those scorelines as the actual
group-stage results. Do not change them.

STEP 1 — Standings. From those 72 scorelines, compute the final table of each group (A–L)
using the official FIFA tiebreakers in order: (1) points; (2) goal difference; (3) goals
scored; (4) head-to-head points, then goal difference, then goals among the tied teams;
(5) fair-play, then drawing of lots — break any remaining ties with your best judgement and
note it. Identify each group's winner and runner-up.

STEP 2 — Third-placed teams. Rank all 12 third-placed teams (points, then goal difference,
then goals scored, then fair-play) and select the best 8 to advance. List the 12 group
winners, 12 runners-up and the 8 advancing third-placed teams in "qualification".

STEP 3 — Bracket. Place the 32 qualifiers into the OFFICIAL FIFA 2026 Round-of-32 bracket
(the 16 ties numbered as matches 73–88 in the official schedule), honouring the official
allocation of the eight third-placed teams to the correct ties as closely as you can. Fill
"rounds.roundOf32" with all 16 ties in bracket order (R32-1 … R32-16) so that the winners of
R32-1 and R32-2 meet in R16-1, and so on up the bracket to the final.

STEP 4 — Predict every tie. For each match predict the score after 90 minutes or extra time,
set "decidedBy" (regulation, extra-time or penalties), and on a draw add the penalty shootout
("pensA"/"pensB"). Give "winner" and a one-sentence "reasoning". Advance the winners round by
round: Round of 16 (8 ties), Quarter-finals (4), Semi-finals (2), the Third-place match (the
two beaten semi-finalists) and the Final.

STEP 5 — Champion and Golden Boot. Name the "champion" (= the final's winner) and a
"goldenBoot" pick (player, team, and expected "goals").

Weigh squad strength, form, tactics, head-to-head, fatigue/rotation across the tournament,
venue context (altitude, heat, travel) and host advantage. Be calibrated — prefer honest
accuracy over false confidence. Do not invent teams: every team must come from your own
qualifiers above.

RESPOND WITH VALID JSON ONLY, no text before or after, in exactly this shape:

{
  "model": "claude",
  "generatedAt": "<ISO-8601 instant>",
  "engine": "<your model build, e.g. Claude Opus 4.8>",
  "notes": "<optional>",
  "qualification": {
    "groupWinners": { "A": "<team>", "...": "...", "L": "<team>" },
    "runnersUp": { "A": "<team>", "...": "...", "L": "<team>" },
    "thirdPlaceAdvancing": ["<team>", "...8 teams..."]
  },
  "rounds": {
    "roundOf32": [
      { "slot": "R32-1", "teamA": "<team>", "teamB": "<team>", "scoreA": <int>, "scoreB": <int>, "decidedBy": "regulation|extra-time|penalties", "pensA": <int>, "pensB": <int>, "winner": "<teamA|teamB>", "reasoning": "<one sentence>" }
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

Include all 16 + 8 + 4 + 2 + 1 + 1 = 32 knockout matches. Omit "pensA"/"pensB" unless the tie
went to penalties. Do not invent teams, players or statistics.
```

> For Gemini, change `"model": "claude"` to `"model": "gemini"`; for OpenAI, to `"openai"`.
> Append the model's own 72-match group-stage JSON immediately after the prompt as its input.
