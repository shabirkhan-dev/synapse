---
id: syn-095
title: Open-source release files - public README, contributing guide, security policy, code of conduct
type: chore
from: human
to: all
priority: normal
status: done
assignee: claude
reviewer: none
parent: syn-roadmap
depends_on: []
branch: main
worktree: none
scope: [README.md, CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, docs/assets]
allowed_shared: [.agents/plans/roadmap.md, .agents/memory/decisions.md]
created: 2026-11-25
updated: 2026-11-25
---

## What

The human is open-sourcing Synapse so any team can use it. Make the repository ready for outside
users and contributors.

## Why / Context

The README still described an early project ("a bare Next.js console") and its quick start needed
Doppler access only maintainers have. There was no contributor guide, security policy or code of
conduct. The licence (MIT OR Apache-2.0) was already in place.

## Proposal or Ask

Rewrite the README for a public audience, add the standard community files, and check the git
history for secrets before the repository is made public.

## Scope

**In scope:** README, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, a screenshot in `docs/assets/`.

**Out of scope:** making the repository public and turning on private vulnerability reporting
(GitHub settings, the owner's action).

## Validation

- `git log --all -p` scanned for the project's known key prefixes and common secret formats
  (OpenAI/OpenRouter, Doppler, GitHub, AWS, private keys): only the secret scanner's own pattern
  matched; no `.env` or key files were ever committed.
- README commands checked against `package.json`, `.env.example`, the compose files and the env
  validation (production refuses development secrets and needs `RESEND_API_KEY`).

## Resolution

README: what Synapse is, a screenshot, features, "Try it locally" in development mode (no email
service; links in the API log; sample documents), "Run it for your team" via `deploy/`, updated
package and folder tables (reliability, providers, native, crates, deploy, tests). CONTRIBUTING.md
(setup, checks, Conventional Commits, licence of contributions), SECURITY.md (GitHub private
vulnerability reporting, scope), CODE_OF_CONDUCT.md (Contributor Covenant 2.1).
