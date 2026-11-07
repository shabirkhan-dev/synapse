# Decisions

Architecture decision records live in [`adr/`](adr/). Write one for any decision that is costly to
reverse. Agents keep a short summary in `.agents/memory/decisions.md`.

| ADR | Title | Status |
| --- | --- | --- |
| [0001](adr/ADR-0001-modular-monolith.md) | Modular monolith | Accepted |
| [0002](adr/ADR-0002-database-strategy.md) | Database strategy: PostgreSQL for everything first | Accepted |
| [0003](adr/ADR-0003-llm-provider-abstraction.md) | LLM provider abstraction | Accepted |
| [0004](adr/ADR-0004-rust-integration.md) | Rust integration via napi-rs | Accepted |
| [0005](adr/ADR-0005-in-house-authentication.md) | In-house authentication | Accepted |

## Template

```markdown
# ADR-NNNN: Title

- Status: Proposed | Accepted | Superseded by ADR-XXXX
- Date: YYYY-MM-DD

## Context
## Decision
## Consequences
## Alternatives considered
```
