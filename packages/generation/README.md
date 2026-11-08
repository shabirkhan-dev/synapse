# @synapse/generation

Produce answers from context: versioned prompts, budgeted context, citations and provenance.
Depends only on `@synapse/core` (calls models through `ChatGateway`). Full description:
[docs/packages/generation.md](../../docs/packages/generation.md).

```ts
import { createAnswerGenerator } from "@synapse/generation";

const generator = createAnswerGenerator({
	chat: gateway.chat,
	embeddingModel: knowledge.embeddingModel,
	chunkerVersion: knowledge.chunkerVersion,
	maxContextTokens: 3000,
});
const { text, citations, context, provenance } = await generator.answer({ question, passages });
// provenance: { chatModel, promptVersion: "rag-answer@2", embeddingModel, chunkerVersion, usage }
```

| Module | Status |
| --- | --- |
| `prompts/` — `RAG_ANSWER_PROMPT`, `CHAT_ASSISTANT_PROMPT`, `promptVersion` | Live |
| `context/` — `buildContext` (numbered passages within a token budget), `estimateTokens` | Live |
| `citations/` — `extractCitations` | Live |
| `completion/` — `createAnswerGenerator` | Live |
| `structured-output/`, streaming completion | Planned |
