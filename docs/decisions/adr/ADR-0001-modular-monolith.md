# ADR-0001: Modular monolith

- Status: Accepted
- Date: 2026-11-07

## Context

Synapse covers many capabilities (ingestion, knowledge, retrieval, generation, agents, oversight,
evaluation). A small team needs fast iteration, shared types and one place to test changes end to
end, without the operational cost of many services.

## Decision

Build one Bun + Turborepo monorepo with a few deployables (`apps/api`, `apps/worker`,
`apps/console`) and capabilities as internal workspace packages under `packages/`. Each capability
has exactly one owning package. Boundaries are enforced by import rules and checks, not by network
hops.

## Consequences

- One install, one lockfile, one CI pipeline; refactors across packages are atomic.
- Boundaries must be policed in code review and by `bun run architecture:check`.
- A package can be extracted into a service later if load or team structure demands it.

## Alternatives considered

- **Microservices:** more isolation, far more operational overhead; rejected for now.
- **Single app without packages:** fast at first, but capabilities would leak into each other.
