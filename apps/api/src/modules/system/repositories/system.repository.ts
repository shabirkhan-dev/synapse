import { count, desc, eq, sql } from "drizzle-orm";

import { type Database, jobCheckpoints, ragChunks } from "@synapse/database";

import { SYSTEM_CHECKPOINT_LIMIT, UNDEFINED_TABLE } from "../constants/system.constants";
import type {
	ChunkModelCount,
	JobCheckpoint,
	JobCount,
	SystemRepository,
} from "../types/system.types";

const isUndefinedTable = (error: unknown) =>
	typeof error === "object" &&
	error !== null &&
	(error as { code?: unknown; cause?: { code?: unknown } }).code === UNDEFINED_TABLE;

export class DrizzleSystemRepository implements SystemRepository {
	constructor(private readonly db: Database) {}

	async ping(): Promise<void> {
		await this.db.execute(sql`select 1`);
	}

	async jobCounts(): Promise<JobCount[] | null> {
		try {
			const rows = await this.db.execute<{ queue: string; state: string; count: number }>(
				sql`select name as queue, state::text as state, count(*)::int as count
					from pgboss.job group by name, state order by name, state`,
			);
			return [...rows].map((row) => ({
				queue: row.queue,
				state: row.state,
				count: Number(row.count),
			}));
		} catch (error) {
			if (isUndefinedTable(error) || isUndefinedTable((error as { cause?: unknown }).cause)) {
				return null;
			}
			throw error;
		}
	}

	async checkpoints(limit = SYSTEM_CHECKPOINT_LIMIT): Promise<JobCheckpoint[]> {
		const rows = await this.db
			.select()
			.from(jobCheckpoints)
			.orderBy(desc(jobCheckpoints.updatedAt))
			.limit(limit);
		return rows.map((row) => ({
			queue: row.queue,
			jobId: row.jobId,
			updatedAt: row.updatedAt.toISOString(),
			state: row.state,
		}));
	}

	async chunkModels(ownerId: string): Promise<ChunkModelCount[]> {
		const rows = await this.db
			.select({ embeddingModel: ragChunks.embeddingModel, chunks: count() })
			.from(ragChunks)
			.where(eq(ragChunks.ownerId, ownerId))
			.groupBy(ragChunks.embeddingModel);
		return rows.map((row) => ({ embeddingModel: row.embeddingModel, chunks: Number(row.chunks) }));
	}
}
