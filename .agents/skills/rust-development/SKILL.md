---
name: rust-development
description: Use when adding or changing Rust crates, napi-rs bindings, or the packages/native wrapper.
---

# rust-development

> Status: Live. First crates: `crates/text-processing` (token counting) + `crates/bindings`; see
> ADR-0004 and `docs/packages/native.md`.

## When to use

Moving CPU-heavy work (parsing, chunking, tokenizing, search) to Rust.

## Workflow

1. Write the logic as a plain library crate (`crates/<name>`), with unit tests.
2. Expose it through `crates/bindings` (napi-rs) only; keep the N-API surface small and typed.
3. Wrap it in `packages/native` with a TypeScript API and a pure-TS fallback where practical.
4. Benchmark against the TS version; keep the Rust path only if it is measurably better
   (`packages/native/bench/`; record results in `docs/packages/native.md`).
5. Build with `bun run native:build`; inject the native function into domain packages from the app
   (domain packages never import `@synapse/native`'s loader or `.node` files).

## Done when

- `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test` pass
- `bun run lint`, `bun run typecheck` and `bun run test` pass
- Docs updated per `.agents/rules/documentation.md`

## References

- `.agents/rules/rust.md`
- `.agents/skills/m01-ownership/` … `m12-lifecycle/`
- ADR-0004
