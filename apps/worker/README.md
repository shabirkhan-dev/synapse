# worker

Background jobs on pg-boss (Postgres; no Redis). Structure follows
`docs/development/backend-architecture.md` (modules own their jobs, repositories and constants).

```bash
bun run dev:worker          # repo root; reads the root .env
```

| Queue | When | What |
| --- | --- | --- |
| `knowledge.reembed-chunks` | On every worker start (if an embedding key is set); exclusive, so restarts never stack | Re-embed chunks whose `embedding_model` is not the configured one, in batches of `WORKER_REEMBED_BATCH_SIZE`; checkpointed per batch in `job_checkpoints`, so a retry resumes. Optional `{ ownerId }` limits it to one tenant |
| `maintenance.prune` | Daily 03:17 UTC | Delete expired rate-limit windows (> 1 day), used/expired auth links (> 7 days), revoked/expired sessions (> 30 days), abandoned checkpoints (> 30 days) |

| Script | Does |
| --- | --- |
| `dev` / `build` / `start` | `bun --watch src/worker.ts` / bundle to `dist/worker.js` / run the bundle |
| `test` | `bun test` (set `API_TEST_DATABASE_URL` for the Postgres tests) |

```text
src/
  worker.ts             # config, logger, db, model gateway, pg-boss queue, register jobs, graceful stop
  register-jobs.ts      # create queues (policy, retries, expiry), attach handlers, schedules
  config/               # env.ts (Zod) + index.ts
  modules/
    knowledge/          # constants/ jobs/ repositories/ (re-embedding, checkpoints)
    maintenance/        # constants/ jobs/ repositories/ (pruning)
```

The api applies database migrations; the worker only lets pg-boss create its own `pgboss` schema.
