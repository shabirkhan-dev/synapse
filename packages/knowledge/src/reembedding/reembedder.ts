import type { EmbeddingGateway } from "@synapse/core/contracts";

import { assertEmbeddingDimensions } from "../embeddings/embedding-errors";
import { embeddingVersion } from "../versioning/versions";

/** Progress saved after every batch, so a crashed run resumes where it stopped. */
export type ReembedCheckpoint = {
	/** Last chunk id written; the next batch starts after it. */
	afterChunkId: string | null;
	reembedded: number;
};

export type StaleChunk = { id: string; content: string };

export type ReembedPorts = {
	/** Chunks not embedded with `embeddingModel` (or with no model recorded), ordered by id. */
	staleChunks(input: {
		embeddingModel: string;
		afterChunkId: string | null;
		limit: number;
	}): Promise<StaleChunk[]>;
	saveEmbeddings(input: {
		embeddingModel: string;
		vectors: Array<{ id: string; embedding: number[] }>;
	}): Promise<void>;
	loadCheckpoint(): Promise<ReembedCheckpoint | null>;
	saveCheckpoint(checkpoint: ReembedCheckpoint): Promise<void>;
};

export type ReembedderOptions = {
	embedding: EmbeddingGateway;
	ports: ReembedPorts;
	/** Vector size the index expects. */
	dimensions: number;
	batchSize: number;
};

export type ReembedResult = { embeddingModel: string; reembedded: number };

/**
 * Re-embed every chunk whose vectors came from another embedding model, in id order and in batches.
 * Each batch is written and checkpointed before the next, so a crash costs at most one batch and a
 * retry continues after the checkpoint. Running it again when nothing is stale is a no-op.
 */
export function createReembedder({ embedding, ports, dimensions, batchSize }: ReembedderOptions) {
	const embeddingModel = embeddingVersion(embedding.info);

	return {
		embeddingModel,
		async run(): Promise<ReembedResult> {
			let checkpoint = (await ports.loadCheckpoint()) ?? { afterChunkId: null, reembedded: 0 };
			for (;;) {
				// Batches depend on the previous checkpoint, so they run one after another.
				// oxlint-disable-next-line no-await-in-loop
				const batch = await ports.staleChunks({
					embeddingModel,
					afterChunkId: checkpoint.afterChunkId,
					limit: batchSize,
				});
				const last = batch.at(-1);
				if (!last) {
					return { embeddingModel, reembedded: checkpoint.reembedded };
				}
				// oxlint-disable-next-line no-await-in-loop
				const vectors = await embedding.embedMany(batch.map((chunk) => chunk.content));
				for (const vector of vectors) {
					assertEmbeddingDimensions(vector, dimensions);
				}
				// oxlint-disable-next-line no-await-in-loop
				await ports.saveEmbeddings({
					embeddingModel,
					vectors: batch.map((chunk, index) => ({ id: chunk.id, embedding: vectors[index] ?? [] })),
				});
				checkpoint = { afterChunkId: last.id, reembedded: checkpoint.reembedded + batch.length };
				// oxlint-disable-next-line no-await-in-loop
				await ports.saveCheckpoint(checkpoint);
			}
		},
	};
}
