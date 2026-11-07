import type { EmbeddingGateway } from "@synapse/core/contracts";

/**
 * Deterministic, offline bag-of-words embeddings: each lowercase word is hashed into one of
 * `dimensions` buckets and the vector is L2-normalized. No network or key — for evaluations and
 * tests that measure the retrieval pipeline, not embedding-model quality.
 */
export function createHashingEmbeddingGateway({
	dimensions,
}: {
	dimensions: number;
}): EmbeddingGateway {
	const embedOne = (text: string): number[] => {
		const vector = Array.from({ length: dimensions }, () => 0);
		for (const word of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
			let hash = 2166136261;
			for (const char of word) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
			const index = hash % dimensions;
			vector[index] = (vector[index] ?? 0) + 1;
		}
		const norm = Math.hypot(...vector) || 1;
		return vector.map((value) => value / norm);
	};

	return {
		info: { provider: "hashing", model: "bow-v1" },
		embed: async (value) => embedOne(value),
		embedMany: async (values) => values.map(embedOne),
	};
}
