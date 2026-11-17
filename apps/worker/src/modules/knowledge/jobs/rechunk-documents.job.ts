import type { EmbeddingGateway, JobHandler } from "@synapse/core/contracts";
import { EMBEDDING_DIMENSIONS } from "@synapse/database/schema";
import { createChunkPreparer, createRechunker, type RechunkCheckpoint } from "@synapse/knowledge";
import type { Logger } from "@synapse/observability";

import type { DrizzleCheckpointRepository } from "../repositories/checkpoint.repository";
import type { DrizzleRechunkRepository } from "../repositories/rechunk.repository";

/** Empty = every owner's old documents; `ownerId` = one tenant's. */
export type RechunkDocumentsJobData = { ownerId?: string };

export type RechunkDocumentsJobDependencies = {
	documents: DrizzleRechunkRepository;
	checkpoints: DrizzleCheckpointRepository;
	embedding: EmbeddingGateway;
	chunking: { size: number; overlap: number };
	logger: Logger;
};

/**
 * Re-chunk documents written before text-v2 with today's chunker (their headings become each
 * chunk's context). Checkpointed per document under the job id, so a retry continues.
 */
export function createRechunkDocumentsJob({
	documents,
	checkpoints,
	embedding,
	chunking,
	logger,
}: RechunkDocumentsJobDependencies): JobHandler<RechunkDocumentsJobData> {
	return async (job) => {
		const rechunker = createRechunker({
			preparer: createChunkPreparer({ embedding, chunking, dimensions: EMBEDDING_DIMENSIONS }),
			defaultOverlap: chunking.overlap,
			ports: {
				staleDocuments: (input) =>
					documents.staleDocuments({
						...input,
						...(job.data.ownerId ? { ownerId: job.data.ownerId } : {}),
					}),
				chunksOf: (id) => documents.chunksOf(id),
				replaceChunks: (id, prepared) => documents.replaceChunks(id, prepared),
				loadCheckpoint: () => checkpoints.load<RechunkCheckpoint>(job.id),
				saveCheckpoint: (checkpoint) => checkpoints.save(job.id, job.queue, checkpoint),
			},
		});
		const result = await rechunker.run();
		await checkpoints.remove(job.id);
		logger.info("documents re-chunked", { jobId: job.id, retryCount: job.retryCount, ...result });
	};
}
