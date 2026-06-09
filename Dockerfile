# syntax=docker/dockerfile:1

FROM node:20-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# --- build: install all deps, generate client, build Next ---
FROM base AS build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm prisma generate && pnpm build

# --- runner ---
FROM base AS runner
ENV NODE_ENV=production
# node:20-slim is glibc, so the @libsql prebuilt (linux-x64-gnu) loads without a compiler.
COPY --from=build /app ./
RUN mkdir -p /app/data
EXPOSE 3000

# Apply migrations, (re)seed the 72 fixtures (idempotent), then serve.
# Seeding is best-effort so a transient network blip doesn't block startup.
CMD ["sh", "-c", "pnpm prisma migrate deploy && (pnpm db:seed || true) && pnpm start"]
