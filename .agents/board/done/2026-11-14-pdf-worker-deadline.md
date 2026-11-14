---
id: syn-060
title: ingestion: parse uploaded PDFs in a worker thread with a deadline
type: bug
from: reviewer
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [packages/adapters/src/pdf, packages/core/src/contracts, packages/ingestion, apps/api, docs, .env.example]
allowed_shared: []
created: 2026-11-14
updated: 2026-11-14
---

## What

pdf.js parsed uploads on the API's main thread with no deadline: one pathological PDF could block
every other request until it finished.

## Why / Context

Gap review (2026-11-14), item 4 of 5 (known constraint from syn-053). A promise timeout cannot stop
synchronous parsing; only another thread can be stopped.

## Proposal or Ask

A worker per PDF (`apps/api/src/pdf.worker.ts`, built as its own entry), terminated at
`RAG_PDF_TIMEOUT_MS` (15 s) → `422 RAG_FILE_TIMED_OUT`; a crashed worker is an unreadable file.

## Scope

**In scope:** API uploads. **Out of scope:** a worker pool, memory limits per worker.

## Validation

- unit: text through the worker; a worker that never answers is terminated at the deadline; the API
  maps the timeout; the built API (`dist`) parses a PDF through `dist/pdf.worker.js`

## Resolution

Landed (`fix(ingestion): …`): `@synapse/adapters/pdf` — `extractPdfPages`, `servePdfExtraction`,
`createWorkerPdfTextExtractor` (one worker per file, terminated at the deadline or when done);
`PDF_ERROR_CODES.TIMEOUT`; ingestion status `timed-out`; API `RAG_FILE_TIMED_OUT`,
`RAG_PDF_TIMEOUT_MS` (15 s, `.env.example`, Doppler dev), `src/pdf.worker.ts` added to the build.
Bun's bundler does not pick workers up by itself (prototyped), hence the explicit entry and the URL
built in `server.ts`.

Validation: adapter 6 (text through a worker, unreadable, a busy-looping worker terminated at
300 ms, crashed worker), ingestion 13, API upload 7 (timeout → 422 `RAG_FILE_TIMED_OUT`); the built
API (`dist/server.js`) ingested `refund-policy.pdf` over HTTP through `dist/pdf.worker.js` (201,
2 pages).
