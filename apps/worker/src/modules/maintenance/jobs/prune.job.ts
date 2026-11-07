import type { JobHandler } from "@synapse/core/contracts";
import type { Logger } from "@synapse/observability";

import type { DrizzleMaintenanceRepository } from "../repositories/maintenance.repository";

/** Daily cleanup of expired auth rows and abandoned checkpoints. One transaction, idempotent. */
export function createPruneJob(
	maintenance: DrizzleMaintenanceRepository,
	logger: Logger,
): JobHandler<object> {
	return async (job) => {
		const counts = await maintenance.prune();
		logger.info("pruned expired rows", { jobId: job.id, ...counts });
	};
}
