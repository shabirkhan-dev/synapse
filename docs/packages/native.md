# `@synapse/native`

TypeScript wrapper over the Rust crates (napi-rs).

> **Status:** Planned. See ADR-0004.

## Internal modules

`(single module: typed wrappers + loader)`

## Owns

- Loading the native binding for the platform
- Typed TS API over `crates/bindings`
- Pure-TS fallbacks where practical

## Does not own

- The Rust code itself (→ `crates/*`)

## Depends on

`core`, `crates/bindings` build output

## Public API

> Placeholder — defined when the package is created. Keep it to `src/index.ts` exports.
