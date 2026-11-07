import type { EmbeddingGateway, JobQueue } from "@synapse/core/contracts";
import type { Database } from "@synapse/database";
import type { Logger } from "@synapse/observability";

import {
	createReembedChunksJob,
	DrizzleCheckpointRepository,
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
	logger: Logger;
};

const MINUTE = 60;
const HOUR = 60 * MINUTE;

/** Create every queue, attach its handler and register schedules. Safe to call on every start. */
export async function registerJobs(
	queue: JobQueue,
	{ db, embedding, reembedBatchSize, logger }: JobDependencies,
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
