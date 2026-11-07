---
name: security-review
description: Use before merging changes to auth, tenancy, permissions, PII handling, secrets, guardrails or data retention.
---

# security-review

> Status: Live guidance.

## When to use

The change touches who can see or do what, handles personal data or secrets, or processes untrusted model/tool input.

## Workflow

1. Authentication: tokens verified with the right algorithm and secret; production rejects dev secrets.
2. Authorization/tenancy: every query scoped by the verified owner/tenant; no client-supplied ids trusted.
3. Input: size limits and Zod validation on every entry point.
4. LLM safety: retrieved text and tool output treated as untrusted; injection defenses applied; no privileged tool runs without a policy check.
5. Data: PII redacted from logs/traces/audit; retention rules respected.
6. Secrets: none committed; new secrets documented in `.env.example` with placeholder values.

## Done when

- Each item above checked and noted in the PR
- `bun run lint`, `bun run typecheck` and `bun run test` pass
- Docs updated per `.agents/rules/documentation.md`

## References

- `.agents/rules/security.md`
- `docs/architecture/security-architecture.md`
