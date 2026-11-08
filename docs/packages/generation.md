# `@synapse/generation`

Produce answers from context: providers, prompts, context assembly, completion, citations and structured output.

> **Status:** Live (prompts, context, citations, completion with provenance) · Planned (structured
> output, streaming completion — chat streaming still uses the AI SDK in `apps/api`).

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

| Export | What it does |
| --- | --- |
| `RAG_ANSWER_PROMPT` (`rag-answer@1`), `RAG_ANSWER_CITED_PROMPT` (`rag-answer-cited@1`, the retry when an answer cited nothing), `CHAT_ASSISTANT_PROMPT` (`chat-assistant@1`), `PromptTemplate`, `promptVersion` | Versioned prompts — bump `version` on every text change |
| `buildContext(passages, { maxTokens })`, `estimateTokens` | `[1]…[n]` passages in rank order within the budget (~4 chars/token); first passage always kept |
| `extractCitations(answer, citations)` | `[n]`, `[1][3]`, `[1, 3]` → cited passages, first-mention order |
| `createAnswerGenerator({ chat, embeddingModel, chunkerVersion, maxContextTokens, prompt? })` | `answer({ question, passages })` → `{ text, citations, context, provenance }` |

`provenance` (`AnswerProvenance` from `@synapse/core/types`): `chatModel`, `promptVersion`,
`embeddingModel`, `chunkerVersion`, `usage`. The API returns it on every answered query; persisting it
is `audit`'s job: every answer is recorded with its provenance in `audit_events`
([audit](audit.md)).

## Notes

The `providers/` module here selects and configures models; the SDK code itself lives in `packages/providers`.
