# Database recovery

> **Status:** Live — rehearsed against `deploy/compose.yml` (syn-041).

`deploy/backup/restore.sh` restores a dump into an **empty** database only. It never restores on
top of existing tables: pg-boss keeps partitioned tables that `pg_restore --clean` cannot drop
(found in the rehearsal), so a live database is dropped and recreated instead (`--replace`).

All commands from the repo root; `D="docker compose -f deploy/compose.yml --env-file deploy/.env"`.

## Drill

Restores the newest dump into a separate `synapse_restore_check` database and prints row counts;
the live database is untouched.

```bash
$D exec backup sh -c '/backup/restore.sh "$(ls -t /backups/*.dump | head -1)"'
$D exec postgres psql -U synapse -d synapse -c 'select count(*) from users'   # compare
$D exec postgres dropdb -U synapse synapse_restore_check                      # clean up
```

## Restore the live database

Everything written after the dump is lost; take a fresh dump first if the database still works.

```bash
$D stop api worker backup                                   # nothing may stay connected
$D run --rm --no-deps --entrypoint /backup/restore.sh backup \
  --replace /backups/synapse-<UTC time>.dump synapse
$D start api worker backup
$D ps                                                       # api healthy again
```

The script refuses a non-empty target without `--replace` (exit 3) and refuses `--replace` while
anything is connected (exit 4). It creates the `vector` extension before loading data; HNSW indexes
are rebuilt by the restore. Users stay signed in: sessions are rows in the restored database, so any
session created after the dump is gone and those users sign in again.
