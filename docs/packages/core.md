# `@synapse/core`

Shared types, contracts (interfaces), errors, events, config and utilities that every other package builds on.

> **Status:** Planned — first package in the build order.

## Internal modules

`types/ contracts/ errors/ events/ config/ utils/`

## Owns

- Domain types (Document, Chunk, Query, Answer, Citation, Job…)
- Contracts: repository, model-gateway, vector-store, queue, cache and storage interfaces
- Typed error base class and codes
- Event types shared by audit and observability
- Config loading and Zod env helpers

## Does not own

- Any implementation that talks to a vendor or database (→ `adapters`, `providers`)

## Depends on

nothing in the workspace (only Zod and the standard library)

## Public API

> Placeholder — defined when the package is created. Keep it to `src/index.ts` exports.

## Notes

The API's `AppError`, envelopes and env parsing are the seed for `core/errors` and `core/config`.
