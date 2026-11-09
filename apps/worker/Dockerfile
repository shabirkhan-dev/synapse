# syntax=docker/dockerfile:1
# Build from the repo root: docker build -f apps/worker/Dockerfile .

ARG BUN_VERSION=1.4.4

FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/adapters/package.json ./packages/adapters/
COPY packages/core/package.json ./packages/core/
COPY packages/database/package.json ./packages/database/
COPY packages/knowledge/package.json ./packages/knowledge/
COPY packages/observability/package.json ./packages/observability/
COPY packages/reliability/package.json ./packages/reliability/
COPY packages/typescript-config/package.json ./packages/typescript-config/
# Only this app's dependency graph (and its workspace packages) is installed.
RUN bun install --frozen-lockfile --filter worker --ignore-scripts

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules
COPY package.json bun.lock ./
COPY packages/adapters ./packages/adapters
COPY packages/core ./packages/core
COPY packages/database ./packages/database
COPY packages/knowledge ./packages/knowledge
COPY packages/observability ./packages/observability
COPY packages/reliability ./packages/reliability
COPY packages/typescript-config ./packages/typescript-config
COPY apps/worker ./apps/worker
WORKDIR /app/apps/worker
# Single-file bundle (dependencies inlined), so the runtime image needs no node_modules.
RUN bun run build

FROM oven/bun:${BUN_VERSION}-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -S synapse && adduser -S synapse -G synapse

COPY --from=build --chown=synapse:synapse /app/apps/worker/dist ./dist

USER synapse

# Migrations are applied by the api container; the worker only creates pg-boss's own schema.
CMD ["bun", "dist/worker.js"]
