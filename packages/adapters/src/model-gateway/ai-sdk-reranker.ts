import type { ModelInfo, Reranker } from "@synapse/core/contracts";
import { createRerankingModel, type RerankingModelSpec } from "@synapse/providers";
import { rerank, type RerankingModel } from "ai";

/** `Reranker` on an AI SDK reranking model. One attempt per call: retries come from `reliability`. */
export function createAiSdkReranker({
	model,
	info,
}: {
	model: RerankingModel;
	info: ModelInfo;
}): Reranker {
	return {
		info,
		async rerank({ query, documents, topN, abortSignal }) {
			const { ranking } = await rerank({
				model,
				query,
				documents,
				topN,
				maxRetries: 0,
				...(abortSignal ? { abortSignal } : {}),
			});
			return ranking.map(({ originalIndex, score }) => ({ index: originalIndex, score }));
		},
	};
}

/** A vendor reranker (`@synapse/providers`), e.g. `{ provider: "cohere", model: "rerank-v3.5" }`. */
export function createReranker(spec: RerankingModelSpec): Reranker {
	return createAiSdkReranker(createRerankingModel(spec));
}
