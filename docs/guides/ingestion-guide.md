# Ingestion guide

> **Status:** Live for plain-text ingest · Planned for connectors and file parsing.

```bash
TOKEN=<an HS256 JWT with sub + sid, signed with JWT_SECRET>
curl -X POST http://localhost:8000/api/v1/rag/documents \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Refund policy","content":"Customers can request a refund within 30 days...","source":"https://example.com/refunds"}'
```

The document is chunked (`RAG_CHUNK_SIZE`=1000, `RAG_CHUNK_OVERLAP`=150 by default), embedded and
stored for your `sub`. List with `GET /rag/documents`, delete with `DELETE /rag/documents/{id}`.

Content is normalized first (Unicode NFC, line endings, invisible characters, extra blank lines),
then hashed. Sending content you already ingested returns `200 "Document already ingested"` with the
existing document — no new embeddings. Dedup is per user and by content only (a new title does not
make it new).

Planned: connectors, PDF/HTML/Office parsing, dedup, ACLs and resumable ingestion jobs
(`docs/packages/ingestion.md`).
