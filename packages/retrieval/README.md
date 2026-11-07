# @synapse/retrieval

Find the right chunks for a query: vector search, keyword search and hybrid fusion. Pure domain
code — the caller supplies the searches as ports. Full description:
[docs/packages/retrieval.md](../../docs/packages/retrieval.md).

```ts
import { createRetriever } from "@synapse/retrieval";

const retriever = createRetriever(
	{
		embedQuery: (query) => knowledge.embedQuery(query),
		vectorSearch: (request) => repository.searchChunks(request), // { ownerId, embedding, embeddingModel, limit }
		keywordSearch: (request) => repository.keywordSearch(request), // { ownerId, query, limit }
	},
	{ mode: "hybrid", embeddingModel: knowledge.embeddingModel },
);
const matches = await retriever.retrieve({ ownerId, query, topK: 5 }); // each with score + ranks
```

| Module | Status |
| --- | --- |
| `fusion/` — `reciprocalRankFusion` (k = 60) | Live |
| `hybrid-search/` — `createRetriever` (`vector` / `hybrid`) | Live |
| `query-rewriting/ reranking/ filters/` | Planned |
