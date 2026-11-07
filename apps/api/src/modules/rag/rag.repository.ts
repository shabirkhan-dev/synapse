import { and, cosineDistance, desc, eq, sql } from "drizzle-orm";

import type { Database } from "@/database/database";
import { ragChunks, ragDocuments, type RagDocumentRow } from "@/database/schema";

import type {
	NewRagChunk,
	NewRagDocument,
	RagDocument,
	RagMatch,
	RagRepository,
} from "./rag.types";

export class DrizzleRagRepository implements RagRepository {
	constructor(private readonly db: Database) {}

	async createDocument(document: NewRagDocument, chunks: NewRagChunk[]): Promise<RagDocument> {
		return this.db.transaction(async (tx) => {
			const [row] = await tx
				.insert(ragDocuments)
				.values({
					ownerId: document.ownerId,
					title: document.title,
					source: document.source ?? null,
					metadata: document.metadata ?? {},
					chunkCount: chunks.length,
				})
				.returning();
			if (!row) {
				throw new Error("Failed to insert rag document");
			}
			if (chunks.length > 0) {
				await tx.insert(ragChunks).values(
					chunks.map((chunk) => ({
						documentId: row.id,
						ownerId: document.ownerId,
						chunkIndex: chunk.chunkIndex,
						content: chunk.content,
						embedding: chunk.embedding,
					})),
				);
			}
			return toDocument(row);
		});
	}

	async listDocuments(ownerId: string, limit: number): Promise<RagDocument[]> {
		const rows = await this.db
			.select()
			.from(ragDocuments)
			.where(eq(ragDocuments.ownerId, ownerId))
			.orderBy(desc(ragDocuments.createdAt))
			.limit(limit);
		return rows.map(toDocument);
	}

	async deleteDocument(ownerId: string, documentId: string): Promise<boolean> {
		const rows = await this.db
			.delete(ragDocuments)
			.where(and(eq(ragDocuments.id, documentId), eq(ragDocuments.ownerId, ownerId)))
			.returning({ id: ragDocuments.id });
		return rows.length > 0;
	}

	async searchChunks(ownerId: string, embedding: number[], topK: number): Promise<RagMatch[]> {
		const distance = cosineDistance(ragChunks.embedding, embedding);
		const rows = await this.db
			.select({
				chunkId: ragChunks.id,
				documentId: ragChunks.documentId,
				documentTitle: ragDocuments.title,
				source: ragDocuments.source,
				chunkIndex: ragChunks.chunkIndex,
				content: ragChunks.content,
				score: sql<number>`1 - (${distance})`,
			})
			.from(ragChunks)
			.innerJoin(ragDocuments, eq(ragDocuments.id, ragChunks.documentId))
			.where(eq(ragChunks.ownerId, ownerId))
			// Order by the raw distance expression so Postgres can use the HNSW index.
			.orderBy(distance)
			.limit(topK);
		for (const row of rows) {
			// numeric expressions come back as strings from postgres-js
			row.score = Number(row.score);
		}
		return rows;
	}

	async ping(): Promise<void> {
		await this.db.execute(sql`select 1`);
	}
}

function toDocument(row: RagDocumentRow): RagDocument {
	return {
		id: row.id,
		title: row.title,
		source: row.source,
		metadata: row.metadata,
		chunkCount: row.chunkCount,
		createdAt: row.createdAt.toISOString(),
	};
}
