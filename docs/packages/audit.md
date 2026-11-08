# `@synapse/audit`

The single owner of event history: who did what, with which inputs, producing which output.

> **Status:** Live (append-only events, answer provenance, PII redaction, owner history) · Planned
> (retention policy and pruning).

## Internal modules

`events/ provenance/ retention/`

## Owns

- Append-only audit events
- Provenance of answers (model, prompt version, embedding version, sources)
- Retention policies

## Does not own

- Metrics and traces (→ `observability`)

## Depends on

`core`

## Public API

| Export | What it does |
| --- | --- |
| `createAuditLog({ store, redact })` → `{ record, list }`, `AuditStore`, `AuditEvent`, `StoredAuditEvent` | `record` redacts `data`, then appends; `list(ownerId, { limit, action? })` newest first. No update or delete |
| `AUDIT_ACTIONS`, `SYSTEM_ACTOR` | Every recorded action name (`<area>.<thing>.<verb>`) |

An event: `ownerId`, `actorId`, `action`, `subjectType`, `subjectId`, `requestId` (`x-request-id`),
`data` (redacted), `provenance` (answers only), `createdAt`.

**Append-only in the database:** table `audit_events` (migration `0008`); a trigger rejects every
`UPDATE` (migration `0009`). Rows can only be inserted (and, later, deleted by retention).

**Redaction:** the API passes `redactPiiDeep` from `@synapse/security`: emails, phone and card
numbers, JWTs, bearer tokens and provider keys in any string of `data` become `[email]`, `[phone]`,
`[card]`, `[secret]`. Passwords and tokens are never put in `data` in the first place.

## What the API records

| Action | When | Provenance |
| --- | --- | --- |
| `rag.query.answered` | every answered `/rag/query` (question, answer, cited and context chunk ids) | yes |
| `rag.document.ingested` / `rag.document.deleted` | new document (not duplicates) / delete | — |
| `rag.documents.purged` | an approved purge ran (`{ deleted }`) | — |
| `auth.user.signed_up` / `auth.user.signed_in` / `auth.session.signed_out` | account events | — |
| `auth.email.verified` / `auth.password.reset` | link used | — |
| `oversight.approval.requested` / `oversight.approval.decided` | request / first decision (not repeats) | — |

Writes are awaited: an answer is returned only after its event is stored, so every answer is
traceable (architecture rule 6). Answer feedback (`answer_feedback.request_id`) joins
`audit_events.request_id`. Your history: `GET /audit/events?limit=&action=`.
