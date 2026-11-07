# RAG guide

> **Status:** Live.

```bash
TOKEN=<an HS256 JWT with sub + sid, signed with JWT_SECRET>
curl -X POST http://localhost:8000/api/v1/rag/query \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"query":"How long do I have to ask for a refund?","topK":5}'
```

Returns the matches and an `answer`. Send `"answer": false` for retrieval only. For a
conversation with tool use, call `POST /api/v1/chat` with AI SDK UI messages (works with
`useChat`); the model calls `searchDocuments` when it needs your documents.

Tuning knobs (env): `RAG_TOP_K`, `RAG_CHUNK_SIZE`, `RAG_CHUNK_OVERLAP`, `AI_CHAT_MODEL`,
`AI_EMBEDDING_MODEL` (must return 1536 dimensions), `CHAT_MAX_STEPS`.
