# `@synapse/ingestion`

Bring content in from sources and turn it into normalized, deduplicated documents with their access rules.

> **Status:** Live (normalization, deduplication, pipeline, file text extraction: text, Markdown,
> PDF) · Planned (connectors, OCR and other formats, ACLs, lifecycle).

## Internal modules

`connectors/ parsers/ extraction/ normalization/ deduplication/ acl/ pipelines/ lifecycle/`

## Owns

- Source connectors and file parsers
- Text/structure extraction and normalization
- Content-hash deduplication
- Capturing source ACLs
- Pipelines and job lifecycle (state, checkpoints, reconciliation)

## Does not own

- Chunking and embeddings (→ `knowledge`)
- Job queue implementation (→ `adapters/queue`)

## Depends on

`core`, `native` (optional, for heavy parsing)

## Public API

| Export | What it does |
| --- | --- |
| `normalizeText(text)`, `normalizeDocument(raw)`, `RawDocument`, `NormalizedDocument` | Unicode NFC, `\n` line endings, no NUL/zero-width chars, no trailing spaces, ≤1 blank line, trimmed; title whitespace collapsed; blank source → `null` |
| `contentHash(content)` | SHA-256 hex of normalized content — the dedup key |
| `createIngestionPipeline({ findByContentHash, index })`, `IngestionPorts`, `IngestableDocument`, `IngestResult` | normalize → hash → return existing if the owner already has it → `index` |
| `extractFileText({ name, bytes }, { pdf })` → `FileExtraction`, `FILE_MEDIA_TYPES`, `UploadedFile` | Type from the extension, checked against the bytes (a PDF needs the `%PDF-` signature; text and Markdown must be strict UTF-8 without NUL). Returns `{ status: "extracted", title, content, mediaType, pages }` or `unsupported` / `no-text` / `unreadable`. PDFs go through the `PdfTextExtractor` port (`@synapse/core/contracts`; pages joined by a blank line) |

`IngestResult` is `{ status: "created" | "duplicate", document } | { status: "empty" }` — expected
outcomes are values, not exceptions. Used by `apps/api` (`RagService.ingest`).
