# Database backup

> **Status:** Placeholder — no production database yet.

Local one-off backup:

```bash
docker compose exec -T postgres pg_dump -U synapse -d synapse -Fc > synapse.dump
```

To decide: managed backups vs. `pg_dump` schedule, retention, encryption, off-site copy, restore
drills.
