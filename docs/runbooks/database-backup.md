# Database backup

> **Status:** Live (`backup` service in `deploy/compose.yml`) · Live, optional — off-site copies
> (`offsite` service, syn-080; tested against an S3 server on a local machine, not yet a cloud bucket).

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

## Off-site copies (syn-080)

A backup on the same disk does not survive losing the host. The optional `offsite` service
(rclone 1.75.2, `deploy/backup/offsite.sh`) copies every finished dump to any S3-compatible bucket
(AWS S3, Cloudflare R2, Backblaze B2, MinIO, …) and deletes copies older than its own retention.

1. Create a **private** bucket and a key that can read and write only that bucket.
2. In `deploy/.env` (template `deploy/.env.example`): `COMPOSE_PROFILES=offsite`, `BACKUP_S3_BUCKET`,
   `BACKUP_S3_ENDPOINT` (empty for AWS), `BACKUP_S3_REGION`, `BACKUP_S3_ACCESS_KEY_ID`,
   `BACKUP_S3_SECRET_ACCESS_KEY` (and `BACKUP_S3_PROVIDER=AWS` / `Cloudflare` / … if you like).
3. Set `BACKUP_ENCRYPTION_PASSPHRASE` to encrypt files (names and contents) before they leave the
   host. **Store it outside this host** (Doppler `prd`, a password manager): without it the copies
   cannot be read.
4. `docker compose -f deploy/compose.yml --env-file deploy/.env up -d offsite`

| Setting | Default | |
| --- | --- | --- |
| `BACKUP_OFFSITE_INTERVAL_SECONDS` | 3600 | copies new dumps hourly (only finished `*.dump` files) |
| `BACKUP_OFFSITE_KEEP_DAYS` | 90 | deletes copies older than this; `0` keeps them forever; keep it above `BACKUP_KEEP_DAYS` |

Check it: `… logs offsite` shows `offsite: copied to …` per run; list the copies with
`… run --rm offsite --list`. Fetching one back for a restore is in
[database-recovery.md](database-recovery.md#from-the-off-site-copy).

**Prove it restores** once a month: [database-recovery.md](database-recovery.md#drill).
