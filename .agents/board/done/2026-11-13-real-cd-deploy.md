---
id: syn-052
title: real cd deploy: registry images and deploy to the host on tag
type: feature
from: pm
to: backend
priority: normal
status: done
assignee: claude
reviewer: human
parent: syn-roadmap
depends_on: [syn-041]
branch: none
worktree: none
scope: [.github/workflows/cd.yml, deploy, docs/runbooks/deployment.md]
allowed_shared: []
created: 2026-11-13
updated: 2026-11-20
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

`cd.yml` builds api, worker and console with `docker buildx` and pushes them to
`ghcr.io/<owner>/synapse/*` using the job's `GITHUB_TOKEN` (main: `sha-<12>` + `main`; tag `v1.2.3`:
`1.2.3` + `latest`), with a registry build cache. The console needs the repository variable
`API_HOST` (main skips it with a notice; a release fails). Deploy jobs run `deploy/ci-deploy.sh`:
skipped with a summary note until the environment has `DEPLOY_HOST`, `DEPLOY_SSH_KEY` and
`DEPLOY_KNOWN_HOSTS`; then SSH (known_hosts checked) → per-job GHCR login → `deploy/remote-deploy.sh`
(checkout, `compose pull`, `up -d --no-build --wait`) → logout → HTTPS readiness poll.

Validation: `remote-deploy.sh` run against a fresh clone and a local registry: pulled, all
services healthy, readiness 200 through Caddy; a second deploy (rollback path) swapped the images.
`ci-deploy.sh` skip path run; shellcheck clean (now in `scripts:lint`). Not run: the SSH hop and the
GitHub-hosted build (first real run is the next push to main). Runbook: `docs/runbooks/deployment.md`.
