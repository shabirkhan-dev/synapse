# `@synapse/generation`

Produce answers from context: providers, prompts, context assembly, completion, citations and structured output.

> **Status:** Planned. Models are called through `@synapse/adapters` (model gateway); prompts and the
> RAG answer path still live in `apps/api/src/modules/rag` and `modules/chat`.

## Internal modules

`providers/ prompts/ context/ completion/ citations/ structured-output/`

## Owns

- Prompt templates and their versions
- Context assembly within a token budget
- Completion calls through the model-gateway contract
- Citations back to chunks
- Validated structured output

## Does not own

- Vendor SDK calls (→ `adapters/model-gateway`, `providers/*`)
- Multi-step agents (→ `orchestration`)

## Depends on

`core`

## Public API

> Placeholder — defined when the package is created. Keep it to `src/index.ts` exports.

## Notes

The `providers/` module here selects and configures models; the SDK code itself lives in `packages/providers`.
