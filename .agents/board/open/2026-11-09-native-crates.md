---
id: syn-036
title: Add native: first Rust crate behind packages/native via napi-rs
type: feature
from: pm
to: backend
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [crates, packages/native, .github/workflows]
allowed_shared: []
created: 2026-11-09
updated: 2026-11-09
---

## What

No Rust yet; ADR-0004 decided napi-rs in-process behind `packages/native`.

## Why / Context

CPU-heavy steps (chunking, tokenizing, hashing) run in JS. A first crate proves the build, CI and
loading path before anything depends on it.

## Proposal or Ask

`crates/bindings` (napi-rs) + one library crate with a measured hot path (e.g. the chunker or the
token estimate), `packages/native` loading the `.node` file with a JS fallback, CI Rust toolchain
step (`cargo fmt`, `clippy -D warnings`, `cargo test`), and a benchmark that justifies it.

## Scope

**In scope:**

- crates, bindings, native wrapper, CI, docs, one benchmark

**Out of scope:**

- moving search or ranking to Rust

## Validation

- `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`, `bun run test` pass
- same output as the JS implementation on the eval corpus; benchmark recorded

## Resolution

_Open._
