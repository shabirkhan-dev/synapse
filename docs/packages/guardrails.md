# `@synapse/guardrails`

Keep inputs, retrieval, tools and outputs within policy.

> **Status:** Live (input policy, prompt-injection defense, tool allowlist, output secret check) ·
> Planned (risk scoring, model-based classifiers through `providers`).

## Internal modules

`input/ retrieval/ tools/ output/ policies/ injection-defense/ risk-scoring/`

## Owns

- Input and output checks
- Retrieval-time and tool-call policies
- Prompt-injection defense
- Risk scoring

## Does not own

- Authentication and permissions (→ `security`)

## Depends on

`core`

## Public API

| Export | What it does |
| --- | --- |
| `sanitizeUntrustedText(text)`, `sanitizePassages(passages)`, `REMOVED_INSTRUCTION` | Replace instruction-like phrases with `[instruction removed]` (keeps the surrounding facts): "ignore/disregard … instructions/rules", "you are now …", "from now on, you …", "new instructions:", "system prompt:", "reveal your system prompt", chat-template markers (`<\|im_start\|>`), `### System` headings, `assistant:` lines. Returns what matched |
| `createInputPolicy({ maxChars, blockedTerms })` → `check(text)` | Too long, or contains a blocked term (whole words, any case) |
| `createToolPolicy(allowed)` → `{ allows, filter }` | Drops unlisted tools before the model sees them |
| `createOutputGuard({ redactSecrets })` → `check(text)` | Removes leaked secrets from model output (`redactSecrets` from `@synapse/security`) |

Pattern matching is a first line of defense, not a guarantee: prompts also say that passages, tool
results and facts are data (`rag-answer@2`, `rag-answer-cited@2`, `chat-assistant@2`).

## How the API uses it

| Where | Check | On a hit |
| --- | --- | --- |
| `/rag/query` (both modes), chat messages | input policy (`GUARDRAILS_MAX_INPUT_CHARS` 4000, `GUARDRAILS_BLOCKED_TERMS`) | `422 GUARDRAILS_INPUT_BLOCKED`, audited (`guardrails.input.blocked`; the text is not stored); nothing retrieved, stored or sent to a model |
| Retrieved passages, `searchDocuments` results | sanitize | passage cleaned, audited (`guardrails.passages.flagged`); returned `matches` show the cleaned text |
| Facts (`rememberFact`, `POST /memory/facts`) | input policy + instruction check | `422`, audited (memory poisoning) |
| `/rag/query` answers | secrets removed | audited (`guardrails.output.redacted`) |
| Chat tools | allowlist `searchDocuments`, `rememberFact`, `currentTime` | others dropped |

Streaming chat text is not checked for secrets (it is already on the wire); RAG answers are.
