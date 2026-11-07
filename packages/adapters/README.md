# @synapse/adapters

Implementations of `@synapse/core` contracts against infrastructure. Full description:
[docs/packages/adapters.md](../../docs/packages/adapters.md).

| Module | Import | Status |
| --- | --- | --- |
| `model-gateway/` | `@synapse/adapters/model-gateway` | Live — `ModelGateway` on the AI SDK (OpenAI-compatible) |
| `vector-store/`, `cache/`, `queue/`, `storage/` | — | Planned |

```ts
import { createOpenAICompatibleModelGateway } from "@synapse/adapters/model-gateway";

const gateway = createOpenAICompatibleModelGateway({
	providerName: "openrouter",
	baseUrl: "https://openrouter.ai/api/v1",
	apiKey,
	chatModel: "openai/gpt-4o-mini",
	embedding: { model: "openai/text-embedding-3-small" },
});
const vector = await gateway.embedding.embed("refund policy");
const { text, model, usage } = await gateway.chat.generateText({ prompt: "Hello" });
```

This package (with `providers` and `database`) is where vendor SDKs may be imported; domain
packages use the contracts.
