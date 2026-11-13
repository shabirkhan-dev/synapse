# Database backup

> **Status:** Live (`backup` service in `deploy/compose.yml`) · Placeholder — off-site copy is set up
> by whoever runs the host (below).

| What | Value |
| --- | --- |
| How | `pg_dump --format=custom` of the whole database (data, pgvector embeddings, pg-boss jobs, audit) |
| When | on start, then every `BACKUP_INTERVAL_SECONDS` (default 86400, daily) |
| Where | `BACKUP_DIR` on the host (default `deploy/backups/`), `synapse-<UTC time>.dump` |
| Kept | `BACKUP_KEEP_DAYS` (default 14); older dumps are deleted after each backup |

A dump is written under a temporary name and renamed when complete, so a file named `*.dump`
is always whole. Each run logs `backup: wrote …` or `backup: FAILED …`:

```bash
docker compose -f deploy/compose.yml --env-file deploy/.env logs backup --since 48h
```

**Take one now** (before a risky upgrade):
`docker compose -f deploy/compose.yml --env-file deploy/.env exec backup /backup/backup.sh --once`

**Copy off the machine.** A backup on the same disk does not survive losing the host. Sync
`BACKUP_DIR` to object storage on a schedule, e.g. a host cron with `rclone sync` or `restic backup`,
encrypted, with its own retention.

**Prove it restores** once a month: [database-recovery.md](database-recovery.md#drill).
