---
id: syn-074
title: ingestion: several files at once; add a web page by url (ssrf-safe)
type: feature
from: reviewer
to: backend
priority: high
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: []
allowed_shared: []
created: 2026-11-17
updated: 2026-11-17
---

## What

Upload takes one file at a time and there is no way to add a web page (Onyx, RAGFlow and
Perplexity all ingest URLs).

## Why / Context

Phase 5 review (`.agents/plans/phase-5-rag-quality.md`), step 6.

## Proposal or Ask

Console uploads several files in one go (one request each, per-file result). `POST
/rag/documents/url` reads a page through a `WebPageReader` contract (adapter: SSRF-safe fetch,
HTML → Markdown-ish text keeping headings for the text-v2 chunker), then the normal ingest path.

## Scope

**In scope:** multi-file picker and drop, URL endpoint and form, SSRF protection (public addresses
only, pinned IP, redirects re-checked, size/time/type limits). **Out of scope:** crawling links,
scheduled re-sync, JavaScript-rendered pages.

## Validation

Unit: address policy (private, loopback, link-local, metadata, mapped IPv6), redirects to private
addresses refused, size and type limits, HTML extraction. API tests and e2e (a page served by the
fake model server, private networks allowed only in tests).

## Resolution

Landed in `feat(ingestion): add several files at once and web pages by url` (on `main`).

- `core`: `WebPageReader` contract and `WEB_PAGE_ERROR_CODES`.
- `@synapse/adapters/web`: SSRF-safe reader. Public addresses only (`BlockList`: loopback,
  private, link-local/metadata, CGNAT, documentation, multicast, reserved, ULA, NAT64, 6to4,
  Teredo, IPv4-mapped); every resolved address must pass; the request goes to the checked IP with
  `Host` and TLS `serverName` kept (checked locally: SNI and certificate still verified, a wrong
  name is refused), so DNS rebinding cannot swap it; redirects followed by hand and re-checked;
  80/443 only; no URL credentials; 10 s; 2 MiB streamed cap; HTML or text. HTML → text with Bun
  `HTMLRewriter` (main/article, headings → Markdown, lists, entities).
- API: `POST /rag/documents/url` (ingest budget, audited like any ingest), refusals as
  `RAG_URL_*`; `RAG_WEB_TIMEOUT_MS`, `RAG_WEB_ALLOW_PRIVATE_NETWORKS` (production refuses `true`;
  in `.env.example` and Doppler dev).
- Console: several files per upload (one request each, per-file result lines, the title field
  hides for several, ≤ 20), and an "Add a web page" row.
- **Bug found and fixed:** `RagService.index` dropped each chunk's `context` (syn-068 embedded it but
  never saved it), so the keyword index and the document page lacked headings. Retrieval eval
  unchanged after the fix (0.944 recall@3 and MRR, with and without the reranker).

Not done: crawling, re-sync, JavaScript-rendered pages, non-UTF-8 pages (see known-constraints).

Validation: adapters 12 new (address policy, extraction, pinning, redirect into the private network
refused at that hop, limits, TLS serverName); API URL 4 + env guard; console 10 (several files,
a bad file stops the batch, web page form); e2e 22 (several files + a page served by the fake
provider); screenshots light and dark.
