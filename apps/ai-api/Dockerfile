# syntax=docker/dockerfile:1
# Build from the repo root: docker build -f apps/ai-api/Dockerfile .

ARG BUN_VERSION=1.4.4

FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY apps/ai-api/package.json ./apps/ai-api/
COPY apps/nest-api/package.json ./apps/nest-api/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
COPY apps/docs/package.json ./apps/docs/
COPY apps/rust/package.json ./apps/rust/
COPY packages/ui/package.json ./packages/ui/
COPY packages/logger/package.json ./packages/logger/
COPY packages/rabtx/package.json ./packages/rabtx/
COPY packages/typescript-config/package.json ./packages/typescript-config/
# Only this app's dependency graph (and its workspace packages) is installed.
RUN bun install --frozen-lockfile --filter ai-api --ignore-scripts

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/ai-api/node_modules ./apps/ai-api/node_modules
COPY package.json bun.lock ./
COPY packages/logger ./packages/logger
COPY packages/typescript-config ./packages/typescript-config
COPY apps/ai-api ./apps/ai-api
WORKDIR /app/apps/ai-api
# Single-file bundles (dependencies inlined), so the runtime image needs no node_modules.
RUN bun run build

FROM oven/bun:${BUN_VERSION}-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8000
ENV RUN_MIGRATIONS=true

RUN addgroup -S starter && adduser -S starter -G starter \
	&& apk add --no-cache wget

COPY --from=build --chown=starter:starter /app/apps/ai-api/dist ./dist
COPY --chmod=755 apps/ai-api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

USER starter

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=5 \
	CMD wget -qO- "http://127.0.0.1:${PORT}/api/v1/health" >/dev/null || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["bun", "dist/index.js"]
