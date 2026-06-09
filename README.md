# World Cup Predictor 2026 — Claude vs Gemini vs OpenAI

A proof of concept that pits **Claude**, **Gemini** and **OpenAI** against each other on
the 2026 FIFA World Cup group stage (72 matches, June 11–27). Each AI generates
predictions from a single shared prompt; the app stores all three, fetches the real
results automatically, and scores which model predicts better — with a Brier score to
measure calibration, not just raw hit rate.

**Live:** https://worldcup2026.willianpinho.com · **Methodology:** [the exact prompt](https://worldcup2026.willianpinho.com/prompt)

![Leaderboard — Claude vs Gemini vs OpenAI](docs/screenshot.png)

![Group-stage matches with flags and per-model predictions](docs/screenshot-matches.png)

## Stack

Next.js 16 (App Router) · React 19 · Prisma 7 + SQLite (libSQL driver adapter) ·
Tailwind 4 · TypeScript. No native compiler required (libSQL ships a prebuilt binary).

## Screens

- `/` — leaderboard for the three models (points, accuracy, exact scores, Brier).
- `/matches` — all 72 fixtures with team flags and each AI's prediction, result, and points.
- `/prompt` — the full, exact prompt fed to every model (transparency / methodology).
- `/admin` — import predictions (JSON), sync results, and manual override.

## Methodology

Every model receives the **same** prompt, shown verbatim in-app at
[`/prompt`](https://worldcup2026.willianpinho.com/prompt) and in
[`docs/PROMPT.md`](docs/PROMPT.md). It asks each AI to reason from squad strength, recent
form, availability, tactics, head-to-head, venue context (altitude, heat, travel), host
advantage and market odds, then commit to a scoreline and calibrated win/draw/loss
probabilities. The leaderboard's Brier score rewards honest probabilities, not just
correct calls.

## Data

- **Fixtures (seed):** [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json) — public, no API key.
- **Results (sync):** API-Football when `FOOTBALL_API_KEY` is set; otherwise openfootball.
  Manual override in `/admin` covers any gap.

## Run locally

```bash
pnpm install
cp .env.example .env          # set ADMIN_TOKEN / CRON_SECRET
pnpm prisma migrate deploy    # create the database
pnpm db:seed                  # load the 72 fixtures
pnpm dev                      # http://localhost:3000
```

Scoring: exact score 5 · correct result + one exact side 3 · result only 2 · wrong 0.

## Import predictions

1. Run the prompt from [`/prompt`](https://worldcup2026.willianpinho.com/prompt) in
   Claude, Gemini and OpenAI (with web access). For each, set `"model"` accordingly.
2. In `/admin`, enter the `ADMIN_TOKEN` and paste each AI's JSON → "Import".
   Names in any language or order are normalized; unmatched ones are reported back.

## Deploy (VPS + Traefik + Cloudflare)

Subdomain `worldcup2026.willianpinho.com`, TLS via origin cert (no certresolver).
Secrets via 1Password:

```bash
op run --env-file=.env.template -- docker compose up -d --build
```

SQLite persists in the `wc_db` volume (`/app/data`). A cron sidecar calls
`/api/results/sync` every 30 minutes. Adjust the external Traefik network name in
`docker-compose.yml` (`traefik-network`) to match your host.
