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

## Alternatives considered

- Rust HTTP/gRPC service: isolation, but more ops and latency.
- WebAssembly: portable, but slower for heavy native work and weaker threading.
