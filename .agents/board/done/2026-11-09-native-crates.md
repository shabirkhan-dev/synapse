---
id: syn-036
title: Add native: first Rust crate (token counting) behind packages/native via napi-rs
type: feature
from: pm
to: backend
priority: normal
status: done
assignee: claude
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

Done in commit `feat(native): count tokens with a rust bpe tokenizer via napi-rs`.

- **Measured first:** the proposed chunker is not a hot path (TS: 1 MB in ~2.6 ms, 10 MB in ~24 ms), so it stays in TypeScript. Token counting is CPU-bound and was a known gap (budgets used ~4 chars/token), so the first crate does that.
- `crates/text-processing` (`count_tokens`, `count_tokens_batch`, o200k_base via `tiktoken-rs` 0.12.1, special tokens counted as text) + `crates/bindings` (napi-rs 3.16, `countTokens`, `countTokensBatch`, `tokenizer`); root `Cargo.toml` workspace (`unsafe_code` denied, `unwrap_used`/`expect_used` denied), `rust-toolchain.toml` 1.97.0.
- `@synapse/native`: per-platform loader (`packages/native/bin/` or `bin/` next to a bundle, never throws), `createTokenCounter` with the chars/4 fallback, `bun run native:build`, `scripts/copy-binding.ts` (api build copies it into `dist/bin` when present).
- `generation` (`buildContext`/`createAnswerGenerator` `countTokens`, proportional truncation for a first passage over budget) and `memory` (`selectHistory` `countTokens`) take an injected counter; the api wires the native one and logs which tokenizer runs.
- `architecture:check`: `.node`/`process.dlopen` outside `packages/native` fails (fixture-tested). CI job `rust`: fmt, clippy `-D warnings`, `cargo test`, build the binding, native tests.
- **Benchmark** (`bun run bench`, recorded in `docs/packages/native.md`): 4.0–5.9× faster than js-tiktoken with identical counts at 1 k–1 M chars; the old estimate over-counted English by ~20%.
- **Validation:** 4 Rust tests; 4 native tests (file naming, fallback with reason, exact parity with js-tiktoken on the eval corpus + CJK/code/emoji/special-token/empty cases, estimate is off for CJK); generation and memory counter tests; built api bundle with the binding (`o200k_base`, native: true, ingest 201, query 200, 0 errors) and without it (fallback logged).
- **Not done:** prebuilt binaries per platform / the binding inside the Docker images (they use the fallback), tokenizers for non-OpenAI models.
