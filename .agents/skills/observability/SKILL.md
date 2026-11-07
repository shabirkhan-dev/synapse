---
name: observability
description: Use when adding tracing, instrumentation, cost tracking, logging or exporters (Langfuse, OpenTelemetry).
---

# observability

> Status: Planned. Today the API has request logging with request ids (`apps/api/src/infrastructure/logger/logger.ts`).

## When to use

New external call, new long-running job, or any need to see latency, cost or quality in production.

## Workflow

1. Trace every request and job with OpenTelemetry; propagate the request id.
2. Send LLM traces, token usage, cost, prompt versions and eval scores to Langfuse (via `providers/langfuse`).
3. Log structured events with level and request id; never log secrets or raw PII.
4. Add health signals for new dependencies to `reliability/health`.

## Done when

- `bun run lint`, `bun run typecheck` and `bun run test` pass
- Docs updated per `.agents/rules/documentation.md`
- New calls appear in traces with model, tokens and cost

## References

- `docs/packages/observability.md`
- `docs/runbooks/monitoring.md`
