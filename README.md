# Bolão Copa 2026 — Claude × Gemini

Prova de conceito que compara a capacidade preditiva de **Claude** e **Gemini** na
fase de grupos da Copa do Mundo 2026 (72 jogos, 11–27/jun). Cada IA gera palpites a
partir do prompt em [`docs/PROMPT.md`](docs/PROMPT.md); o app guarda os dois, busca os
resultados reais automaticamente e pontua quem acerta mais — com Brier score para medir
calibração, não só acerto bruto.

## Stack

Next.js 16 (App Router) · React 19 · Prisma 7 + SQLite (driver adapter libSQL) ·
Tailwind 4 · TypeScript. Sem dependência de compilador nativo (libSQL traz binário
pré-compilado).

## Telas

- `/` — placar geral Claude × Gemini (pontos, aproveitamento, exatos, Brier).
- `/matches` — os 72 jogos com o palpite de cada IA, resultado real e pontos.
- `/admin` — importar palpites (JSON), sincronizar resultados e override manual.

## Dados

- **Fixtures (seed):** [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json) — público, sem chave.
- **Resultados (sync):** API-Football se `FOOTBALL_API_KEY` estiver setada; senão openfootball.
  Override manual no `/admin` cobre qualquer lacuna.

## Rodar local

```bash
pnpm install
cp .env.example .env          # ajuste ADMIN_TOKEN / CRON_SECRET
pnpm prisma migrate deploy    # cria o banco
pnpm db:seed                  # carrega os 72 jogos
pnpm dev                      # http://localhost:3000
```

Pontuação: placar exato 5 · resultado + 1 placar parcial 3 · só o resultado 2 · erro 0.

## Importar palpites

1. Rode o prompt de `docs/PROMPT.md` no Claude e no Gemini (com web).
2. Em `/admin`, informe o `ADMIN_TOKEN` e cole o JSON de cada IA → "Importar".
   Nomes em PT ou EN, em qualquer ordem, são normalizados; não-casados são reportados.

## Deploy (VPS + Traefik + Cloudflare)

Subdomínio `bolao.willianpinho.com`, TLS via origin cert (sem certresolver).
Secrets via 1Password:

```bash
op run --env-file=.env.template -- docker compose up -d --build
```

O SQLite persiste no volume `bolao_db` (`/app/data`). Um sidecar de cron chama
`/api/results/sync` a cada 30 min. Ajuste o nome da rede externa do Traefik em
`docker-compose.yml` (`web`) para a da sua VPS.
