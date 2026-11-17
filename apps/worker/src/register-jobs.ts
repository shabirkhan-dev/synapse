import type { EmbeddingGateway, JobQueue } from "@synapse/core/contracts";
import type { Database } from "@synapse/database";
import type { Logger } from "@synapse/observability";

import {
	createRechunkDocumentsJob,
	createReembedChunksJob,
	DrizzleCheckpointRepository,
	DrizzleRechunkRepository,
	DrizzleReembedRepository,
	KNOWLEDGE_QUEUES,
} from "@/modules/knowledge";
import {
	createPruneJob,
	DrizzleMaintenanceRepository,
	MAINTENANCE_QUEUES,
	PRUNE_CRON,
} from "@/modules/maintenance";

export type JobDependencies = {
	db: Database;
	embedding: EmbeddingGateway;
	reembedBatchSize: number;
	chunking: { size: number; overlap: number };
	logger: Logger;
};

const MINUTE = 60;
const HOUR = 60 * MINUTE;

/** Create every queue, attach its handler and register schedules. Safe to call on every start. */
export async function registerJobs(
	queue: JobQueue,
	{ db, embedding, reembedBatchSize, chunking, logger }: JobDependencies,
) {
	// Long, checkpointed: a retry resumes, so allow a few and give each attempt time.
	await queue.createQueue(KNOWLEDGE_QUEUES.REEMBED_CHUNKS, {
		policy: "exclusive",
		retryLimit: 5,
		retryDelaySeconds: MINUTE,
		expireInSeconds: 4 * HOUR,
	});
	await queue.work(
		KNOWLEDGE_QUEUES.REEMBED_CHUNKS,
		createReembedChunksJob({
			chunks: new DrizzleReembedRepository(db),
			checkpoints: new DrizzleCheckpointRepository(db),
			embedding,
			batchSize: reembedBatchSize,
			logger,
		}),
	);

	// Like re-embedding: long, checkpointed per document, resumed by a retry.
	await queue.createQueue(KNOWLEDGE_QUEUES.RECHUNK_DOCUMENTS, {
		policy: "exclusive",
		retryLimit: 5,
		retryDelaySeconds: MINUTE,
		expireInSeconds: 4 * HOUR,
	});
	await queue.work(
		KNOWLEDGE_QUEUES.RECHUNK_DOCUMENTS,
		createRechunkDocumentsJob({
			documents: new DrizzleRechunkRepository(db),
			checkpoints: new DrizzleCheckpointRepository(db),
			embedding,
			chunking,
			logger,
		}),
	);

	await queue.createQueue(MAINTENANCE_QUEUES.PRUNE, {
		policy: "exclusive",
		retryLimit: 3,
		retryDelaySeconds: 5 * MINUTE,
		expireInSeconds: 10 * MINUTE,
	});
	await queue.work(
		MAINTENANCE_QUEUES.PRUNE,
		createPruneJob(new DrizzleMaintenanceRepository(db), logger),
	);
	await queue.schedule(MAINTENANCE_QUEUES.PRUNE, PRUNE_CRON);
}
