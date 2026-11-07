# `@synapse/adapters`

Implement `core` contracts against infrastructure: database, vector store, cache, queue, storage and the model gateway.

> **Status:** Planned. Seed: `apps/api/src/database` (Drizzle + postgres.js) and `apps/api/src/modules/ai/ai.provider.ts`.

## Internal modules

`database/ vector-store/ cache/ queue/ storage/ model-gateway/`

## Owns

- Drizzle + Postgres client and migrations
- pgvector vector store
- Postgres-backed cache
- pg-boss queue
- Object storage
- Model gateway (routes calls to `providers/*`)

## Does not own

- Domain logic

## Depends on

`core`, `providers`, vendor SDKs (pg, drizzle, pg-boss…)

## Public API

> Placeholder — defined when the package is created. Keep it to `src/index.ts` exports.

## Notes

This is one of only two places allowed to import vendor SDKs.
