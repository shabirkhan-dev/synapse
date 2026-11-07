# `@synapse/audit`

The single owner of event history: who did what, with which inputs, producing which output.

> **Status:** Planned.

## Internal modules

`events/ provenance/ retention/`

## Owns

- Append-only audit events
- Provenance of answers (model, prompt version, embedding version, sources)
- Retention policies

## Does not own

- Metrics and traces (→ `observability`)

## Depends on

`core`

## Public API

> Placeholder — defined when the package is created. Keep it to `src/index.ts` exports.
