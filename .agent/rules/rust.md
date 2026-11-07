# Rule: Rust

> Status: no crates yet. These rules apply once `crates/` exists (see ADR-0004).

- Rust runs **in-process** through napi-rs. No separate Rust service.
- `crates/bindings` is the only crate that exposes N-API; other crates are plain libraries.
- TypeScript reaches Rust only through `packages/native`. Domain packages never load `.node` files.
- `cargo fmt` and `cargo clippy -- -D warnings` must pass; `cargo test` covers each crate.
- No `unwrap()`/`expect()` on input-derived data in library code; return `Result` and map it to a
  JS error at the binding boundary.
- Keep Rust for CPU-heavy work (parsing, chunking, tokenizing, search). Orchestration stays in TS.
- Vendored Rust skills live in `.agent/skills/m01-*` … `m12-*` and `coding-guidelines/`.
