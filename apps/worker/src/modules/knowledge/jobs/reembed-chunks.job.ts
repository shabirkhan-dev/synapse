import type { EmbeddingGateway, JobHandler } from "@synapse/core/contracts";
import { EMBEDDING_DIMENSIONS } from "@synapse/database/schema";
import { createReembedder, type ReembedCheckpoint } from "@synapse/knowledge";
import type { Logger } from "@synapse/observability";

import type { DrizzleCheckpointRepository } from "../repositories/checkpoint.repository";
import type { DrizzleReembedRepository } from "../repositories/reembed.repository";

/** Empty = every owner's stale chunks; `ownerId` = one tenant's. */
export type ReembedChunksJobData = { ownerId?: string };

export type ReembedChunksJobDependencies = {
	chunks: DrizzleReembedRepository;
	checkpoints: DrizzleCheckpointRepository;
	embedding: EmbeddingGateway;
	batchSize: number;
	logger: Logger;
};

/**
 * Re-embed stale chunks with the configured model. Progress is checkpointed under the job id, so a
 * retry of the same job (crash, deploy, timeout) continues where it stopped.
 */
export function createReembedChunksJob({
	chunks,
	checkpoints,
	embedding,
	batchSize,
	logger,
}: ReembedChunksJobDependencies): JobHandler<ReembedChunksJobData> {
	return async (job) => {
		const reembedder = createReembedder({
			embedding,
			dimensions: EMBEDDING_DIMENSIONS,
			batchSize,
			ports: {
				staleChunks: (input) =>
					chunks.staleChunks({
						...input,
						...(job.data.ownerId ? { ownerId: job.data.ownerId } : {}),
					}),
				saveEmbeddings: (input) => chunks.saveEmbeddings(input),
				loadCheckpoint: () => checkpoints.load<ReembedCheckpoint>(job.id),
				saveCheckpoint: (checkpoint) => checkpoints.save(job.id, job.queue, checkpoint),
			},
		});
		const result = await reembedder.run();
		await checkpoints.remove(job.id);
		logger.info("chunks re-embedded", { jobId: job.id, retryCount: job.retryCount, ...result });
	};
}
