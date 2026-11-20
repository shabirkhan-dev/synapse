---
id: syn-080
title: off-site backup copies (s3-compatible, optional)
type: feature
from: human
to: all
priority: normal
status: doing
assignee: claude
reviewer: none
parent: syn-roadmap
depends_on: []
branch: none
worktree: none
scope: [deploy/backup, deploy/compose.yml, docs/runbooks, .env.example]
allowed_shared: []
created: 2026-11-20
updated: 2026-11-20
---

## What

Daily `pg_dump` files stay on the same disk. Copy each one to S3-compatible storage when it is configured.

## Why / Context

Gap review 2026-11-19 (item 2): a lost disk loses the backups too.

## Proposal or Ask

`deploy/backup/backup.sh` uploads the new dump to `BACKUP_S3_URI` (any S3-compatible endpoint) when set, keeps local retention, and the restore runbook can fetch from it. Done when a dump is uploaded and restored from the copy in a test against a local S3 (MinIO).

## Scope

**In scope:** deploy/backup, deploy/compose.yml, docs/runbooks, .env.example.

## Validation

- lint, typecheck, unit and integration tests, e2e where a flow changes

## Resolution

_Open._
