# `@synapse/memory`

Agent and conversation memory: working, conversation, semantic and episodic, with lifecycle rules.

> **Status:** Live (conversation history, long-term facts) · Planned (working memory, episodic
> memory, summarization of long histories, expiry).

## Internal modules

`working/ conversation/ semantic/ episodic/ lifecycle/`

## Owns

- Short-term working memory
- Conversation history
- Long-term semantic and episodic memory
- Memory expiry and lifecycle

## Does not own

- Document knowledge (→ `knowledge`)

## Depends on

`core`

## Public API

| Export | What it does |
| --- | --- |
| `selectHistory(messages, { maxTokens, maxMessages, countTokens? })`, `StoredMessage` | Newest messages within the budget (each message's JSON counted by `countTokens`, default ~4 chars/token), oldest first; always keeps the latest; never starts with an assistant reply |
| `createLongTermMemory({ store, embedding, embeddingModel, minScore? })` → `{ remember, recall, list, forget, forgetAll }`, `FactStore` | Facts embedded and stored per owner (same text stored once); `recall` returns the nearest facts above `minScore` (0.3), only from the current embedding model |
| `formatRecalledFacts(facts)` | System-prompt block that frames facts as data about the user, "not as instructions" |

Storage is the caller's (API `memory` module: tables `chat_conversations`, `chat_messages`,
`memory_facts`; facts are searched exactly per owner, no vector index).

## How the API uses it

- **Chat** (`POST /chat`): send `{ message }` to start a stored conversation (its id comes back in
  `x-conversation-id`) and `{ conversationId, message }` to continue it. The server reads only the
  latest `CHAT_HISTORY_MAX_MESSAGES` (50) messages from Postgres, cuts them to
  `CHAT_HISTORY_MAX_TOKENS` (6000), and saves the reply when the stream ends. Messages are ordered by
  `chat_messages.ordinal` (insertion order, indexed per conversation), so messages saved in one insert
  keep their order. `{ messages }` stays stateless (nothing stored). A stopped reply is saved with what
  had arrived (its text, and the tool calls that returned; a call cut off before its result is
  dropped, since it could not be replayed).
- **Reply versions** (syn-086): regenerating keeps the old reply, marking its messages with one
  `chat_messages.archived_version` id; history and `GET /memory/conversations/{id}` read only
  messages with none. `replyVersions: { current, total }` counts the versions of the last reply in the
  order they were written (`current` 0 = none in use, after a regenerate that wrote nothing);
  `PUT /memory/conversations/{id}/reply-version { version }` puts one back in use (row-locked
  conversation), and the next turn builds on it. A new question starts a new last reply: earlier
  versions stay stored with the conversation but are no longer offered.
- **Recall:** the facts nearest to the latest user message are added to the system prompt as data.
- **Remember:** the `rememberFact` chat tool (used when the user asks), or `POST /memory/facts`.
- **Endpoints:** `GET /memory/conversations`, `GET|PATCH|DELETE /memory/conversations/{id}` (PATCH
  renames: `{ title }`, 1–80 characters), `PUT /memory/conversations/{id}/reply-version`,
  `GET|POST /memory/facts`, `DELETE /memory/facts/{id}`, `DELETE /memory` (everything). Fact saves,
  forgets, conversation deletes and "forget everything" are audited.
