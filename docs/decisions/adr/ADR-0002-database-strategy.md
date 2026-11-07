# ADR-0002: Database strategy — PostgreSQL for everything first

- Status: Accepted
- Date: 2026-11-07

## Context

The platform needs relational data, vectors, keyword search, background jobs, caching and an audit
trail. Each extra datastore adds operations, backups and failure modes.

## Decision

Use **PostgreSQL** as the single store:

- relational data via **Drizzle** (typed SQL, migrations),
- vectors via **pgvector** (HNSW, cosine),
- keyword search via **Postgres full-text** (BM25 later only if evals show a need),
- jobs via **pg-boss**,
- cache in Postgres first (Redis only when load proves it),
- audit as append-only Postgres tables.

## Consequences

- One backup/restore story and transactional consistency across data, vectors and jobs.
- Postgres must have the `vector` extension (compose uses `pgvector/pgvector:0.8.7-pg18-trixie`).
- Heavy vector or search load may later require a specialised store — via a new ADR.

## Alternatives considered

- Dedicated vector DB (Pinecone, Qdrant, Weaviate): extra service, split consistency.
- Redis for queue/cache: faster at scale, not needed yet.

## Update 2026-11-07

The client, schema, migrations and runner live in their own workspace package,
`@synapse/database` (`packages/database`), so any app or package can use them. Repositories stay in
the module that owns the data.
