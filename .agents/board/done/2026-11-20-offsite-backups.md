---
id: syn-080
title: off-site backup copies (s3-compatible, optional)
type: feature
from: human
to: all
priority: normal
status: done
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

Optional `offsite` service in `deploy/compose.yml` (profile `offsite`, image `rclone/rclone:1.75.2`)
runs `deploy/backup/offsite.sh`: copies finished dumps hourly to `BACKUP_S3_BUCKET/BACKUP_S3_PREFIX`
on any S3-compatible endpoint, deletes copies older than `BACKUP_OFFSITE_KEEP_DAYS` (90), encrypts
names and contents with rclone crypt when `BACKUP_ENCRYPTION_PASSPHRASE` is set; `--list` and
`--fetch <file>` for restores. Settings in `deploy/.env.example`; runbooks updated
(`database-backup.md`, `database-recovery.md#from-the-off-site-copy`).

Validation: real `backup.sh --once` → `offsite.sh --once` to an S3 server (`rclone serve s3`) with
encryption (server showed only an encrypted name, no plaintext) → `--list` → `--fetch` →
`restore.sh` into a new database: 250/250 rows. `docker compose config` shows the service only with
`COMPOSE_PROFILES=offsite`. shellcheck clean. Not run: a real cloud bucket.
