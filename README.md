# World Cup 2026 Prediction Pool — Claude vs Gemini

A proof of concept that pits **Claude** against **Gemini** on the 2026 FIFA World Cup
group stage (72 matches, June 11–27). Each AI generates predictions from the prompt in
[`docs/PROMPT.md`](docs/PROMPT.md); the app stores both, fetches the real results
automatically, and scores which model predicts better — with a Brier score to measure
calibration, not just raw hit rate.

## Stack

Next.js 16 (App Router) · React 19 · Prisma 7 + SQLite (libSQL driver adapter) ·
Tailwind 4 · TypeScript. No native compiler required (libSQL ships a prebuilt binary).

## Screens

- `/` — leaderboard, Claude vs Gemini (points, accuracy, exact scores, Brier).
- `/matches` — all 72 fixtures with each AI's prediction, the real result, and points.
- `/admin` — import predictions (JSON), sync results, and manual override.

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

1. Run the prompt in `docs/PROMPT.md` in Claude and in Gemini (with web access).
2. In `/admin`, enter the `ADMIN_TOKEN` and paste each AI's JSON → "Import".
   Names in any language or order are normalized; unmatched ones are reported back.

## Deploy (VPS + Traefik + Cloudflare)

Subdomain `bolao.willianpinho.com`, TLS via origin cert (no certresolver). Secrets via
1Password:

```bash
op run --env-file=.env.template -- docker compose up -d --build
```

SQLite persists in the `bolao_db` volume (`/app/data`). A cron sidecar calls
`/api/results/sync` every 30 minutes. Adjust the external Traefik network name in
`docker-compose.yml` (`traefik-network`) to match your host.
