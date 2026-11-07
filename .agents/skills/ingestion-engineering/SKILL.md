---
name: ingestion-engineering
description: Use when building connectors, parsers, extraction, normalization, deduplication, ACL capture or ingestion pipelines.
---

# ingestion-engineering

> Status: Partly live. `@synapse/ingestion` has normalization, content-hash dedup and the pipeline
> (used by `apps/api` `RagService.ingest`). Connectors, parsers, ACLs and resumable jobs are planned.

## When to use

Bringing new sources or file types into the platform, or changing how documents are parsed, cleaned, deduplicated or tracked.

## Workflow

1. Connectors fetch raw content + source ACLs; parsers turn bytes into text + structure; normalization produces one canonical document shape (from `core/types`).
2. Capture ACLs at ingestion time and store them with the document so retrieval can filter on them.
3. Deduplicate by content hash before embedding.
4. Run long ingestion as a job (pg-boss, in `apps/worker`) with checkpoints in `ingestion/lifecycle`; it must resume after a crash and be idempotent.
5. Heavy parsing/extraction can move to Rust (`crates/document-processing`, `crates/file-processing`) behind `packages/native`.
6. Emit audit events for every document created, updated or deleted.

## Done when

- `bun run lint`, `bun run typecheck` and `bun run test` pass
- Docs updated per `.agents/rules/documentation.md`
- Re-running the same job produces no duplicates
- Failure mid-job resumes from the last checkpoint

## References

- `docs/packages/ingestion.md`
- `docs/guides/ingestion-guide.md`
- `.agents/rules/database.md`
