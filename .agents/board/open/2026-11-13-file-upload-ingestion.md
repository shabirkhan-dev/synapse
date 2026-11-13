---
id: syn-053
title: ingestion: upload files (text, markdown, pdf) from the console
type: feature
from: pm
to: backend
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: []
branch: none
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

_Open._
