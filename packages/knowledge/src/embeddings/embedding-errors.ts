import { SynapseError } from "@synapse/core/errors";

export const KNOWLEDGE_ERROR_CODES = {
	EMBEDDING_DIMENSION_MISMATCH: "KNOWLEDGE_EMBEDDING_DIMENSION_MISMATCH",
} as const;

/** Throws when a vector does not have the dimensions the index expects. */
export function assertEmbeddingDimensions(embedding: number[], expected: number): void {
	if (embedding.length !== expected) {
		throw new SynapseError(
			KNOWLEDGE_ERROR_CODES.EMBEDDING_DIMENSION_MISMATCH,
			`Embedding model returned ${embedding.length} dimensions; the index expects ${expected}`,
			{ details: [{ actual: embedding.length, expected }] },
		);
	}
}
