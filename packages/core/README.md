# @synapse/core

Shared types, contracts, errors, events, config and utilities. Imports nothing from the workspace.
Full description: [docs/packages/core.md](../../docs/packages/core.md).

| Module | Import | Status |
| --- | --- | --- |
| `errors/` | `@synapse/core/errors` | Live — `SynapseError`, `isSynapseError` |
| `config/` | `@synapse/core/config` | Live — `loadConfig(schema, source?)` |
| `types/` | `@synapse/core/types` | Live — `AnswerProvenance` |
| `contracts/` | `@synapse/core/contracts` | Live — `ModelGateway` (`ChatGateway`, `EmbeddingGateway`) |
| `events/` | — | Placeholder (folder only; export added with first real code) |
| `utils/` | — | Placeholder (folder only; export added with first real code) |

```ts
import { z } from "zod";
import { loadConfig, SynapseError } from "@synapse/core";

const config = loadConfig(z.object({ PORT: z.coerce.number().default(8000) }));
throw new SynapseError("RAG_DOCUMENT_NOT_FOUND", "Document not found");
```

Scripts: `bun run lint`, `bun run typecheck`, `bun run test`.
