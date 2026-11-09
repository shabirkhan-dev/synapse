# @synapse/adapters

Implementations of `@synapse/core` contracts against infrastructure. Full description:
[docs/packages/adapters.md](../../docs/packages/adapters.md).

| Module | Import | Status |
| --- | --- | --- |
| `model-gateway/` | `@synapse/adapters/model-gateway` | Live — `ModelGateway` on the AI SDK, models from `@synapse/providers` |
| `vector-store/`, `cache/`, `queue/`, `storage/` | — | Planned |

```ts
import { createModelGateway } from "@synapse/adapters/model-gateway";

const gateway = createModelGateway({
	chat: { provider: "anthropic", model: "claude-sonnet-5-5", apiKey: anthropicKey },
	embedding: { provider: "openai", model: "text-embedding-3-small", apiKey, dimensions: 1536 },
});
const vector = await gateway.embedding.embed("refund policy");
const { text, model, usage } = await gateway.chat.generateText({ prompt: "Hello" });
```

This package (with `providers` and `database`) is where vendor SDKs may be imported; domain
packages use the contracts.
