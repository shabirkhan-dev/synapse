# Rule: Rust

> Status: Live — `crates/text-processing`, `crates/bindings` (syn-036). Workspace `Cargo.toml` and
> `rust-toolchain.toml` (1.97.0) at the root; CI job `rust`. See ADR-0004, `docs/packages/native.md`.

- Rust runs **in-process** through napi-rs. No separate Rust service.
- `crates/bindings` is the only crate that exposes N-API; other crates are plain libraries.
- TypeScript reaches Rust only through `packages/native`. Domain packages never load `.node` files.
- `cargo fmt` and `cargo clippy -- -D warnings` must pass; `cargo test` covers each crate.
- No `unwrap()`/`expect()` on input-derived data in library code; return `Result` and map it to a
  JS error at the binding boundary.
- Keep Rust for CPU-heavy work (parsing, chunking, tokenizing, search), and only with a benchmark
  that shows a clear win over the TS version (record it in `docs/packages/native.md`). Orchestration
  stays in TS.
- Workspace lints: `unsafe_code = "deny"` (napi macros opt out), `clippy::unwrap_used` /
  `expect_used` denied.
- Vendored Rust skills live in `.agents/skills/m01-*` … `m12-*` and `coding-guidelines/`.
