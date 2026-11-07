# @synapse/database

Drizzle client, schema, migrations and migration runner for Postgres + pgvector. Full description:
[docs/packages/database.md](../../docs/packages/database.md).

```ts
import { createDatabase, ragDocuments } from "@synapse/database";

const { db, close } = createDatabase({ url: process.env.DATABASE_URL! });
```

| Command (from the repo root) | Does |
| --- | --- |
| `bun run db:generate` | Generate a migration from schema changes |
| `bun run db:migrate` | Apply migrations against `DATABASE_URL` |

Schema conventions: `docs/development/backend-architecture.md#database-conventions`.
