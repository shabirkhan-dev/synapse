# Agent role charters

Each agent must load the universal contract and exactly one role charter before acting.

## Load order

1. Root `AGENTS.md`
2. `.agent/README.md`
3. `.agent/agent-contract.md`
4. The relevant role charter below
5. `.agent/worktrees.md` for branch, port, and handoff rules
6. The assigned board card and linked source-of-truth docs

## Active roles

- [Backend](backend.md) — the Hono API (`apps/api`) and backend platform
- [Web](web.md) — Next.js console (`apps/console`)
- [QA](qa.md) — behavior, regression, accessibility, and end-to-end verification
- [Reviewer](reviewer.md) — independent code, scope, and contract review
- [UI/UX](ui-ux.md) — design system (`packages/ui`) and visual quality
- [PM](pm.md) — planning, assignment, status collection, and delivery coordination

Role charters define default ownership. A card may narrow a role's scope but may not silently
widen it. Backend specializations such as auth, RAG, or migrations are focus areas on cards,
not separate permanent agents.

Security/bug-bounty becomes a separate role only when the product's threat surface and workload
justify it. Until then, QA and reviewer raise security findings and backend owns remediation.
