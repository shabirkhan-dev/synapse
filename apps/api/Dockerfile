# syntax=docker/dockerfile:1
# Build from the repo root: docker build -f apps/api/Dockerfile .

ARG BUN_VERSION=1.4.4

FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY packages/adapters/package.json ./packages/adapters/
COPY packages/core/package.json ./packages/core/
COPY packages/database/package.json ./packages/database/
COPY packages/evaluation/package.json ./packages/evaluation/
COPY packages/generation/package.json ./packages/generation/
COPY packages/human-oversight/package.json ./packages/human-oversight/
COPY packages/ingestion/package.json ./packages/ingestion/
COPY packages/knowledge/package.json ./packages/knowledge/
COPY packages/observability/package.json ./packages/observability/
COPY packages/orchestration/package.json ./packages/orchestration/
COPY packages/retrieval/package.json ./packages/retrieval/
COPY packages/security/package.json ./packages/security/
COPY packages/typescript-config/package.json ./packages/typescript-config/
# Only this app's dependency graph (and its workspace packages) is installed.
RUN bun install --frozen-lockfile --filter api --ignore-scripts

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY package.json bun.lock ./
COPY packages/adapters ./packages/adapters
COPY packages/core ./packages/core
COPY packages/database ./packages/database
COPY packages/evaluation ./packages/evaluation
COPY packages/generation ./packages/generation
COPY packages/human-oversight ./packages/human-oversight
COPY packages/ingestion ./packages/ingestion
COPY packages/knowledge ./packages/knowledge
COPY packages/observability ./packages/observability
COPY packages/orchestration ./packages/orchestration
COPY packages/retrieval ./packages/retrieval
COPY packages/security ./packages/security
COPY packages/typescript-config ./packages/typescript-config
COPY apps/api ./apps/api
WORKDIR /app/apps/api
# Single-file bundles (dependencies inlined), so the runtime image needs no node_modules.
RUN bun run build

FROM oven/bun:${BUN_VERSION}-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000
ENV RUN_MIGRATIONS=true

RUN addgroup -S synapse && adduser -S synapse -G synapse \
	&& apk add --no-cache wget

COPY --from=build --chown=synapse:synapse /app/apps/api/dist ./dist
COPY --chmod=755 apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

USER synapse

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
	CMD wget -qO- "http://127.0.0.1:${PORT}/api/v1/health" >/dev/null || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["bun", "dist/server.js"]
