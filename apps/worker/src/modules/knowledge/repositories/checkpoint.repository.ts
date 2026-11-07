import { eq, sql } from "drizzle-orm";

import { type Database, jobCheckpoints } from "@synapse/database";

/** Progress of a running job, keyed by its queue job id (stable across retries). */
export class DrizzleCheckpointRepository {
	constructor(private readonly db: Database) {}

	async load<TState>(jobId: string): Promise<TState | null> {
		const [row] = await this.db
			.select({ state: jobCheckpoints.state })
			.from(jobCheckpoints)
			.where(eq(jobCheckpoints.jobId, jobId))
			.limit(1);
		return row ? (row.state as TState) : null;
	}

	async save(jobId: string, queue: string, state: Record<string, unknown>): Promise<void> {
		await this.db
			.insert(jobCheckpoints)
			.values({ jobId, queue, state })
			.onConflictDoUpdate({ target: jobCheckpoints.jobId, set: { state, updatedAt: sql`now()` } });
	}

	async remove(jobId: string): Promise<void> {
		await this.db.delete(jobCheckpoints).where(eq(jobCheckpoints.jobId, jobId));
	}
}
