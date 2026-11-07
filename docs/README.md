# Synapse docs

Synapse is an AI platform: ingestion, knowledge, retrieval, generation, agents, human oversight
and evaluation, built as a modular monolith on Bun, Postgres and (later) Rust.

Every page carries a **Status**: `Live` (matches the code), `Planned` (designed, not built) or
`Placeholder — <what is missing>`.

| Section | What is in it |
| --- | --- |
| [architecture/](architecture/README.md) | System overview, components, boundaries, data, security, workflows, reliability, scale |
| [packages/](packages/README.md) | One page per workspace package: purpose, ownership, dependencies |
| [decisions/](decisions/README.md) | Architecture decision records (ADRs) |
| [development/](development/README.md) | Setup, repo layout, standards, testing, git, contributing |
| [agents/](agents/README.md) | How AI agents work in this repo: rules, skills, memory, tool support |
| [api/](api/README.md) | HTTP API: authentication, conventions, endpoints |
| [runbooks/](runbooks/README.md) | Operating the system: local dev, deploy, backups, monitoring, incidents |
| [guides/](guides/README.md) | How-to guides for ingestion, RAG, retrieval, agents and evaluation |

Agent-facing rules and memory live in [`.agent/`](../.agent/README.md); this folder is for humans
and agents alike.
