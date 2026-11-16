# Phase 5 — The best RAG experience (review 2026-11-16)

> Status: Live plan. Steps and cards are tracked in `roadmap.md` (Phase 5); this page keeps the
> reasoning. Compares Synapse with the leading RAG products and research, then ranks what to build.

## What the best systems do

| System | What it does best | Lesson for Synapse |
| --- | --- | --- |
| RAGFlow | Layout-aware parsing (OCR, tables, reading order); chunk templates per document kind (paper, manual, Q&A, table); click a citation to see the exact passage | Chunks should keep their structure (headings, sections); citations should open the passage |
| Onyx (Danswer) | 40+ connectors synced on a schedule; permission-aware retrieval; assistants with their own prompt and knowledge subset | Scope questions to a subset of documents; connectors (URL first) |
| Perplexity | Numbered inline citations at each claim; compact source cards; suggested follow-up questions | One citation style everywhere (chat too); source cards; follow-ups |
| Glean | Enterprise + personal graph; personalization the user can see and edit | Memory facts are already viewable and deletable; keep that visible |
| Anthropic contextual retrieval | Context prepended to each chunk before embedding and BM25: −35% failures (embeddings), −49% (+ BM25), −67% (+ rerank) on top-20 retrieval | Prepend document title and heading path to every chunk (free); LLM context later, optional |
| Ragas | Faithfulness, answer relevance, context precision, context recall (LLM judge) | Score answers, not only retrieval; validate the judge |
| Query rewriting guides | Rewrite pronoun-heavy follow-ups into standalone queries with a small model | Chat already lets the model write the search query; the Playground has no history, so it needs no rewrite yet |

Sources: RAGFlow (datacamp.com/tutorial/ragflow), Onyx docs (docs.onyx.app), Perplexity design
teardowns (925studios.co, aiuxplayground.com), Anthropic (anthropic.com/engineering/contextual-retrieval),
Ragas (arxiv.org/abs/2309.15217), query rewriting (shekhargulati.com, 2024).

## Where Synapse stands

Strong already: hybrid search (pgvector + full-text, RRF), optional rerank, versioned chunks and
embeddings, provenance on every answer, retrieval evaluations in CI and in the console, guardrails,
approvals, audit, usage/cost, reliability. Gaps found:

| Gap | Today | Kind |
| --- | --- | --- |
| Answers render as plain text | the model's Markdown (`**bold**`, lists) shows as raw symbols | UI |
| Chat cites document titles; the Playground cites `[n]` | two citation styles, chat sources are a collapsed list | UI + logic |
| A citation does not show its passage | `[n]` jumps to a list further down | UI |
| Chunks lose their context | a chunk under "Exceptions" does not say which document or section it is from | logic |
| No way to ask about specific documents | every question searches the whole workspace | logic + UI |
| Only retrieval is scored | no faithfulness or relevance score for answers | logic |
| One file at a time; no URLs | upload is single-file; no web pages | logic + UI |
| No follow-up suggestions, copy, regenerate | answers end the flow | UI |
| No global search / quick navigation | every page is reached through the sidebar | UI |

## Plan (most value first)

1. **Readable answers** — safe Markdown rendering (no raw HTML) in chat and the Playground.
2. **One citation system** — chat cites numbered passages like the Playground; citations open a
   preview of the passage; source cards under each answer.
3. **Context-carrying chunks** — chunker v2 records each chunk's heading path; title and headings are
   prepended to what is embedded and keyword-indexed (contextual retrieval without an LLM call);
   measured against the retrieval baseline before switching.
4. **Scoped questions** — ask about chosen documents (Playground, chat, API filter); "Ask about this
   document" on the document page.
5. **Answer quality scores** — faithfulness and relevance by an LLM judge in evaluation runs.
6. **More ways in** — several files at once; a web page by URL (with SSRF protection).
7. **Flow** — suggested follow-ups, copy, regenerate; ⌘K command palette.
