# syntax=docker/dockerfile:1
# Build from the repo root: docker build -f apps/console/Dockerfile .

ARG BUN_VERSION=1.4.4

FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY apps/console/package.json ./apps/console/
COPY packages/typescript-config/package.json ./packages/typescript-config/
# Only this app's dependency graph (and its workspace packages) is installed.
RUN bun install --frozen-lockfile --filter console --ignore-scripts

FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock turbo.json ./
COPY apps/console ./apps/console
COPY packages/typescript-config ./packages/typescript-config

WORKDIR /app/apps/console
RUN bun run build

FROM node:26-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S synapse && adduser -S synapse -G synapse \
	&& apk add --no-cache wget

COPY --from=build --chown=synapse:synapse /app/apps/console/.next/standalone ./
COPY --from=build --chown=synapse:synapse /app/apps/console/.next/static ./apps/console/.next/static

USER synapse

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
	CMD wget -qO- "http://127.0.0.1:${PORT}" >/dev/null || exit 1

CMD ["node", "apps/console/server.js"]
