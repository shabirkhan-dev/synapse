# `@synapse/adapters`

Implement `core` contracts against infrastructure: vector store, cache, queue, storage and the model gateway.

> **Status:** Planned. Seed: `apps/api/src/infrastructure/ai/ai-models.ts`. The database client is
> its own package, [`@synapse/database`](database.md).

## Internal modules

`vector-store/ cache/ queue/ storage/ model-gateway/`

## Owns

- pgvector vector store
- Postgres-backed cache
- pg-boss queue
- Object storage
- Model gateway (routes calls to `providers/*`)

## Does not own

- Domain logic

## Depends on

`core`, `database`, `providers`, vendor SDKs (pg-boss…)

## Public API

> Placeholder — defined when the package is created. Keep it to `src/index.ts` exports.

## Notes

One of the places allowed to import vendor SDKs (with `providers` and `database`).
