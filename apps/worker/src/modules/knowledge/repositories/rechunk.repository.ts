import { and, asc, eq, exists, gt, isNull, notLike, or } from "drizzle-orm";

import { type Database, ragChunks, ragDocuments } from "@synapse/database";
import type { PreparedChunks } from "@synapse/knowledge";

/** Chunkers whose chunks still contain the document's headings (everything before text-v2). */
const OLD_CHUNKER = or(
	isNull(ragChunks.chunkerVersion),
	notLike(ragChunks.chunkerVersion, "text-v2;%"),
);

export class DrizzleRechunkRepository {
	constructor(private readonly db: Database) {}

	/** Documents with a chunk from an old chunker, by id, after `afterDocumentId`; all owners' or one's. */
	async staleDocuments({
		afterDocumentId,
		limit,
		ownerId,
	}: {
		afterDocumentId: string | null;
		limit: number;
		ownerId?: string;
	}): Promise<Array<{ id: string; title: string }>> {
		return this.db
			.select({ id: ragDocuments.id, title: ragDocuments.title })
			.from(ragDocuments)
			.where(
				and(
					afterDocumentId ? gt(ragDocuments.id, afterDocumentId) : undefined,
					ownerId ? eq(ragDocuments.ownerId, ownerId) : undefined,
					exists(
						this.db
							.select({ id: ragChunks.id })
							.from(ragChunks)
							.where(and(eq(ragChunks.documentId, ragDocuments.id), OLD_CHUNKER)),
					),
				),
			)
			.orderBy(asc(ragDocuments.id))
			.limit(limit);
	}

	async chunksOf(
		documentId: string,
	): Promise<Array<{ content: string; chunkerVersion: string | null }>> {
		return this.db
			.select({ content: ragChunks.content, chunkerVersion: ragChunks.chunkerVersion })
			.from(ragChunks)
			.where(eq(ragChunks.documentId, documentId))
			.orderBy(asc(ragChunks.chunkIndex));
	}

	/** Old chunks out, new ones in, and the count updated: all or nothing. */
	async replaceChunks(documentId: string, prepared: PreparedChunks): Promise<void> {
		await this.db.transaction(async (tx) => {
			const [document] = await tx
				.select({ ownerId: ragDocuments.ownerId })
				.from(ragDocuments)
				.where(eq(ragDocuments.id, documentId))
				.for("update");
			// Deleted meanwhile: nothing to replace.
			if (!document) return;
			await tx.delete(ragChunks).where(eq(ragChunks.documentId, documentId));
			await tx.insert(ragChunks).values(
				prepared.chunks.map((chunk) => ({
					documentId,
					ownerId: document.ownerId,
					chunkIndex: chunk.chunkIndex,
					content: chunk.content,
					context: chunk.context,
					embedding: chunk.embedding,
					chunkerVersion: prepared.chunkerVersion,
					embeddingModel: prepared.embeddingModel,
				})),
			);
			await tx
				.update(ragDocuments)
				.set({ chunkCount: prepared.chunks.length })
				.where(eq(ragDocuments.id, documentId));
		});
	}
}
