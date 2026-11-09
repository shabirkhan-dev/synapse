import type { Reranker } from "@synapse/core/contracts";

import type { Logger } from "../logging/logger";
import { withSpan } from "../tracing/tracing";

/** Span `rerank <model>` (GenAI attributes, document count) and one log line per rerank call. */
export function instrumentReranker(reranker: Reranker, { logger }: { logger: Logger }): Reranker {
	const { info } = reranker;
	return {
		info,
		rerank: (request) =>
			withSpan(
				`rerank ${info.model}`,
				{
					"gen_ai.operation.name": "rerank",
					"gen_ai.provider.name": info.provider,
					"gen_ai.request.model": info.model,
					"synapse.rerank.documents": request.documents.length,
				},
				async () => {
					const started = performance.now();
					const result = await reranker.rerank(request);
					logger.info("llm call", {
						operation: "rerank",
						model: `${info.provider}:${info.model}`,
						documents: request.documents.length,
						durationMs: Math.round(performance.now() - started),
					});
					return result;
				},
			),
	};
}
