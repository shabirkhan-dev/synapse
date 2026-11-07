# Skills system

> **Status:** Live.

`.agents/skills/<name>/SKILL.md` is a playbook for one kind of task. Each has YAML frontmatter
(`name`, `description` — when to use it), then: Status, When to use, Workflow, Done when, References.

| Project skills | Vendored skills (upstream, reference only) |
| --- | --- |
| package-development, api-development, backend-module-development, frontend-feature-development, ingestion-engineering, knowledge-engineering, rag-engineering, retrieval-engineering, generation-engineering, agent-orchestration, human-oversight, database-engineering, rust-development, security-review, testing-and-evaluation, observability | shadcn, browser-ui-test, ponytail, coding-guidelines, domain-web, m01–m12 (Rust) |

Vendored skills are pinned in `skills-lock.json`. Add a project skill when the same multi-step task
recurs; keep it short and link to rules and docs instead of repeating them.
