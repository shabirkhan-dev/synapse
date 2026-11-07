# `@synapse/reliability`

Make external calls and jobs dependable: retry, circuit breakers, idempotency, timeouts, fallbacks, health.

> **Status:** Planned.

## Internal modules

`retry/ circuit-breakers/ idempotency/ timeouts/ fallbacks/ health/`

## Owns

- Retry with backoff
- Circuit breakers
- Idempotency keys
- Timeouts
- Fallback chains (e.g. model fallback)
- Health checks

## Does not own

- Job scheduling (→ `adapters/queue`, `apps/worker`)

## Depends on

`core`

## Public API

> Placeholder — defined when the package is created. Keep it to `src/index.ts` exports.
