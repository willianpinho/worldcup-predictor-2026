# Standardized context dataset

The **enriched** experiment arm (see [`PROMPT-ENRICHED.md`](../PROMPT-ENRICHED.md)) gives
every model the **same** controlled data instead of letting each one source its own. That
data lives in a single versioned file, `team-context.json`, read by
`scripts/run-model.ts` to render a per-group context block.

This README documents the schema. The actual `team-context.json` is added separately by the
coordinator (the runner reads it at run time).

## Schema

```json
{
  "snapshotDate": "2026-06-01",
  "sources": {
    "fifaRanking": {
      "name": "FIFA/Coca-Cola Men's World Ranking",
      "url": "https://...",
      "releaseDate": "2026-04-03"
    },
    "elo": {
      "name": "World Football Elo Ratings",
      "url": "https://...",
      "retrievedAt": "2026-06-01"
    }
  },
  "teams": [
    {
      "team": "Mexico",
      "confederation": "CONCACAF",
      "fifaRank": 14,
      "elo": 1822
    },
    {
      "team": "South Africa",
      "confederation": "CAF",
      "fifaRank": 58,
      "elo": 1601
    }
  ]
}
```

### Fields

- **`snapshotDate`** — ISO date (`YYYY-MM-DD`) the snapshot represents. Printed in every
  context block so the data point is unambiguous and reproducible.
- **`sources.fifaRanking`** — `{ name, url, releaseDate }` for the FIFA ranking used.
- **`sources.elo`** — `{ name, url, retrievedAt }` for the Elo ratings used.
- **`teams`** — **all 48 teams**, each `{ team, confederation, fifaRank, elo }`.
  - `team` — the team name **exactly as it appears in the fixtures**
    (`docs/runs/claude-2026-06-09.json`). Naming variants still align via `normalizeTeam`,
    but matching the fixture spelling keeps the data readable.
  - `confederation` — one of `AFC`, `CAF`, `CONCACAF`, `CONMEBOL`, `OFC`, `UEFA`.
  - `fifaRank` — integer FIFA ranking position at the snapshot.
  - `elo` — integer Elo rating at the snapshot.

## How it is rendered

For each group (A–L), the runner selects the 4 teams that appear in that group's 6 fixtures
and renders a compact table — `Team | Conf | FIFA | Elo` — preceded by the snapshot date and
a one-line source citation. Every team in the fixtures **must** be present in the dataset; a
missing team is a hard error, because the enriched arm requires identical data for all models.
