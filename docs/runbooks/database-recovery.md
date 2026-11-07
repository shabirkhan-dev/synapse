# Database recovery

> **Status:** Placeholder — no production database yet.

Local restore of a `pg_dump -Fc` file:

```bash
docker compose exec -T postgres pg_restore -U synapse -d synapse --clean --if-exists < synapse.dump
```

The `vector` extension must exist before restoring (`CREATE EXTENSION IF NOT EXISTS vector`).

To decide: point-in-time recovery, RPO/RTO targets, who is allowed to run a restore.
