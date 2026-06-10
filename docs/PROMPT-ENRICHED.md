# API arms: baseline & enriched (JSON output)

The experiment has three **arms** (`condition`):

| Arm          | How it is produced                                           | What it tests                                |
| ------------ | ------------------------------------------------------------ | -------------------------------------------- |
| **web**      | Chat / CLI with live web access ([`PROMPT.md`](./PROMPT.md)) | Free sourcing — the model finds its own data |
| **baseline** | API call, no tools, fixtures provided                        | Pure parametric (internal) knowledge         |
| **enriched** | API call, no tools, + standardized context                   | Reasoning over controlled, identical data    |

This file documents the two **API** arms. They are produced by `scripts/run-model.ts`
through a LiteLLM OpenAI-compatible gateway, one group at a time, and validated against the
same import schema as the web arm. The single source of truth for every string below is
[`src/lib/experiment.ts`](../src/lib/experiment.ts); the runner uses those exact functions.

## Methodological notes

- **Fixtures are provided.** Unlike the web arm (which asks the model to recall the official
  draw), the API arms list each group's 6 fixtures in the prompt. The test is the model's
  judgement on the **outcomes**, not its memory of the draw — and it eliminates "wrong draw"
  noise from the comparison.
- **No tool use.** The API calls send a single user message; the model has no web access and
  no tools. Both headers state this explicitly.
- **Same dataset for all models (enriched).** Every model receives the identical context
  block, rendered from one versioned snapshot (`docs/context/team-context.json`, schema in
  [`docs/context/README.md`](./context/README.md)). This removes source-hallucination as a
  confound: differences between models reflect reasoning, not different inputs.
- **Snapshot date** is printed in every context block so the data point is reproducible.
- **Temperature** defaults to `0.2` (low, for determinism); set via `--temperature`.
- **One group per call**, groups A–L sequential; each group must return exactly its 6
  fixtures or the run aborts (up to 3 retries per group with the validation errors fed back).

## Baseline header (verbatim)

```text
You are answering through an API with NO web access and NO tools. Use ONLY your own
internal football knowledge — do not browse, search, or claim to look anything up. The
exact fixtures you must predict are listed below, so this is a test of your judgement on
the OUTCOMES, not of your memory of the official draw. Do not add, drop or reorder any
fixture.
```

## Enriched header (verbatim)

```text
You are answering through an API with NO web access and NO tools. Use ONLY your own
internal football knowledge — do not browse, search, or claim to look anything up. The
exact fixtures you must predict are listed below, so this is a test of your judgement on
the OUTCOMES, not of your memory of the official draw. Do not add, drop or reorder any
fixture.

A standardized context block follows. For rankings/ratings use ONLY the data provided
(identical for every model in this experiment); you may combine it with your internal
football knowledge for tactics/players.
```

## Context-block format (enriched)

Rendered per group from the snapshot dataset — the 4 teams of that group, a compact table,
the snapshot date, and a source line:

```text
STANDARDIZED CONTEXT (snapshot 2026-06-01). Same data for every model.
Sources: FIFA/Coca-Cola Men's World Ranking (2026-04-03); World Football Elo Ratings (retrieved 2026-06-01).

Team          | Conf     | FIFA | Elo
Mexico        | CONCACAF | 14   | 1822
South Africa  | CAF      | 58   | 1601
United States | CONCACAF | 16   | 1788
Wales         | UEFA     | 30   | 1702
```

## Per-group prompt template (baseline, group A example)

The same template is used for every group; only the group letter, fixture list and (for
enriched) the context block change. For Gemini/OpenAI, `"model": "claude"` is set to the
right id by the runner.

```text
You are a quantitative football analyst predicting matches of the 2026 FIFA World Cup
(hosted by the USA, Canada and Mexico; 48 teams; 12 groups A–L).

<baseline or enriched header>

<enriched: the context block goes here>

Predict EXACTLY the following 6 group-stage fixtures of GROUP A
(teamA is listed first/home, teamB second/away — keep this order):

1. Mexico vs South Africa
2. United States vs Wales
3. Mexico vs Wales
4. United States vs South Africa
5. Mexico vs United States
6. Wales vs South Africa

For each match, weigh: squad strength and individual quality; FIFA ranking and recent
form (qualifiers + friendlies over the last 12 months); the form of key players in the
2025/26 club season; injuries/suspensions/final-squad cuts; tactical setup and the
manager's tournament record; head-to-head history; venue context (travel, time zones,
ALTITUDE in Mexico City, summer HEAT and HUMIDITY, pitch); home advantage for the
hosts; and market signals (betting odds).

For each match, derive the probability of a home win / draw / away win (summing to
100%) and the most likely scoreline. Be calibrated: prefer honest accuracy over false
confidence.

RESPOND WITH VALID JSON ONLY, no text before or after, in exactly this shape:

{
  "model": "claude",
  "predictions": [
    {
      "group": "A",
      "teamA": "<home team>",
      "teamB": "<away team>",
      "scoreA": <int>,
      "scoreB": <int>,
      "probWinA": <0-100>,
      "probDraw": <0-100>,
      "probWinB": <0-100>,
      "confidence": "high|medium|low",
      "reasoning": "<one sentence with the main signal>"
    }
  ]
}

Include all 6 listed fixtures of group A and no others. Do not
invent teams, matches or statistics.
```

The shared analytical paragraphs (`weigh …` / `derive …`) are the same `CORE_ANALYSIS`
block used by the web arm's `PREDICTION_PROMPT`, so the three arms ask the same analytical
question — only the access model and the provided data differ.

## Running

```bash
# Baseline
pnpm tsx scripts/run-model.ts --model claude --engine "Claude Opus 4.8" \
  --litellm-model claude-opus-4-8 --condition baseline

# Enriched (requires the snapshot dataset)
pnpm tsx scripts/run-model.ts --model claude --engine "Claude Opus 4.8" \
  --litellm-model claude-opus-4-8 --condition enriched \
  --context docs/context/team-context.json
```

The output file (`docs/runs/<model>-<condition>-<date>.json`) carries `model`, `condition`,
`generatedAt`, `engine`, `notes`, the exact `prompt` template, and the 72 `predictions` — it
imports through `/admin` exactly like a web-arm run. See
[`PROMPT-KNOCKOUT.md`](./PROMPT-KNOCKOUT.md) for the second-stage bracket runner.
