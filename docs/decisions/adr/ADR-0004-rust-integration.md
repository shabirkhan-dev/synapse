# ADR-0004: Rust integration via napi-rs

- Status: Accepted
- Date: 2026-11-07

## Context

Some work (document parsing, text processing, tokenizing, search helpers) is CPU-heavy and benefits
from Rust. A separate Rust service would add network hops and deployment overhead.

## Decision

Run Rust **in-process** using **napi-rs**:

- Rust code lives in `crates/` (`document-processing`, `text-processing`, `search-engine`,
  `file-processing`, `shared`).
- Only `crates/bindings` exposes N-API.
- TypeScript reaches it only through `packages/native`, which offers a typed API and TS fallbacks
  where practical.

## Consequences

- No extra service; calls are function calls.
- Builds need prebuilt binaries per platform (CI matrix) once crates exist.
- Rust is used only where benchmarks show a clear win.

## Status of implementation

First crates (syn-036): `crates/text-processing` (o200k_base token counting via `tiktoken-rs`) and
`crates/bindings`, loaded by `packages/native` with a TypeScript fallback. The chunker was
benchmarked first and kept in TypeScript (no measurable win); see `docs/packages/native.md`.

## Alternatives considered

- Rust HTTP/gRPC service: isolation, but more ops and latency.
- WebAssembly: portable, but slower for heavy native work and weaker threading.
