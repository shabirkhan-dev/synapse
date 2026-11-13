# syntax=docker/dockerfile:1
# Build from the repo root: docker build -f apps/console/Dockerfile .

ARG BUN_VERSION=1.4.4

FROM oven/bun:${BUN_VERSION}-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock ./
COPY apps/console/package.json ./apps/console/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/ui/package.json ./packages/ui/
# Only this app's dependency graph (and its workspace packages) is installed.
# Behind a TLS-inspecting proxy, pass its CA as the optional `build_ca` secret (deploy/README.md).
RUN --mount=type=secret,id=build_ca \
	if [ -s /run/secrets/build_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/build_ca; fi; \
	bun install --frozen-lockfile --filter console --ignore-scripts

FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
# Inlined into the browser bundle at build time (Next), so it is a build argument.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Every node_modules the install made (root, the app's and each package's: Bun links
# workspace dependencies per package), then the sources on top.
COPY --from=deps /app ./
COPY package.json bun.lock turbo.json ./
COPY apps/console ./apps/console
COPY packages/typescript-config ./packages/typescript-config
COPY packages/ui ./packages/ui

WORKDIR /app/apps/console
RUN bun run build

FROM node:26-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# BusyBox (in the base image) already provides the `wget` the health check uses.
RUN addgroup -S synapse && adduser -S synapse -G synapse

COPY --from=build --chown=synapse:synapse /app/apps/console/.next/standalone ./
COPY --from=build --chown=synapse:synapse /app/apps/console/.next/static ./apps/console/.next/static

USER synapse

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
	CMD wget -qO- "http://127.0.0.1:${PORT}" >/dev/null || exit 1

CMD ["node", "apps/console/server.js"]
