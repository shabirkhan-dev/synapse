# `@synapse/observability`

See what the system does: tracing, instrumentation, cost tracking and exporters.

> **Status:** Planned. Today: request logging with request ids in `apps/api`.

## Internal modules

`tracing/ instrumentation/ cost-tracking/ exporters/`

## Owns

- OpenTelemetry tracing
- Instrumentation helpers
- Token and cost tracking
- Exporters (Langfuse via `providers/langfuse`)
- Structured logging

## Does not own

- Audit history (→ `audit`)

## Depends on

`core`

## Public API

> Placeholder — defined when the package is created. Keep it to `src/index.ts` exports.
