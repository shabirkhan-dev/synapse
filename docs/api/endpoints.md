# Endpoints

> **Status:** Live. Source of truth: `/api/openapi.json`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | — | Liveness (no dependencies) |
| GET | `/api/v1/health/ready` | — | Readiness (checks Postgres); `503` if unreachable |
| POST | `/api/v1/rag/documents` | Bearer | Ingest a document (`title`, `content`, optional `source`, `metadata`): normalize, dedup, chunk, embed, store. Body ≤ 2 MB. `201` new; `200` if you already ingested the same content (existing document returned, nothing re-embedded) |
| GET | `/api/v1/rag/documents` | Bearer | List your documents, newest first |
| DELETE | `/api/v1/rag/documents/{id}` | Bearer | Delete a document and its chunks |
| POST | `/api/v1/rag/query` | Bearer | Top-k search (`query`, optional `topK`): hybrid vector + keyword (RRF) by default, or vector-only with `RAG_SEARCH_MODE=vector`; matches carry `score` and `ranks`. Answers with the chat model unless `answer: false`; answered queries return `citations` (passages the answer cites) and `provenance` (chat model, prompt version, embedding model, chunker version, token usage) |
| POST | `/api/v1/chat` | Bearer | Streaming tool-calling chat (`messages`: AI SDK UI messages, 1–200). Tools: `searchDocuments`, `currentTime` |
| GET | `/api/docs` | — | Scalar API reference |
| GET | `/api/openapi.json` | — | OpenAPI 3.1 document |
