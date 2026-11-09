# `@synapse/native`

TypeScript wrapper over the Rust crates (napi-rs): today, exact BPE token counting.

> **Status:** Live (token counter: `crates/text-processing` + `crates/bindings`, loader with a
> TypeScript fallback) · Planned (prebuilt binaries per platform in CI, binding inside the Docker
> images, more crates from ADR-0004 only where a benchmark shows a win).

## Internal modules

`binding-name.ts` (file per platform) · `load-binding.ts` (loader) · `count-tokens.ts` (counter)

## Owns

- Loading the compiled binding for this platform (the only code that loads `.node` files —
  `architecture:check` fails anywhere else)
- The typed TS API over `crates/bindings`, and the TypeScript fallback

## Does not own

- The Rust code (→ `crates/text-processing`, `crates/bindings`)
- Where token counts are used (→ `generation` context budget, `memory` history budget; apps inject
  the counter)

## Depends on

Nothing at runtime; `crates/bindings` build output. Dev: `js-tiktoken` (parity + benchmark),
`@synapse/evaluation` (corpus).

## Public API

| Export | What it does |
| --- | --- |
| `createTokenCounter(status?)` → `{ tokenizer, native, count, countMany }` | `o200k_base` counts from Rust when the binding loads, else `estimate-chars/4` |
| `loadBinding(file?)` → `BindingStatus` | Tries `packages/native/bin/` (source) and `bin/` next to a bundle; never throws, gives `reason` |
| `bindingFileName(platform?, arch?, musl?)` | `synapse-bindings.<platform>-<arch>[-musl].node` |
| `estimateTokens(text)` | The old ~4 characters per token rule (the fallback) |

## Build

```bash
bun run native:build            # cargo build --release -p synapse-bindings → packages/native/bin/
bun --cwd=packages/native test  # parity tests run only when the binding is built
bun --cwd=packages/native run bench
```

`apps/api`'s build copies the binding to `dist/bin/` when it exists
(`scripts/copy-binding.ts`); without it the bundle runs on the fallback and logs
`token counting … native: false` at start. The Docker images do not build Rust yet, so they use the
fallback.

## Why this crate (benchmarks, 2026-11-09, linux-x64, Bun 1.4.4)

The first candidate, the chunker, was measured first and rejected: the TypeScript chunker splits
1 MB in ~2.6 ms (10 MB in ~24 ms), negligible next to embedding the same text, so Rust could not
win anything measurable.

Token counting (o200k_base BPE) is CPU-bound. Rust vs `js-tiktoken` (same ranks, pure JS), ms per
document, identical counts at every size:

| Characters | Rust | js-tiktoken | Speed-up | Tokens | chars/4 estimate |
| --- | --- | --- | --- | --- | --- |
| 1,000 | 0.045 | 0.210 | 4.7× | 209 | 250 |
| 10,000 | 0.415 | 1.652 | 4.0× | 2,059 | 2,500 |
| 100,000 | 3.5 | 15.2 | 4.3× | 20,572 | 25,000 |
| 1,000,000 | 40 | 235 | 5.9× | 205,715 | 250,000 |

The estimate it replaces over-counts English by ~20% (so the context budget held fewer passages
than it could) and under-counts CJK and emoji-heavy text.

## Notes

- `o200k_base` is OpenAI's GPT-4o tokenizer. Anthropic, Google and Cohere tokenize differently:
  for them counts are closer than the estimate, not exact.
- Special tokens (`<|endoftext|>`) are counted as plain text, so untrusted input cannot act as one.
