---
id: syn-052
title: real cd deploy: registry images and deploy to the host on tag
type: feature
from: pm
to: backend
priority: normal
status: open
assignee: none
reviewer: human
parent: syn-roadmap
depends_on: [syn-041]
branch: none
worktree: none
scope: [.github/workflows/cd.yml, deploy, docs/runbooks/deployment.md]
allowed_shared: []
created: 2026-11-13
updated: 2026-11-13
---

## What

`cd.yml` has placeholder steps. Build the three images in CI, push them to a registry, and deploy
`deploy/compose.yml` to the production host on a `v*` tag.

## Why / Context

syn-041 made the host deploy manual and verified. Needs decisions from the human: the host, the
registry (GHCR?) and how CI reaches the host (SSH key as a GitHub secret).

## Proposal or Ask

Images tagged by version on GHCR; `deploy/compose.yml` takes `image:` from `IMAGE_PREFIX`/`IMAGE_TAG`
(already supported); CI runs `docker compose pull && up -d` over SSH, then checks readiness.

## Scope

**In scope:** `cd.yml`, deploy docs. **Out of scope:** Kubernetes, multi-host.

## Validation

- a tag builds and pushes images; the host runs them and readiness is 200

## Resolution

_Open._
