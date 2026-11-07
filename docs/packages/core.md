# `@synapse/core`

Shared types, contracts (interfaces), errors, events, config and utilities that every other package builds on.

> **Status:** Live (errors, config, types) · Placeholder (contracts, events, utils).

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

| Export | Module | What it does |
| --- | --- | --- |
| `SynapseError`, `isSynapseError`, `SynapseErrorOptions` | `@synapse/core/errors` | Transport-neutral error with `code`, `message`, optional `details` and `cause` |
| `loadConfig(schema, source?)`, `ConfigSource` | `@synapse/core/config` | Zod-validated config from `process.env` (empty strings = unset); throws `CONFIG_INVALID` |
| `AnswerProvenance` | `@synapse/core/types` | Model, prompt version, embedding model and version behind an answer |

The root entry (`@synapse/core`) re-exports errors, config and types. Contracts, events and utils
are placeholders that grow with their first real use.

## Notes

`apps/api` still uses its own `AppError` and `parseEnv`; moving it onto `SynapseError` and `loadConfig` is the next step.
