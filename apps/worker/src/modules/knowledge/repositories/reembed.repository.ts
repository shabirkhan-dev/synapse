import { and, asc, eq, gt, isNull, ne, or } from "drizzle-orm";

import { type Database, ragChunks } from "@synapse/database";
import type { StaleChunk } from "@synapse/knowledge";

export class DrizzleReembedRepository {
	constructor(private readonly db: Database) {}

	/**
	 * Chunks not embedded with `embeddingModel` (legacy rows have none), after `afterChunkId`;
	 * every owner's, or only `ownerId`'s.
	 */
	async staleChunks({
		embeddingModel,
		afterChunkId,
		limit,
		ownerId,
	}: {
		embeddingModel: string;
		afterChunkId: string | null;
		limit: number;
		ownerId?: string;
	}): Promise<StaleChunk[]> {
		return this.db
			.select({ id: ragChunks.id, content: ragChunks.content })
			.from(ragChunks)
			.where(
				and(
					or(ne(ragChunks.embeddingModel, embeddingModel), isNull(ragChunks.embeddingModel)),
					afterChunkId ? gt(ragChunks.id, afterChunkId) : undefined,
					ownerId ? eq(ragChunks.ownerId, ownerId) : undefined,
				),
			)
			.orderBy(asc(ragChunks.id))
			.limit(limit);
	}

	/** Write a batch of vectors in one transaction (all or nothing). */
	async saveEmbeddings({
		embeddingModel,
		vectors,
	}: {
		embeddingModel: string;
		vectors: Array<{ id: string; embedding: number[] }>;
	}): Promise<void> {
		await this.db.transaction(async (tx) => {
			for (const { id, embedding } of vectors) {
				// One statement per row inside the transaction; batches are small (WORKER_REEMBED_BATCH_SIZE).
				// oxlint-disable-next-line no-await-in-loop
				await tx.update(ragChunks).set({ embedding, embeddingModel }).where(eq(ragChunks.id, id));
			}
		});
	}
}
