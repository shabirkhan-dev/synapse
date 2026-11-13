---
id: syn-053
title: ingestion: upload files (text, markdown, pdf) from the console
type: feature
from: pm
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [packages/ingestion, apps/api/src/modules/rag, apps/console/src/features/documents, tests/e2e, docs]
allowed_shared: [packages/adapters]
created: 2026-11-13
updated: 2026-11-13
---

## What

Documents can only be added by pasting text. Let people upload `.txt`, `.md` and `.pdf` files.

## Why / Context

Roadmap Phase 3 "Console: ingestion". `@synapse/ingestion` normalizes and dedups text; nothing
extracts text from files yet.

## Proposal or Ask

- `@synapse/ingestion`: a `extractText(file)` step per media type (text and Markdown as-is with the
  Markdown kept for chunking; PDF via a parser behind an adapter, since it is a vendor library).
- API: `POST /rag/documents/upload` (multipart, size-limited, media type checked by content, not
  only the name), same dedup and response as `POST /rag/documents`; source records the file name.
- Console: a file picker and drop zone on Documents; errors for an unsupported type, too large, or
  a PDF with no text (scanned).

## Scope

**In scope:** the three types, one file at a time. **Out of scope:** OCR, Word/HTML, folders.

## Validation

- unit tests per type and for rejected files; integration through the API; an e2e upload

## Resolution

Landed (`feat(ingestion): …`):

- `@synapse/core/contracts`: `PdfTextExtractor` + `PDF_ERROR_CODES`. `@synapse/adapters/pdf`:
  `createPdfTextExtractor()` with `unpdf` 1.9.1 (pdf.js, no native code; 2.x is two weeks old).
- `@synapse/ingestion`: `extractFileText` — extension decides the type and must match the bytes
  (`%PDF-` signature; strict UTF-8 without NUL for text/Markdown); `unsupported` / `no-text` /
  `unreadable` results.
- API `POST /rag/documents/upload` (multipart `file`, optional `title`) → same ingest path (dedup,
  audit); `415 RAG_UNSUPPORTED_FILE`, `422 RAG_FILE_HAS_NO_TEXT | RAG_FILE_UNREADABLE |
  RAG_FILE_TOO_LONG`; metadata `fileName`, `mediaType`, `pages`. The route-level 2 MB limits on
  both ingest routes were removed: the app-wide 2 MiB cap (syn-051) always fired first, so they
  were dead code.
- Console: drop zone around a real file input (keyboard and screen readers use the input; focus
  ring on the zone), optional title, type/size checked before sending, the API's reason shown and
  cleared when another file is chosen; "or paste text" keeps the old form. The API client sends
  `FormData` as-is.

Validation: ingestion 13 tests, adapter 3 (real PDFs built in the test, malformed file), API upload
6 (Markdown kept, PDF pages + count, dedup, 415 ×3, scanned and damaged PDF, missing file, 413,
401), console 84 (3 new), e2e 17 (new upload spec; `getByLabel("Title")` made exact in 8 specs),
screenshots light/dark/320 px and keyboard focus.

Not covered: OCR, Word/HTML, several files at once, keeping the original file, a parse timeout.
